import { calcularParametrosConcurso, FAIXAS_LOTOFACIL, ParametrosConcurso } from './lotofacilStats';
import { obterFaixasEscaladas } from './lotofacilStatsConfig';

export { obterFaixasEscaladas };

// --- 1. BITMASK PARA CRUZAMENTO ULTRA-RÁPIDO COM HISTÓRICO ---
export function dezenasParaBitmask(dezenas: readonly number[]): number {
  let mask = 0;
  for (const n of dezenas) {
    if (Number.isInteger(n) && n >= 1 && n <= 25) {
      mask |= 1 << (n - 1);
    }
  }
  return mask;
}

function contarBits(n: number): number {
  let count = 0;
  let value = n;
  while (value > 0) {
    value &= value - 1;
    count++;
  }
  return count;
}

export interface ResultadoHistoricoMatch {
  jaSaiu: boolean;
  maiorAcerto: number; // 14 ou 15
  concursoNumero?: number;
}

export function verificarNoHistorico(
  jogoMask: number,
  historicoMasks: ReadonlyArray<{ concurso: number; mask: number }>,
  limiteBloqueio: 14 | 15 = 14
): ResultadoHistoricoMatch {
  let bestMatch: ResultadoHistoricoMatch | null = null;

  for (const item of historicoMasks) {
    const acertos = contarBits(jogoMask & item.mask);
    if (acertos >= limiteBloqueio) {
      if (acertos === 15) {
        return { jaSaiu: true, maiorAcerto: 15, concursoNumero: item.concurso };
      }
      if (!bestMatch || acertos > bestMatch.maiorAcerto) {
        bestMatch = { jaSaiu: true, maiorAcerto: acertos, concursoNumero: item.concurso };
      }
    }
  }

  return bestMatch ?? { jaSaiu: false, maiorAcerto: 0 };
}

// --- 2. GERADOR COM LOOP INTELIGENTE ANTI-TRAVAMENTO ---
export interface ConfigGeracaoOuro {
  quantidadeJogos: number; // Ex: 10 jogos
  dezenasPorJogo: number; // 15 a 20
  ultimoConcurso: readonly number[];
  historicoConcursos: ReadonlyArray<{ concurso: number; dezenas: readonly number[] }>;
  bloquearJaSorteados?: boolean;
  limiteBloqueioPontos?: 14 | 15; // Padrão: 14 (bloqueia 14 e 15 pts)
  apenasPadraoOuro?: boolean;
  maxTentativas?: number; // Trava de segurança (padrão: 30.000)
}

export interface ResultadoGeracao {
  jogos: { dezenas: number[]; analise: ParametrosConcurso }[];
  tentativasUsadas: number;
  bloqueadosPorHistorico: number;
  atingiuLimiteSeguranca: boolean;
}

function sortearJogoAleatorio(qtd: number): number[] {
  const pool = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, qtd).sort((a, b) => a - b);
}

export async function gerarJogosOuroAsync(config: ConfigGeracaoOuro): Promise<ResultadoGeracao> {
  const {
    quantidadeJogos,
    dezenasPorJogo,
    ultimoConcurso,
    historicoConcursos,
    bloquearJaSorteados = true,
    limiteBloqueioPontos = 14,
    apenasPadraoOuro = true,
    maxTentativas = 30000,
  } = config;

  const qtdSegura = Math.min(20, Math.max(15, Math.round(dezenasPorJogo)));
  const totalAlvo = Math.max(1, Math.round(quantidadeJogos));

  // Pré-calcula bitmasks do histórico uma única vez
  const historicoMasks = bloquearJaSorteados
    ? historicoConcursos
        .filter((h) => Array.isArray(h.dezenas) && h.dezenas.length > 0)
        .map((h) => ({ concurso: h.concurso, mask: dezenasParaBitmask(h.dezenas) }))
    : [];

  const jogosAprovados: { dezenas: number[]; analise: ParametrosConcurso }[] = [];
  const masksGeradas = new Set<number>();

  let tentativas = 0;
  let bloqueadosPorHistorico = 0;

  while (jogosAprovados.length < totalAlvo && tentativas < maxTentativas) {
    tentativas++;

    // Libera a thread do navegador a cada 1.500 iterações para manter a UI fluida
    if (tentativas % 1500 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const candidato = sortearJogoAleatorio(qtdSegura);
    const mask = dezenasParaBitmask(candidato);

    // Evita jogos repetidos no mesmo lote
    if (masksGeradas.has(mask)) continue;

    // 1. Checagem contra o histórico oficial
    if (bloquearJaSorteados && historicoMasks.length > 0) {
      const check = verificarNoHistorico(mask, historicoMasks, limiteBloqueioPontos);
      if (check.jaSaiu) {
        bloqueadosPorHistorico++;
        continue;
      }
    }

    // 2. Avaliação estatística com faixas escaladas para 15 a 20 dezenas
    const analise = calcularParametrosConcurso(candidato, ultimoConcurso);
    const aprovado = apenasPadraoOuro
      ? analise.resumo.classificacao === 'Padrão Ouro'
      : analise.resumo.criticos === 0;

    if (aprovado) {
      masksGeradas.add(mask);
      jogosAprovados.push({ dezenas: candidato, analise });
    }
  }

  return {
    jogos: jogosAprovados,
    tentativasUsadas: tentativas,
    bloqueadosPorHistorico,
    atingiuLimiteSeguranca: jogosAprovados.length < totalAlvo,
  };
}

export { FAIXAS_LOTOFACIL };
