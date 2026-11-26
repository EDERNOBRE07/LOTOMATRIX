export type StatusParametro = 'ideal' | 'alerta' | 'critico' | 'neutro';

export type StatusParametroLabel = 'Ideal' | 'Alerta' | 'Crítico' | 'Neutro';

export interface MetricaResultado {
  id: string;
  label: string;
  valorExibicao: string;
  valorNumerico: number | number[];
  status: StatusParametro;
  statusLabel: StatusParametroLabel;
  faixaIdealTexto: string;
  tooltipTexto: string;
}

export interface ResumoAderencia {
  scorePercentual: number; // 0 a 100
  ideais: number;
  alertas: number;
  criticos: number;
  neutros: number;
  totalAvaliados: number;
  classificacao: 'Padrão Ouro' | 'Dentro da Média' | 'Atípico' | 'Fora do Padrão';
  foraDoPadrao: boolean; // true se tiver >= 3 críticos ou score < 50%
}

export interface ParametrosConcurso {
  metricas: MetricaResultado[];
  resumo: ResumoAderencia;
}

export interface FaixaMetricaConfig {
  readonly ideal: readonly [number, number];
  readonly alerta: readonly [number, number];
  readonly texto: string;
  readonly detalheTooltip: string;
}

/**
 * Constantes configuráveis das faixas históricas da Lotofácil.
 * Ajuste os limites de `ideal` e `alerta` aqui para recalibrar todo o semáforo
 * (verde / âmbar / vermelho) sem modificar a lógica dos componentes.
 */
export const FAIXAS_LOTOFACIL = {
  pares: {
    ideal: [6, 8] as const,
    alerta: [5, 9] as const,
    texto: '6 a 8 pares',
    detalheTooltip: 'Ideal: 6 a 8 pares · Alerta: 5 ou 9 · Crítico: ≤4 ou ≥10',
  },
  repetidas: {
    ideal: [8, 10] as const,
    alerta: [7, 11] as const,
    texto: '8 a 10 repetidas',
    detalheTooltip: 'Ideal: 8 a 10 repetidas · Alerta: 7 ou 11 · Crítico: ≤6 ou ≥12',
  },
  soma: {
    ideal: [180, 215] as const,
    alerta: [165, 230] as const,
    texto: '180 a 215',
    detalheTooltip: 'Ideal: 180 a 215 · Alerta: 165–179 ou 216–230 · Crítico: <165 ou >230',
  },
  primos: {
    ideal: [5, 6] as const,
    alerta: [4, 7] as const,
    texto: '5 a 6 primos',
    detalheTooltip: 'Ideal: 5 a 6 primos · Alerta: 4 ou 7 · Crítico: ≤3 ou ≥8',
  },
  moldura: {
    ideal: [9, 11] as const,
    alerta: [8, 12] as const,
    texto: '9 a 11 na moldura',
    detalheTooltip: 'Ideal: 9 a 11 na moldura · Alerta: 8 ou 12 · Crítico: ≤7 ou ≥13',
  },
  fibonacci: {
    ideal: [3, 5] as const,
    alerta: [2, 6] as const,
    texto: '3 a 5 Fibonacci',
    detalheTooltip: 'Ideal: 3 a 5 Fibonacci · Alerta: 2 ou 6 · Crítico: ≤1 ou 7',
  },
  sequencia: {
    ideal: [3, 5] as const,
    alerta: [2, 6] as const,
    texto: 'Maior seq: 3 a 5',
    detalheTooltip: 'Ideal: 3 a 5 consecutivas · Alerta: 2 ou 6 · Crítico: 1 ou ≥7',
  },
  cruz: {
    ideal: [4, 6] as const,
    alerta: [3, 7] as const,
    texto: '4 a 6 na cruz',
    detalheTooltip: 'Ideal: 4 a 6 na cruz central · Alerta: 3 ou 7 · Crítico: ≤2 ou ≥8',
  },
  quadrantePorBloco: {
    ideal: [2, 5] as const,
    alerta: [1, 6] as const,
    texto: '2 a 5 por quadrante',
    detalheTooltip: 'Ideal: 2 a 5 por quadrante · Alerta: algum com 1 ou 6 · Crítico: 0 ou ≥7',
  },
} as const satisfies Record<string, FaixaMetricaConfig>;

/**
 * Regras configuráveis do Score Geral de Aderência (0 a 100%).
 */
export const ADERENCIA_CONFIG = {
  pesoIdeal: 1.0,
  pesoAlerta: 0.5,
  pesoCritico: 0,
  scorePadraoOuroMin: 85,
  scoreForaDoPadraoMaxExclusivo: 50,
  criticosForaDoPadraoMin: 3,
  scoreAtipicoMaxExclusivo: 70,
} as const;

export const STATUS_PARAMETRO_LABELS: Record<StatusParametro, StatusParametroLabel> = {
  ideal: 'Ideal',
  alerta: 'Alerta',
  critico: 'Crítico',
  neutro: 'Neutro',
};

/**
 * Conjuntos matemáticos fixos do volante 5×5 da Lotofácil.
 */
export const CONJUNTOS_LOTOFACIL = {
  primos: [2, 3, 5, 7, 11, 13, 17, 19, 23] as const,
  moldura: [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25] as const,
  miolo: [7, 8, 9, 12, 13, 14, 17, 18, 19] as const,
  fibonacci: [1, 2, 3, 5, 8, 13, 21] as const,
  cruz: [3, 8, 11, 12, 13, 14, 15, 18, 23] as const,
  // Regra simétrica de quadrantes adotada no motor combinatório (src/services/combinatorics.ts)
  quadrantes: {
    Q1: [1, 2, 3, 6, 7, 8] as const,
    Q2: [4, 5, 9, 10, 14, 15] as const,
    Q3: [11, 12, 16, 17, 21, 22] as const,
    Q4: [18, 19, 20, 23, 24, 25] as const,
  },
} as const;
