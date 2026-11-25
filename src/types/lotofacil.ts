export interface LotofacilDraw {
  concurso: number;
  data: string;
  dezenas: number[];
  acumulou?: boolean;
  proximoEstimado?: number;
  dataProximoConcurso?: string;
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
  // Subfiltro de Paridade nas Repetidas do Concurso Anterior (interseção Pares / Ímpares)
  repetidasParidadeAtiva?: boolean;
  repetidasParesMin?: number;
  repetidasParesMax?: number;
  repetidasImparesMin?: number;
  repetidasImparesMax?: number;
  maxConsecutivas: number;
  dezenasFixas: number[];
  dezenasExcluidas: number[];
  cruzMin?: number;
  cruzMax?: number;
  cruzAtiva?: boolean;
  bola1Min?: number;
  bola1Max?: number;
  bola15Min?: number;
  bola15Max?: number;
  extremidadesAtiva?: boolean;
  apenasZonaDeOuroPrimos?: boolean;
  antiColisaoHistoricaAtiva?: boolean;
  antiPadraoViciadoAtivo?: boolean;
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
  validacaoEstritaCruz?: boolean; // Modo Validação Estrita: restringe estritamente para 5-6 dezenas na Cruz da Lotofácil
  strictValidation?: boolean; // Trava booleana de Validação Estrita: descarta jogos fora de 5 a 6 dezenas na Cruz
  presetEstatistico?: 'conservador' | 'balanceado' | 'agressivo' | 'estratificado' | 'custom';
  modoFixas?: 'rotativas' | 'rigidas'; // Proteção K de N (padrão quando fixas >= 3) vs Rígidas 100%
  autoCalibrarSomaUniverso?: boolean; // Auto-calibra faixa de soma pelo universo selecionado (μ_U ± 20)
  estratificacaoCaudaAtiva?: boolean; // Força estratificação de cauda (75% Central 180-215 / 15% Alta 216-230 / 10% Baixa 155-179) em >= 10 jogos
  fallbackProgressivoAtivo?: boolean; // Relaxamento automático em 3 níveis caso os filtros zerem a geração
  // 6 Novos Filtros Matemáticos (Poda Combinatória & Bitwise)
  posicionalAtivo?: boolean; // Intervalos posicionais por bola D1..D15 + Branch & Bound
  multiplosAtivo?: boolean; // Máscaras bitwise M(3)..M(8)
  contagemDigitosAtiva?: boolean; // Dezenas 01-09 (3..8) e total dígitos (22..27)
  digitosMin?: number;
  digitosMax?: number;
  umDigitoMin?: number;
  umDigitoMax?: number;
  somaAlgarismosAtiva?: boolean; // Soma dos algarismos individuais [63..87]
  somaAlgarismosMin?: number;
  somaAlgarismosMax?: number;
  linhasColunasAtivo?: boolean; // Matriz 5x5: controle de min/max por linha (L1-L5) e coluna (C1-C5)
  linhasMin?: number;
  linhasMax?: number;
  colunasMin?: number;
  colunasMax?: number;
  maxLinhasCheias?: number;
  maxColunasCheias?: number;
  quadrantesAtivo?: boolean; // Distribuição nos 4 quadrantes (Q1-Q4) do volante 5x5
  quadranteMin?: number;
  quadranteMax?: number;
  rankingHistoricoAtivo?: boolean; // Equilíbrio Top 5, 10, 15, 20 mais sorteadas
  palpiteIneditoAtivo?: boolean; // Anti-repetição O(1) contra todos os sorteios oficiais
  // Filtro Avançado: Distância de Hamming Dinâmica (baseada nos últimos 5 resultados)
  hammingDinamicoAtivo?: boolean;
  hammingModo?: 'auto' | 'manual';
  hammingMinimoPersonalizado?: number;
  // Aliases canônicos de limites de filtros
  minSoma?: number;
  maxSoma?: number;
  minPares?: number;
  maxPares?: number;
  minPrimos?: number;
  maxPrimos?: number;
  minMoldura?: number;
  maxMoldura?: number;
  // Controle Inteligente de Filtros no Estúdio de Fechamento (Chave Geral + 3 Modos)
  filtrosDesativadosNoFechamento?: boolean;
  modoRigorFiltros?: FilterRigorMode;
}

export type FilterRigorMode = 'total' | 'conservador' | 'agressivo';

export type FechamentoMode = 
  | '16_14_15'
  | '17_14_15'
  | '18_14_15'
  | '19_14_15'
  | '20_14_15'
  | '18_13_14'
  | '21_13_15'
  | 'desdobramento_25_blocos'
  | 'surpresinha_inteligente'
  | 'erre_4_21'
  | 'super_14_coringas_25'
  | 'pivo_9_dezenas'
  | 'cobertura_25_3x18'
  | '18_ultra_economico_6'
  | '20_compacto_4'
  | '20_compacto_9'
  | 'aposta_espelho_2';

export interface FechamentoPreset {
  nome: string;
  dezenasNecessarias: number;
  jogosMaximos: number;
  garantia: string;
  condicao: string;
  reducaoPercentual: number;
  descricao: string;
  altaEficiencia?: boolean;
  coreSatelites?: boolean;
  auditNote?: string;
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
  cruz?: number;
  bola1?: number;
  bola15?: number;
  repetidas: number;
  repetidasPares?: number;
  repetidasImpares?: number;

  maxConsecutivas: number;
  scoreIA: number;
  tags?: string[];
  auditoriaAnomalias?: string;
  faixaSoma?: 'ouro' | 'baixa' | 'alta';
  // Métricas auditadas dos novos filtros bitwise
  somaAlgarismos?: number;
  digitosTotal?: number;
  dezenasUmDigito?: number;
  multiplosM3?: number;
  multiplosM4?: number;
  multiplosM5?: number;
  multiplosM6?: number;
  multiplosM7?: number;
  multiplosM8?: number;
  multiplosOk?: boolean;
  posicionalOk?: boolean;
  linhasColunasOk?: boolean;
  rankingHistoricoOk?: boolean;
  inedito?: boolean;
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
    fibonacci?: string;
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
  concursoAlvo?: number;
  dataConcurso?: string;
  timestamp?: number;
  engineMetadata?: {
    modoFixasAplicado: 'rotativas' | 'rigidas' | 'nenhuma';
    kMinFixas?: number;
    kMaxFixas?: number;
    minHammingDist: number;
    mediaUniversoSoma: number;
    faixaSomaCalibrada: [number, number];
    estratificacaoAplicada: boolean;
    freqIdealVariavel: number;
    fallbackLevel?: 0 | 1 | 2 | 3;
    fallbackDescription?: string;
  };
}
