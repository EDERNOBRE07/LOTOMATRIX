import {
  FAIXAS_LOTOFACIL,
  ADERENCIA_CONFIG,
  CONJUNTOS_LOTOFACIL,
  STATUS_PARAMETRO_LABELS,
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

function avaliarStatusQuadrantes(qVals: readonly number[]): StatusParametro {
  const { ideal, alerta } = FAIXAS_LOTOFACIL.quadrantePorBloco;
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

  const statusPares = avaliarFaixa(pares, FAIXAS_LOTOFACIL.pares.ideal, FAIXAS_LOTOFACIL.pares.alerta);
  const statusRepetidas: StatusParametro =
    repetidasAnterior !== null
      ? avaliarFaixa(
          repetidasAnterior,
          FAIXAS_LOTOFACIL.repetidas.ideal,
          FAIXAS_LOTOFACIL.repetidas.alerta
        )
      : 'neutro';
  const statusSoma = avaliarFaixa(somaTotal, FAIXAS_LOTOFACIL.soma.ideal, FAIXAS_LOTOFACIL.soma.alerta);
  const statusPrimos = avaliarFaixa(
    primos,
    FAIXAS_LOTOFACIL.primos.ideal,
    FAIXAS_LOTOFACIL.primos.alerta
  );
  const statusMoldura = avaliarFaixa(
    moldura,
    FAIXAS_LOTOFACIL.moldura.ideal,
    FAIXAS_LOTOFACIL.moldura.alerta
  );
  const statusFibonacci = avaliarFaixa(
    fibonacci,
    FAIXAS_LOTOFACIL.fibonacci.ideal,
    FAIXAS_LOTOFACIL.fibonacci.alerta
  );
  const statusSequencia = avaliarFaixa(
    maiorSequencia,
    FAIXAS_LOTOFACIL.sequencia.ideal,
    FAIXAS_LOTOFACIL.sequencia.alerta
  );
  const statusCruz = avaliarFaixa(cruz, FAIXAS_LOTOFACIL.cruz.ideal, FAIXAS_LOTOFACIL.cruz.alerta);
  const statusQuadrantes = avaliarStatusQuadrantes(qVals);

  const blocosTexto =
    blocosConsecutivos.length > 0
      ? blocosConsecutivos
          .slice(0, 3)
          .map((b) => `${String(b[0]).padStart(2, '0')}–${String(b[b.length - 1]).padStart(2, '0')}`)
          .join(', ')
      : 'Sem seq.';

  const metricasLista: MetricaResultado[] = [
    {
      id: 'pares_impares',
      label: 'Pares / Ímpares',
      valorExibicao: `${pares}P / ${impares}I`,
      valorNumerico: pares,
      status: statusPares,
      statusLabel: STATUS_PARAMETRO_LABELS[statusPares],
      faixaIdealTexto: FAIXAS_LOTOFACIL.pares.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.pares.detalheTooltip,
    },
    {
      id: 'repetidas',
      label: 'Repetidas',
      valorExibicao: repetidasAnterior !== null ? `${repetidasAnterior} dez.` : 'N/A',
      valorNumerico: repetidasAnterior ?? -1,
      status: statusRepetidas,
      statusLabel: STATUS_PARAMETRO_LABELS[statusRepetidas],
      faixaIdealTexto: FAIXAS_LOTOFACIL.repetidas.texto,
      tooltipTexto:
        repetidasAnterior !== null
          ? FAIXAS_LOTOFACIL.repetidas.detalheTooltip
          : 'Concurso anterior indisponível no histórico local (Neutro)',
    },
    {
      id: 'soma',
      label: 'Soma Total',
      valorExibicao: `${somaTotal}`,
      valorNumerico: somaTotal,
      status: statusSoma,
      statusLabel: STATUS_PARAMETRO_LABELS[statusSoma],
      faixaIdealTexto: FAIXAS_LOTOFACIL.soma.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.soma.detalheTooltip,
    },
    {
      id: 'primos',
      label: 'Primos',
      valorExibicao: `${primos} dez.`,
      valorNumerico: primos,
      status: statusPrimos,
      statusLabel: STATUS_PARAMETRO_LABELS[statusPrimos],
      faixaIdealTexto: FAIXAS_LOTOFACIL.primos.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.primos.detalheTooltip,
    },
    {
      id: 'moldura',
      label: 'Moldura / Miolo',
      valorExibicao: `${moldura}M / ${miolo}C`,
      valorNumerico: moldura,
      status: statusMoldura,
      statusLabel: STATUS_PARAMETRO_LABELS[statusMoldura],
      faixaIdealTexto: FAIXAS_LOTOFACIL.moldura.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.moldura.detalheTooltip,
    },
    {
      id: 'fibonacci',
      label: 'Fibonacci',
      valorExibicao: `${fibonacci} dez.`,
      valorNumerico: fibonacci,
      status: statusFibonacci,
      statusLabel: STATUS_PARAMETRO_LABELS[statusFibonacci],
      faixaIdealTexto: FAIXAS_LOTOFACIL.fibonacci.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.fibonacci.detalheTooltip,
    },
    {
      id: 'sequencia',
      label: 'Maior Sequência',
      valorExibicao: `Máx ${maiorSequencia}`,
      valorNumerico: maiorSequencia,
      status: statusSequencia,
      statusLabel: STATUS_PARAMETRO_LABELS[statusSequencia],
      faixaIdealTexto: FAIXAS_LOTOFACIL.sequencia.texto,
      tooltipTexto: `${FAIXAS_LOTOFACIL.sequencia.detalheTooltip} · Blocos: ${blocosTexto}`,
    },
    {
      id: 'cruz',
      label: 'Cruz Central',
      valorExibicao: `${cruz} dez.`,
      valorNumerico: cruz,
      status: statusCruz,
      statusLabel: STATUS_PARAMETRO_LABELS[statusCruz],
      faixaIdealTexto: FAIXAS_LOTOFACIL.cruz.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.cruz.detalheTooltip,
    },
    {
      id: 'quadrantes',
      label: 'Quadrantes',
      valorExibicao: `${q1}-${q2}-${q3}-${q4}${centro13 ? ' (+13)' : ''}`,
      valorNumerico: qVals,
      status: statusQuadrantes,
      statusLabel: STATUS_PARAMETRO_LABELS[statusQuadrantes],
      faixaIdealTexto: FAIXAS_LOTOFACIL.quadrantePorBloco.texto,
      tooltipTexto: FAIXAS_LOTOFACIL.quadrantePorBloco.detalheTooltip,
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
    paresImpares: criarMetricaAvaliada(
      pares,
      `${pares}P / ${impares}I`,
      statusPares,
      FAIXAS_LOTOFACIL.pares.texto
    ),
    repetidasAnterior: criarMetricaAvaliada(
      repetidasAnterior,
      repetidasAnterior !== null ? `${repetidasAnterior} dez.` : 'N/A',
      statusRepetidas,
      FAIXAS_LOTOFACIL.repetidas.texto
    ),
    somaTotal: criarMetricaAvaliada(somaTotal, `${somaTotal}`, statusSoma, FAIXAS_LOTOFACIL.soma.texto),
    primos: criarMetricaAvaliada(primos, `${primos} dez.`, statusPrimos, FAIXAS_LOTOFACIL.primos.texto),
    molduraMiolo: criarMetricaAvaliada(
      moldura,
      `${moldura}M / ${miolo}C`,
      statusMoldura,
      FAIXAS_LOTOFACIL.moldura.texto
    ),
    fibonacci: criarMetricaAvaliada(
      fibonacci,
      `${fibonacci} dez.`,
      statusFibonacci,
      FAIXAS_LOTOFACIL.fibonacci.texto
    ),
    sequencia: criarMetricaAvaliada(
      maiorSequencia,
      `Máx ${maiorSequencia} (${blocosTexto})`,
      statusSequencia,
      FAIXAS_LOTOFACIL.sequencia.texto
    ),
    cruz: criarMetricaAvaliada(cruz, `${cruz} dez.`, statusCruz, FAIXAS_LOTOFACIL.cruz.texto),
    quadrantes: criarMetricaAvaliada(
      quadrantes,
      `${q1}-${q2}-${q3}-${q4}${centro13 ? ' (+13)' : ''}`,
      statusQuadrantes,
      FAIXAS_LOTOFACIL.quadrantePorBloco.texto
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
 * Localiza com segurança as dezenas do concurso imediatamente anterior (concurso - 1)
 * dentro de um histórico de sorteios carregado no estado/banco.
 */
export function resolvePreviousDrawDezenas(
  concursoAtual: number,
  drawsHistory: ReadonlyArray<{ concurso: number; dezenas: number[] }>
): number[] | null {
  if (!Number.isFinite(concursoAtual) || !Array.isArray(drawsHistory) || drawsHistory.length === 0) {
    return null;
  }
  const exactPrev = drawsHistory.find((d) => d.concurso === concursoAtual - 1);
  if (exactPrev && Array.isArray(exactPrev.dezenas) && exactPrev.dezenas.length > 0) {
    return exactPrev.dezenas;
  }
  return null;
}
