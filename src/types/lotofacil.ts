export interface LotofacilDraw {
  concurso: number;
  data: string;
  dezenas: number[];
  premiacoes?: {
    faixa15?: { ganhadores: number; valor: number };
    faixa14?: { ganhadores: number; valor: number };
    faixa13?: { ganhadores: number; valor: number };
    faixa12?: { ganhadores: number; valor: number };
    faixa11?: { ganhadores: number; valor: number };
    acumuladoProximo?: number;
  };
}

export interface DezenaStats {
  numero: number;
  vezes: number;
  atrasoAtual: number;
  atrasoUltimo: number;
  maiorAtraso: number;
  atrasoMedio: number;
  atrasoAcimaDaMedia: boolean;
  status: 'atrasada' | 'frequente' | 'neutra';
  ePrimo: boolean;
  eMoldura: boolean;
  eFibonacci: boolean;
  presenteUltimoConcurso: boolean;
  pendenteNoCiclo: boolean;
}

export interface DuplaStats {
  dupla: [number, number];
  vezes: number;
  atrasoAtual: number;
  atrasoUltimo: number;
  maiorAtraso: number;
  atrasoMedio: number;
}

export interface FilterCriteria {
  paresMin: number;
  paresMax: number;
  primosMin: number;
  primosMax: number;
  somaMin: number;
  somaMax: number;
  molduraMin: number;
  molduraMax: number;
  fibonacciMin: number;
  fibonacciMax: number;
  repetidasMin: number;
  repetidasMax: number;
  maxConsecutivas: number;
  dezenasFixas: number[];
  dezenasExcluidas: number[];
  curvaAbcAtiva?: boolean;
  minDezenasClasseA?: number;
  combinacoesVazioExcluidas?: [number, number][];
  vaziosAtivos?: boolean;
  robustezEstatisticaAtiva?: boolean;
  robustez50SomaMin?: number;
  robustez50SomaMax?: number;
  robustez50ParesMin?: number;
  robustez50ParesMax?: number;
  robustez50MolduraMin?: number;
  robustez50MolduraMax?: number;
  fechamentoPonderadoAtivo?: boolean;
}

export type FechamentoMode = 
  | '16_14_15'
  | '17_14_15'
  | '18_14_15'
  | '19_14_15'
  | '20_14_15'
  | '18_13_14'
  | '21_13_15'
  | 'surpresinha_inteligente';

export interface FechamentoPreset {
  nome: string;
  dezenasNecessarias: number;
  jogosMaximos: number;
  garantia: string;
  condicao: string;
  reducaoPercentual: number;
  descricao: string;
}

export interface GameTicket {
  id: string;
  index: number;
  dezenas: number[];
  pares: number;
  impares: number;
  primos: number;
  soma: number;
  moldura: number;
  miolo: number;
  fibonacci: number;
  repetidas: number;
  maxConsecutivas: number;
  scoreIA: number;
  tags?: string[];
}

export interface SimulationResult {
  totalJogos: number;
  concursosTestados: number;
  custoTotal: number;
  premioTotal: number;
  saldoLiquido: number;
  roi: number;
  acertos15: number;
  acertos14: number;
  acertos13: number;
  acertos12: number;
  acertos11: number;
  detalhesMelhores: {
    concurso: number;
    data: string;
    acertos: number;
    jogoId: number;
    dezenasJogo: number[];
    dezenasSorteadas: number[];
    premioEstimado: number;
  }[];
}

export interface AIPredictionResponse {
  scores: number[];
  dezenasRecomendadas18: number[];
  dezenasRecomendadas15_Ouro: number[][];
  taxaConfianca: number;
  justificativaTecnica: string;
  dezenasChave: number[];
  padroesSugeridos: {
    paresImpares: string;
    primos: string;
    moldura: string;
    somaFaixa: string;
    repetidas: string;
  };
}

export interface FechamentoExportMeta {
  strategyName?: string;
  modeName?: string;
  garantia?: string;
  targetCount?: number;
  selectedNumbers?: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  filters?: FilterCriteria;
  concurso?: number;
  dataConcurso?: string;
  timestamp?: number;
}
