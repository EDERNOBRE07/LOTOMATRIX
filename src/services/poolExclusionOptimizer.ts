export interface ConcursoHistoricoSimples {
  concurso: number;
  dezenas: number[];
}

export interface DiagnosticoExclusaoDezena {
  dezena: number;
  scoreExclusao: number; // Quanto maior, mais recomendada para EXCLUSÃO
  protegidaPorCiclo: boolean;
  saiuNoUltimo: boolean;
  sequenciaAtual: number; // Quantos concursos seguidos está saindo
  atrasoAtual: number;    // Quantos concursos seguidos está ausente
  motivos: string[];
}

export interface ResultadoOtimizacaoPool {
  poolOtimizado: number[];
  dezenasExcluidas: number[];
  diagnosticoCompleto: DiagnosticoExclusaoDezena[];
  metricasPool: {
    tamanho: number;
    pares: number;
    impares: number;
    moldura: number;
    miolo: number;
    doUltimoConcurso: number;
    ausentesDoUltimo: number;
    faltantesCicloIncluidas: number;
  };
}

export interface ConfigExclusaoPool {
  tamanhoPoolDesejado: 17 | 18 | 19 | 20;
  historicoRecente: ConcursoHistoricoSimples[]; // Ordenado do mais recente [0] para o mais antigo
  dezenasFaltantesCiclo?: number[];             // Dezenas que ainda não saíram no ciclo atual
  dezenasFixasUsuario?: number[];               // Nunca excluir
  dezenasExcluidasUsuario?: number[];           // Excluir obrigatoriamente
}

const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);

// Metas estruturais ideais para o POOL resultante (garantindo que o fechamento nasça equilibrado)
const METAS_POOL: Record<number, {
  paresMin: number; paresMax: number;
  molduraMin: number; molduraMax: number;
  repetidasMin: number; repetidasMax: number;
}> = {
  17: { paresMin: 7, paresMax: 9, molduraMin: 10, molduraMax: 12, repetidasMin: 10, repetidasMax: 12 },
  18: { paresMin: 8, paresMax: 10, molduraMin: 11, molduraMax: 13, repetidasMin: 11, repetidasMax: 12 },
  19: { paresMin: 8, paresMax: 10, molduraMin: 11, molduraMax: 13, repetidasMin: 11, repetidasMax: 13 },
  20: { paresMin: 9, paresMax: 11, molduraMin: 12, molduraMax: 14, repetidasMin: 12, repetidasMax: 14 },
};

export function otimizarPoolPorExclusao(config: ConfigExclusaoPool): ResultadoOtimizacaoPool {
  const {
    tamanhoPoolDesejado,
    historicoRecente,
    dezenasFaltantesCiclo = [],
    dezenasFixasUsuario = [],
    dezenasExcluidasUsuario = [],
  } = config;

  const qtdExcluir = 25 - tamanhoPoolDesejado;
  const ultimoConcurso = new Set(historicoRecente[0]?.dezenas ?? []);
  const setCiclo = new Set(dezenasFaltantesCiclo);
  const setFixas = new Set(dezenasFixasUsuario);
  const setExcluidasUser = new Set(dezenasExcluidasUsuario);

  const janela10 = historicoRecente.slice(0, 10);
  const diagnostico: DiagnosticoExclusaoDezena[] = [];

  for (let d = 1; d <= 25; d++) {
    let score = 50; // Base neutra
    const motivos: string[] = [];

    const saiuNoUltimo = ultimoConcurso.has(d);
    const protegidaPorCiclo = setCiclo.has(d);

    // 1. Sequência atual (streak de aparições seguidas) e atraso atual
    let sequenciaAtual = 0;
    let atrasoAtual = 0;

    if (saiuNoUltimo) {
      for (const c of historicoRecente) {
        if (c.dezenas.includes(d)) sequenciaAtual++;
        else break;
      }
    } else {
      for (const c of historicoRecente) {
        if (!c.dezenas.includes(d)) atrasoAtual++;
        else break;
      }
    }

    // 2. Frequência nos últimos 10 concursos
    const freq10 = janela10.filter((c) => c.dezenas.includes(d)).length;

    // --- REGRAS DE PONTUAÇÃO DE EXCLUSÃO ---
    // A) Proteção de Ciclo (prioridade máxima para FICAR no pool)
    if (protegidaPorCiclo) {
      score -= 40;
      motivos.push('Falta para fechar ciclo (protegida)');
    }

    // B) Saturação de sequência (dezenas saindo há 4+ concursos tendem a falhar)
    if (sequenciaAtual >= 5) {
      score += 28;
      motivos.push(`Saturada: ${sequenciaAtual} concursos seguidos`);
    } else if (sequenciaAtual === 4) {
      score += 18;
      motivos.push('4 concursos seguidos (risco de falha)');
    } else if (sequenciaAtual === 3) {
      score += 8;
      motivos.push('3 concursos seguidos');
    }

    // C) Dezena "fria" com atraso curto/médio sem pressão de ciclo
    if (!saiuNoUltimo && atrasoAtual === 1 && freq10 <= 4) {
      score += 12;
      motivos.push(`Baixa frequência recente (${freq10}/10)`);
    } else if (!saiuNoUltimo && atrasoAtual >= 3 && !protegidaPorCiclo) {
      score -= 10;
      motivos.push(`Atraso de ${atrasoAtual} concursos (tendência de retorno)`);
    }

    // D) Superaquecimento nos últimos 10 concursos
    if (freq10 >= 9) {
      score += 14;
      motivos.push(`Superaquecida (${freq10}/10)`);
    } else if (freq10 <= 3 && !protegidaPorCiclo) {
      score += 10;
      motivos.push(`Fria nos últimos 10 (${freq10}/10)`);
    }

    // Travas manuais do usuário
    if (setFixas.has(d)) {
      score = -999;
      motivos.unshift('Fixada manualmente pelo usuário');
    } else if (setExcluidasUser.has(d)) {
      score = 999;
      motivos.unshift('Excluída manualmente pelo usuário');
    }

    diagnostico.push({
      dezena: d,
      scoreExclusao: score,
      protegidaPorCiclo,
      saiuNoUltimo,
      sequenciaAtual,
      atrasoAtual,
      motivos,
    });
  }

  // Ordena da mais provável para EXCLUSÃO para a menos provável
  const ordenadasParaExclusao = [...diagnostico].sort((a, b) => b.scoreExclusao - a.scoreExclusao);

  const excluidas = new Set<number>(dezenasExcluidasUsuario);
  const meta = METAS_POOL[tamanhoPoolDesejado];

  // Passo 1: Seleção com checagem de equilíbrio estrutural do pool restante
  for (const item of ordenadasParaExclusao) {
    if (excluidas.size >= qtdExcluir) break;
    if (excluidas.has(item.dezena) || setFixas.has(item.dezena)) continue;

    // Simula o pool se excluirmos esta dezena
    const poolSimulado = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (n) => !excluidas.has(n) && n !== item.dezena
    );

    const paresRestantes = poolSimulado.filter((n) => n % 2 === 0).length;
    const molduraRestante = poolSimulado.filter((n) => MOLDURA.has(n)).length;
    const repetidasRestantes = poolSimulado.filter((n) => ultimoConcurso.has(n)).length;

    // Só exclui se não violar o piso mínimo estrutural do pool
    const violaPares = paresRestantes < meta.paresMin;
    const violaMoldura = molduraRestante < meta.molduraMin;
    const violaRepetidas = repetidasRestantes < meta.repetidasMin;

    if (!violaPares && !violaMoldura && !violaRepetidas) {
      excluidas.add(item.dezena);
    }
  }

  // Passo 2 (Fallback): Se ainda faltarem exclusões para fechar o tamanho exato, completa pelo score
  if (excluidas.size < qtdExcluir) {
    for (const item of ordenadasParaExclusao) {
      if (excluidas.size >= qtdExcluir) break;
      if (!excluidas.has(item.dezena) && !setFixas.has(item.dezena)) {
        excluidas.add(item.dezena);
      }
    }
  }

  const dezenasExcluidas = Array.from(excluidas).sort((a, b) => a - b);
  const poolOtimizado = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !excluidas.has(n));

  const pares = poolOtimizado.filter((n) => n % 2 === 0).length;
  const moldura = poolOtimizado.filter((n) => MOLDURA.has(n)).length;
  const doUltimoConcurso = poolOtimizado.filter((n) => ultimoConcurso.has(n)).length;

  return {
    poolOtimizado,
    dezenasExcluidas,
    diagnosticoCompleto: ordenadasParaExclusao,
    metricasPool: {
      tamanho: poolOtimizado.length,
      pares,
      impares: poolOtimizado.length - pares,
      moldura,
      miolo: poolOtimizado.length - moldura,
      doUltimoConcurso,
      ausentesDoUltimo: poolOtimizado.length - doUltimoConcurso,
      faltantesCicloIncluidas: poolOtimizado.filter((n) => setCiclo.has(n)).length,
    },
  };
}
