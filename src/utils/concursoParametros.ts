import {
  FAIXAS_LOTOFACIL,
  ADERENCIA_CONFIG,
  CONJUNTOS_LOTOFACIL,
  STATUS_PARAMETRO_LABELS,
  obterFaixasEscaladas,
  StatusParametro,
  StatusParametroLabel,
  MetricaResultado,
  ResumoAderencia,
  ParametrosConcurso,
} from './lotofacilStatsConfig';

export {
  FAIXAS_LOTOFACIL,
  ADERENCIA_CONFIG,
  CONJUNTOS_LOTOFACIL,
  STATUS_PARAMETRO_LABELS,
};
export type {
  StatusParametro,
  StatusParametroLabel,
  MetricaResultado,
  ResumoAderencia,
  ParametrosConcurso,
};

export type ParametroStatus = StatusParametro;
export type ParametroStatusLabel = StatusParametroLabel;

export interface QuadrantesDistribuicao {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  centro13: boolean;
}

export interface ParametroMetricaAvaliada<T = number> {
  valor: T;
  valorFormatado: string;
  status: ParametroStatus;
  statusLabel: ParametroStatusLabel;
  faixaIdealTexto: string;
}

export interface ConcursoMetricasAvaliadas {
  paresImpares: ParametroMetricaAvaliada<number>;
  repetidasAnterior: ParametroMetricaAvaliada<number | null>;
  somaTotal: ParametroMetricaAvaliada<number>;
  primos: ParametroMetricaAvaliada<number>;
  molduraMiolo: ParametroMetricaAvaliada<number>;
  fibonacci: ParametroMetricaAvaliada<number>;
  sequencia: ParametroMetricaAvaliada<number>;
  cruz: ParametroMetricaAvaliada<number>;
  quadrantes: ParametroMetricaAvaliada<QuadrantesDistribuicao>;
}

export interface ConcursoParametrosEstatisticos {
  pares: number;
  impares: number;
  repetidasAnterior: number | null;
  somaTotal: number;
  primos: number;
  moldura: number;
  miolo: number;
  fibonacci: number;
  maiorSequencia: number;
  blocosConsecutivos: number[][];
  cruz: number;
  quadrantes: QuadrantesDistribuicao;
  metricas: ConcursoMetricasAvaliadas;
  metricasLista: MetricaResultado[];
  resumo: ResumoAderencia;
  resumoStatus: {
    ideal: number;
    alerta: number;
    critico: number;
    neutro: number;
  };
}

// Re-exportações compatíveis com módulos existentes
export const FAIXAS_STATUS_LOTOFACIL = {
  pares: {
    idealMin: FAIXAS_LOTOFACIL.pares.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.pares.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.pares.texto,
  },
  repetidas: {
    idealMin: FAIXAS_LOTOFACIL.repetidas.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.repetidas.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.repetidas.texto,
  },
  somaTotal: {
    idealMin: FAIXAS_LOTOFACIL.soma.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.soma.ideal[1],
    alertaMin: FAIXAS_LOTOFACIL.soma.alerta[0],
    alertaMax: FAIXAS_LOTOFACIL.soma.alerta[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.soma.texto,
  },
  primos: {
    idealMin: FAIXAS_LOTOFACIL.primos.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.primos.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.primos.texto,
  },
  moldura: {
    idealMin: FAIXAS_LOTOFACIL.moldura.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.moldura.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.moldura.texto,
  },
  fibonacci: {
    idealMin: FAIXAS_LOTOFACIL.fibonacci.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.fibonacci.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.fibonacci.texto,
  },
  maiorSequencia: {
    idealMin: FAIXAS_LOTOFACIL.sequencia.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.sequencia.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.sequencia.texto,
  },
  cruz: {
    idealMin: FAIXAS_LOTOFACIL.cruz.ideal[0],
    idealMax: FAIXAS_LOTOFACIL.cruz.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.cruz.texto,
  },
  quadrantes: {
    idealMinPorQ: FAIXAS_LOTOFACIL.quadrantePorBloco.ideal[0],
    idealMaxPorQ: FAIXAS_LOTOFACIL.quadrantePorBloco.ideal[1],
    faixaIdealTexto: FAIXAS_LOTOFACIL.quadrantePorBloco.texto,
  },
} as const;

export const PRIMOS_CONJUNTO = CONJUNTOS_LOTOFACIL.primos;
export const MOLDURA_CONJUNTO = CONJUNTOS_LOTOFACIL.moldura;
export const MIOLO_CONJUNTO = CONJUNTOS_LOTOFACIL.miolo;
export const FIBONACCI_CONJUNTO = CONJUNTOS_LOTOFACIL.fibonacci;
export const CRUZ_CENTRAL_CONJUNTO = CONJUNTOS_LOTOFACIL.cruz;
export const QUADRANTES_VOLANTE = CONJUNTOS_LOTOFACIL.quadrantes;

const PRIMOS_SET = new Set<number>(CONJUNTOS_LOTOFACIL.primos);
const MOLDURA_SET = new Set<number>(CONJUNTOS_LOTOFACIL.moldura);
const FIBONACCI_SET = new Set<number>(CONJUNTOS_LOTOFACIL.fibonacci);
const CRUZ_SET = new Set<number>(CONJUNTOS_LOTOFACIL.cruz);
const Q1_SET = new Set<number>(CONJUNTOS_LOTOFACIL.quadrantes.Q1);
const Q2_SET = new Set<number>(CONJUNTOS_LOTOFACIL.quadrantes.Q2);
const Q3_SET = new Set<number>(CONJUNTOS_LOTOFACIL.quadrantes.Q3);
const Q4_SET = new Set<number>(CONJUNTOS_LOTOFACIL.quadrantes.Q4);

export function avaliarFaixa(
  valor: number,
  ideal: readonly [number, number],
  alerta: readonly [number, number]
): StatusParametro {
  if (valor >= ideal[0] && valor <= ideal[1]) return 'ideal';
  if (valor >= alerta[0] && valor <= alerta[1]) return 'alerta';
  return 'critico';
}

export function avaliarStatusSomaTotal(somaTotal: number): StatusParametro {
  return avaliarFaixa(somaTotal, FAIXAS_LOTOFACIL.soma.ideal, FAIXAS_LOTOFACIL.soma.alerta);
}

function avaliarStatusQuadrantes(
  qVals: readonly number[],
  faixaQuadrante: { ideal: readonly [number, number]; alerta: readonly [number, number] } = FAIXAS_LOTOFACIL.quadrantePorBloco
): StatusParametro {
  const { ideal, alerta } = faixaQuadrante;
  if (qVals.some((v) => v < alerta[0] || v > alerta[1])) {
    return 'critico';
  }
  if (qVals.every((v) => v >= ideal[0] && v <= ideal[1])) {
    return 'ideal';
  }
  return 'alerta';
}

function criarMetricaAvaliada<T>(
  valor: T,
  valorFormatado: string,
  status: StatusParametro,
  faixaIdealTexto: string
): ParametroMetricaAvaliada<T> {
  return {
    valor,
    valorFormatado,
    status,
    statusLabel: STATUS_PARAMETRO_LABELS[status],
    faixaIdealTexto,
  };
}

/**
 * Função utilitária pura que calcula todos os parâmetros estatísticos completos
 * de um concurso da Lotofácil, avalia cada métrica contra `FAIXAS_LOTOFACIL`
 * e gera o Score Geral de Aderência (0–100%) com classificação consolidada.
 */
export function calcularParametrosConcurso(
  dezenasAtuais: readonly number[],
  dezenasAnteriores?: readonly number[] | null
): ConcursoParametrosEstatisticos {
  const unicasOrdenadas = Array.from(
    new Set(
      (dezenasAtuais || [])
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25)
    )
  ).sort((a, b) => a - b);

  let pares = 0;
  let impares = 0;
  let somaTotal = 0;
  let primos = 0;
  let moldura = 0;
  let miolo = 0;
  let fibonacci = 0;
  let cruz = 0;
  let q1 = 0;
  let q2 = 0;
  let q3 = 0;
  let q4 = 0;
  let centro13 = false;

  for (const num of unicasOrdenadas) {
    if (num % 2 === 0) pares++;
    else impares++;

    somaTotal += num;
    if (PRIMOS_SET.has(num)) primos++;
    if (MOLDURA_SET.has(num)) moldura++;
    else miolo++;
    if (FIBONACCI_SET.has(num)) fibonacci++;
    if (CRUZ_SET.has(num)) cruz++;

    if (Q1_SET.has(num)) q1++;
    else if (Q2_SET.has(num)) q2++;
    else if (Q3_SET.has(num)) q3++;
    else if (Q4_SET.has(num)) q4++;
    else if (num === 13) centro13 = true;
  }

  // Repetidas do concurso anterior (proteção segura com status 'neutro')
  const temAnterior = Array.isArray(dezenasAnteriores) && dezenasAnteriores.length > 0;
  let repetidasAnterior: number | null = null;
  if (temAnterior) {
    const prevSet = new Set<number>(
      dezenasAnteriores
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25)
    );
    if (prevSet.size > 0) {
      let rep = 0;
      for (const num of unicasOrdenadas) {
        if (prevSet.has(num)) rep++;
      }
      repetidasAnterior = rep;
    }
  }

  // Blocos consecutivos e maior sequência
  const blocosConsecutivos: number[][] = [];
  let maiorSequencia = unicasOrdenadas.length > 0 ? 1 : 0;

  if (unicasOrdenadas.length > 0) {
    let blocoAtual: number[] = [unicasOrdenadas[0]];
    for (let i = 1; i < unicasOrdenadas.length; i++) {
      if (unicasOrdenadas[i] === unicasOrdenadas[i - 1] + 1) {
        blocoAtual.push(unicasOrdenadas[i]);
      } else {
        if (blocoAtual.length >= 2) blocosConsecutivos.push(blocoAtual);
        if (blocoAtual.length > maiorSequencia) maiorSequencia = blocoAtual.length;
        blocoAtual = [unicasOrdenadas[i]];
      }
    }
    if (blocoAtual.length >= 2) blocosConsecutivos.push(blocoAtual);
    if (blocoAtual.length > maiorSequencia) maiorSequencia = blocoAtual.length;
  }

  const quadrantes: QuadrantesDistribuicao = { q1, q2, q3, q4, centro13 };
  const qVals = [q1, q2, q3, q4];

  const qtdDezenasRef = unicasOrdenadas.length >= 15 ? unicasOrdenadas.length : 15;
  const isJogoExpandido = qtdDezenasRef > 15;
  const faixas = obterFaixasEscaladas(qtdDezenasRef);

  const fmtRange = (r: readonly [number, number], sufixo: string) =>
    r[0] === r[1] ? `${r[0]} ${sufixo}`.trim() : `${r[0]} a ${r[1]} ${sufixo}`.trim();

  const textoPares = isJogoExpandido ? fmtRange(faixas.pares.ideal, 'pares') : FAIXAS_LOTOFACIL.pares.texto;
  const textoRepetidas = isJogoExpandido
    ? fmtRange(faixas.repetidas.ideal, 'repetidas')
    : FAIXAS_LOTOFACIL.repetidas.texto;
  const textoSoma = isJogoExpandido ? `${faixas.soma.ideal[0]} a ${faixas.soma.ideal[1]}` : FAIXAS_LOTOFACIL.soma.texto;
  const textoPrimos = isJogoExpandido ? fmtRange(faixas.primos.ideal, 'primos') : FAIXAS_LOTOFACIL.primos.texto;
  const textoMoldura = isJogoExpandido
    ? `${faixas.moldura.ideal[0]} a ${faixas.moldura.ideal[1]} na moldura`
    : FAIXAS_LOTOFACIL.moldura.texto;
  const textoFibonacci = isJogoExpandido
    ? fmtRange(faixas.fibonacci.ideal, 'Fibonacci')
    : FAIXAS_LOTOFACIL.fibonacci.texto;
  const textoSequencia = isJogoExpandido
    ? `Maior seq: ${faixas.sequencia.ideal[0]} a ${faixas.sequencia.ideal[1]}`
    : FAIXAS_LOTOFACIL.sequencia.texto;
  const textoCruz = isJogoExpandido
    ? `${faixas.cruz.ideal[0]} a ${faixas.cruz.ideal[1]} na cruz`
    : FAIXAS_LOTOFACIL.cruz.texto;
  const textoQuadrantes = isJogoExpandido
    ? `${faixas.quadrantePorBloco.ideal[0]} a ${faixas.quadrantePorBloco.ideal[1]} por quadrante`
    : FAIXAS_LOTOFACIL.quadrantePorBloco.texto;

  const statusPares = avaliarFaixa(pares, faixas.pares.ideal, faixas.pares.alerta);
  const statusRepetidas: StatusParametro =
    repetidasAnterior !== null
      ? avaliarFaixa(repetidasAnterior, faixas.repetidas.ideal, faixas.repetidas.alerta)
      : 'neutro';
  const statusSoma = avaliarFaixa(somaTotal, faixas.soma.ideal, faixas.soma.alerta);
  const statusPrimos = avaliarFaixa(primos, faixas.primos.ideal, faixas.primos.alerta);
  const statusMoldura = avaliarFaixa(moldura, faixas.moldura.ideal, faixas.moldura.alerta);
  const statusFibonacci = avaliarFaixa(fibonacci, faixas.fibonacci.ideal, faixas.fibonacci.alerta);
  const statusSequencia = avaliarFaixa(maiorSequencia, faixas.sequencia.ideal, faixas.sequencia.alerta);
  const statusCruz = avaliarFaixa(cruz, faixas.cruz.ideal, faixas.cruz.alerta);
  const statusQuadrantes = avaliarStatusQuadrantes(qVals, faixas.quadrantePorBloco);

  const blocosTexto =
    blocosConsecutivos.length > 0
      ? blocosConsecutivos
          .slice(0, 3)
          .map((b) => `${String(b[0]).padStart(2, '0')}–${String(b[b.length - 1]).padStart(2, '0')}`)
          .join(', ')
      : 'Sem seq.';

  const escalaNota = isJogoExpandido ? ` (escala ${qtdDezenasRef} dez.)` : '';

  const metricasLista: MetricaResultado[] = [
    {
      id: 'pares_impares',
      label: 'Pares / Ímpares',
      valorExibicao: `${pares}P / ${impares}I`,
      valorNumerico: pares,
      status: statusPares,
      statusLabel: STATUS_PARAMETRO_LABELS[statusPares],
      faixaIdealTexto: textoPares,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.pares.ideal[0]}–${faixas.pares.ideal[1]} · Alerta: ${faixas.pares.alerta[0]}–${faixas.pares.alerta[1]}${escalaNota}`
        : FAIXAS_LOTOFACIL.pares.detalheTooltip,
    },
    {
      id: 'repetidas',
      label: 'Repetidas',
      valorExibicao: repetidasAnterior !== null ? `${repetidasAnterior} dez.` : 'N/A',
      valorNumerico: repetidasAnterior ?? -1,
      status: statusRepetidas,
      statusLabel: STATUS_PARAMETRO_LABELS[statusRepetidas],
      faixaIdealTexto: textoRepetidas,
      tooltipTexto:
        repetidasAnterior !== null
          ? isJogoExpandido
            ? `Ideal: ${faixas.repetidas.ideal[0]}–${faixas.repetidas.ideal[1]} · Alerta: ${faixas.repetidas.alerta[0]}–${faixas.repetidas.alerta[1]}${escalaNota}`
            : FAIXAS_LOTOFACIL.repetidas.detalheTooltip
          : 'Concurso anterior indisponível no histórico local (Neutro)',
    },
    {
      id: 'soma',
      label: 'Soma Total',
      valorExibicao: `${somaTotal}`,
      valorNumerico: somaTotal,
      status: statusSoma,
      statusLabel: STATUS_PARAMETRO_LABELS[statusSoma],
      faixaIdealTexto: textoSoma,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.soma.ideal[0]}–${faixas.soma.ideal[1]} · Alerta: ${faixas.soma.alerta[0]}–${faixas.soma.alerta[1]}${escalaNota}`
        : FAIXAS_LOTOFACIL.soma.detalheTooltip,
    },
    {
      id: 'primos',
      label: 'Primos',
      valorExibicao: `${primos} dez.`,
      valorNumerico: primos,
      status: statusPrimos,
      statusLabel: STATUS_PARAMETRO_LABELS[statusPrimos],
      faixaIdealTexto: textoPrimos,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.primos.ideal[0]}–${faixas.primos.ideal[1]} · Alerta: ${faixas.primos.alerta[0]}–${faixas.primos.alerta[1]}${escalaNota}`
        : FAIXAS_LOTOFACIL.primos.detalheTooltip,
    },
    {
      id: 'moldura',
      label: 'Moldura / Miolo',
      valorExibicao: `${moldura}M / ${miolo}C`,
      valorNumerico: moldura,
      status: statusMoldura,
      statusLabel: STATUS_PARAMETRO_LABELS[statusMoldura],
      faixaIdealTexto: textoMoldura,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.moldura.ideal[0]}–${faixas.moldura.ideal[1]} · Alerta: ${faixas.moldura.alerta[0]}–${faixas.moldura.alerta[1]}${escalaNota}`
        : FAIXAS_LOTOFACIL.moldura.detalheTooltip,
    },
    {
      id: 'fibonacci',
      label: 'Fibonacci',
      valorExibicao: `${fibonacci} dez.`,
      valorNumerico: fibonacci,
      status: statusFibonacci,
      statusLabel: STATUS_PARAMETRO_LABELS[statusFibonacci],
      faixaIdealTexto: textoFibonacci,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.fibonacci.ideal[0]}–${faixas.fibonacci.ideal[1]} · Alerta: ${faixas.fibonacci.alerta[0]}–${faixas.fibonacci.alerta[1]}${escalaNota}`
        : FAIXAS_LOTOFACIL.fibonacci.detalheTooltip,
    },
    {
      id: 'sequencia',
      label: 'Maior Sequência',
      valorExibicao: `Máx ${maiorSequencia}`,
      valorNumerico: maiorSequencia,
      status: statusSequencia,
      statusLabel: STATUS_PARAMETRO_LABELS[statusSequencia],
      faixaIdealTexto: textoSequencia,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.sequencia.ideal[0]}–${faixas.sequencia.ideal[1]} consecutivas${escalaNota} · Blocos: ${blocosTexto}`
        : `${FAIXAS_LOTOFACIL.sequencia.detalheTooltip} · Blocos: ${blocosTexto}`,
    },
    {
      id: 'cruz',
      label: 'Cruz Central',
      valorExibicao: `${cruz} dez.`,
      valorNumerico: cruz,
      status: statusCruz,
      statusLabel: STATUS_PARAMETRO_LABELS[statusCruz],
      faixaIdealTexto: textoCruz,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.cruz.ideal[0]}–${faixas.cruz.ideal[1]} · Alerta: ${faixas.cruz.alerta[0]}–${faixas.cruz.alerta[1]}${escalaNota}`
        : FAIXAS_LOTOFACIL.cruz.detalheTooltip,
    },
    {
      id: 'quadrantes',
      label: 'Quadrantes',
      valorExibicao: `${q1}-${q2}-${q3}-${q4}${centro13 ? ' (+13)' : ''}`,
      valorNumerico: qVals,
      status: statusQuadrantes,
      statusLabel: STATUS_PARAMETRO_LABELS[statusQuadrantes],
      faixaIdealTexto: textoQuadrantes,
      tooltipTexto: isJogoExpandido
        ? `Ideal: ${faixas.quadrantePorBloco.ideal[0]}–${faixas.quadrantePorBloco.ideal[1]} por quadrante${escalaNota}`
        : FAIXAS_LOTOFACIL.quadrantePorBloco.detalheTooltip,
    },
  ];

  // Cálculo do Score Geral de Aderência (Ideal = 1.0, Alerta = 0.5, Crítico = 0)
  const avaliados = metricasLista.filter((m) => m.status !== 'neutro');
  const ideais = avaliados.filter((m) => m.status === 'ideal').length;
  const alertas = avaliados.filter((m) => m.status === 'alerta').length;
  const criticos = avaliados.filter((m) => m.status === 'critico').length;
  const neutros = metricasLista.length - avaliados.length;

  const pontos =
    ideais * ADERENCIA_CONFIG.pesoIdeal +
    alertas * ADERENCIA_CONFIG.pesoAlerta +
    criticos * ADERENCIA_CONFIG.pesoCritico;
  const scorePercentual = avaliados.length > 0 ? Math.round((pontos / avaliados.length) * 100) : 0;

  const foraDoPadrao =
    criticos >= ADERENCIA_CONFIG.criticosForaDoPadraoMin ||
    scorePercentual < ADERENCIA_CONFIG.scoreForaDoPadraoMaxExclusivo;

  let classificacao: ResumoAderencia['classificacao'] = 'Dentro da Média';
  if (scorePercentual >= ADERENCIA_CONFIG.scorePadraoOuroMin && criticos === 0) {
    classificacao = 'Padrão Ouro';
  } else if (foraDoPadrao) {
    classificacao = 'Fora do Padrão';
  } else if (criticos >= 1 || scorePercentual < ADERENCIA_CONFIG.scoreAtipicoMaxExclusivo) {
    classificacao = 'Atípico';
  }

  const resumo: ResumoAderencia = {
    scorePercentual,
    ideais,
    alertas,
    criticos,
    neutros,
    totalAvaliados: avaliados.length,
    classificacao,
    foraDoPadrao,
  };

  const metricas: ConcursoMetricasAvaliadas = {
    paresImpares: criarMetricaAvaliada(pares, `${pares}P / ${impares}I`, statusPares, textoPares),
    repetidasAnterior: criarMetricaAvaliada(
      repetidasAnterior,
      repetidasAnterior !== null ? `${repetidasAnterior} dez.` : 'N/A',
      statusRepetidas,
      textoRepetidas
    ),
    somaTotal: criarMetricaAvaliada(somaTotal, `${somaTotal}`, statusSoma, textoSoma),
    primos: criarMetricaAvaliada(primos, `${primos} dez.`, statusPrimos, textoPrimos),
    molduraMiolo: criarMetricaAvaliada(moldura, `${moldura}M / ${miolo}C`, statusMoldura, textoMoldura),
    fibonacci: criarMetricaAvaliada(fibonacci, `${fibonacci} dez.`, statusFibonacci, textoFibonacci),
    sequencia: criarMetricaAvaliada(
      maiorSequencia,
      `Máx ${maiorSequencia} (${blocosTexto})`,
      statusSequencia,
      textoSequencia
    ),
    cruz: criarMetricaAvaliada(cruz, `${cruz} dez.`, statusCruz, textoCruz),
    quadrantes: criarMetricaAvaliada(
      quadrantes,
      `${q1}-${q2}-${q3}-${q4}${centro13 ? ' (+13)' : ''}`,
      statusQuadrantes,
      textoQuadrantes
    ),
  };

  return {
    pares,
    impares,
    repetidasAnterior,
    somaTotal,
    primos,
    moldura,
    miolo,
    fibonacci,
    maiorSequencia,
    blocosConsecutivos,
    cruz,
    quadrantes,
    metricas,
    metricasLista,
    resumo,
    resumoStatus: {
      ideal: ideais,
      alerta: alertas,
      critico: criticos,
      neutro: neutros,
    },
  };
}

/**
 * Helper no formato compacto `{ metricas, resumo }` para consumo direto de aderência.
 */
export function calcularAderenciaConcurso(
  dezenasAtuais: readonly number[],
  dezenasAnteriores?: readonly number[] | null
): ParametrosConcurso {
  const full = calcularParametrosConcurso(dezenasAtuais, dezenasAnteriores);
  return {
    metricas: full.metricasLista,
    resumo: full.resumo,
  };
}

/**
 * Mescla múltiplos concursos/listas removendo duplicatas por número de concurso
 * e retornando sempre em ordem estritamente decrescente (mais recente -> mais antigo).
 */
export function mesclarEOrdenarHistorico<T extends { concurso: number; dezenas?: number[] }>(
  ...fontes: ReadonlyArray<ReadonlyArray<T> | T | null | undefined>
): T[] {
  const map = new Map<number, T>();
  for (const fonte of fontes) {
    if (!fonte) continue;
    const itens = Array.isArray(fonte) ? fonte : [fonte];
    for (const item of itens) {
      if (!item || !Number.isFinite(item.concurso)) continue;
      if (!map.has(item.concurso)) {
        map.set(item.concurso, item);
      } else {
        const existente = map.get(item.concurso)!;
        const existenteOk = Array.isArray(existente.dezenas) && existente.dezenas.length === 15;
        const novoOk = Array.isArray(item.dezenas) && item.dezenas.length === 15;
        if (!existenteOk && novoOk) {
          map.set(item.concurso, item);
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.concurso - a.concurso);
}

/**
 * Localiza o concurso imediatamente anterior (N - 1) no histórico.
 * 1) Tenta encontrar correspondência exata `concurso === atual - 1`.
 * 2) Caso haja lacuna temporária no histórico, localiza o item imediatamente anterior
 *    na lista ordenada por número de concurso (`concurso < atual`, maior disponível).
 * 3) Se o concurso atual for o mais antigo da base carregada, retorna `null` com segurança.
 */
export function obterConcursoAnterior<T extends { concurso: number; dezenas: number[] }>(
  concursoAtual: { concurso: number } | { numero: number } | number | null | undefined,
  historicoConcursos: ReadonlyArray<T> | null | undefined
): T | null {
  if (concursoAtual == null || !Array.isArray(historicoConcursos) || historicoConcursos.length === 0) {
    return null;
  }

  const numeroAtual =
    typeof concursoAtual === 'number'
      ? concursoAtual
      : 'concurso' in concursoAtual
      ? Number(concursoAtual.concurso)
      : Number(concursoAtual.numero);

  if (!Number.isFinite(numeroAtual)) return null;

  const validosOrdenados = historicoConcursos
    .filter((d) => d && Number.isFinite(d.concurso) && Array.isArray(d.dezenas) && d.dezenas.length > 0)
    .sort((a, b) => b.concurso - a.concurso);

  if (validosOrdenados.length === 0) return null;

  const exactPrev = validosOrdenados.find((d) => d.concurso === numeroAtual - 1);
  if (exactPrev) {
    return exactPrev;
  }

  // Fallback seguro: item imediatamente anterior na lista ordenada decrescente
  const immediatePrev = validosOrdenados.find((d) => d.concurso < numeroAtual);
  return immediatePrev ?? null;
}

/**
 * Localiza com segurança as dezenas do concurso imediatamente anterior (concurso - 1
 * ou item imediatamente anterior no histórico ordenado).
 */
export function resolvePreviousDrawDezenas(
  concursoAtual: number,
  drawsHistory: ReadonlyArray<{ concurso: number; dezenas: number[] }>
): number[] | null {
  const prev = obterConcursoAnterior(concursoAtual, drawsHistory);
  return prev ? prev.dezenas : null;
}
