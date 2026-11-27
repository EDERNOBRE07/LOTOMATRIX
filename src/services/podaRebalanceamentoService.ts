import { calcularParametrosConcurso, ParametrosConcurso } from '../utils/lotofacilStats';
import { dezenasParaBitmask } from '../utils/lotofacilEngine';

export interface ConfigPodaRebalanceamento {
  bilhetes: number[][];
  poolDezenas: number[];
  ultimoConcurso: number[];
  dezenasFixas?: number[];
  maxSobreposicaoIdeal?: number; // Padrão: 12 (penaliza >= 13 e bloqueia duplicata 15)
  onProgress?: (percent: number) => void;
}

export interface AlteracaoBilheteRebalanceado {
  indiceBilhete: number;
  dezenaRemovida: number;
  dezenaInserida: number;
  scoreAntes: number;
  scoreDepois: number;
  criticosAntes: number;
  criticosDepois: number;
  classificacaoAntes: ParametrosConcurso['resumo']['classificacao'];
  classificacaoDepois: ParametrosConcurso['resumo']['classificacao'];
  maiorSobreposicaoDepois: number;
}

export interface BilheteRebalanceadoItem {
  dezenas: number[];
  analise: ParametrosConcurso;
  foiRebalanceado: boolean;
  alteracao?: AlteracaoBilheteRebalanceado;
}

export interface ResultadoPodaRebalanceamento {
  bilhetes: BilheteRebalanceadoItem[];
  alteracoes: AlteracaoBilheteRebalanceado[];
  totalAvaliados: number;
  totalRebalanceados: number;
  criticosEliminados: number;
  promovidosPadraoOuro: number;
  scoreMedioAntes: number;
  scoreMedioDepois: number;
}

function contarBits(n: number): number {
  let c = 0;
  let v = n;
  while (v > 0) {
    v &= v - 1;
    c++;
  }
  return c;
}

function pesoClassificacao(cls: ParametrosConcurso['resumo']['classificacao']): number {
  if (cls === 'Padrão Ouro') return 45;
  if (cls === 'Dentro da Média') return 20;
  if (cls === 'Atípico') return 5;
  return -25;
}

function calcularPenalidadeDiversidade(
  maskCandidata: number,
  masksAtuais: number[],
  ignorarIndice: number,
  maxSobreposicaoIdeal: number
): { penalidade: number; maiorSobreposicao: number } {
  let penalidade = 0;
  let maiorSobreposicao = 0;

  for (let j = 0; j < masksAtuais.length; j++) {
    if (j === ignorarIndice) continue;
    const overlap = contarBits(maskCandidata & masksAtuais[j]);
    if (overlap > maiorSobreposicao) maiorSobreposicao = overlap;
    if (overlap >= 14) {
      penalidade += 45;
    } else if (overlap > maxSobreposicaoIdeal) {
      penalidade += (overlap - maxSobreposicaoIdeal) * 10;
    }
  }

  return { penalidade, maiorSobreposicao };
}

function avaliarObjetivo(
  analise: ParametrosConcurso,
  penalidadeDiversidade: number
): number {
  const { scorePercentual, criticos, alertas, classificacao } = analise.resumo;
  return (
    pesoClassificacao(classificacao) +
    scorePercentual * 1.6 -
    criticos * 65 -
    alertas * 7 -
    penalidadeDiversidade
  );
}

/**
 * Poda e Rebalanceamento por Busca Local (troca de 1 dezena dentro do próprio pool):
 * Em vez de deletar bilhetes com indicadores críticos ou fora do padrão (o que destrói a garantia
 * matemática da matriz), realiza substituições pontuais de 1 dezena que:
 * 1. Respeitam 100% das dezenas fixas (nunca removem uma fixa).
 * 2. Eliminam indicadores críticos e elevam o bilhete para Padrão Ouro (ou maior score possível).
 * 3. Preservam cobertura e diversidade da matriz evitando duplicatas e penalizando sobreposição via bitmask.
 */
export async function rebalancearMatrizPorBuscaLocalAsync(
  config: ConfigPodaRebalanceamento
): Promise<ResultadoPodaRebalanceamento> {
  const {
    bilhetes,
    poolDezenas,
    ultimoConcurso,
    dezenasFixas = [],
    maxSobreposicaoIdeal = 12,
    onProgress,
  } = config;

  if (!bilhetes || bilhetes.length === 0) {
    return {
      bilhetes: [],
      alteracoes: [],
      totalAvaliados: 0,
      totalRebalanceados: 0,
      criticosEliminados: 0,
      promovidosPadraoOuro: 0,
      scoreMedioAntes: 0,
      scoreMedioDepois: 0,
    };
  }

  const setFixas = new Set(dezenasFixas);
  const poolBase = Array.from(
    new Set([...poolDezenas, ...bilhetes.flat()])
  )
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 25)
    .sort((a, b) => a - b);

  const atuais = bilhetes.map((b) => [...b].sort((a, b2) => a - b2));
  const masksAtuais = atuais.map((b) => dezenasParaBitmask(b));
  const masksSet = new Set<number>(masksAtuais);
  const analisesIniciais = atuais.map((b) => calcularParametrosConcurso(b, ultimoConcurso));
  const analisesFinais = [...analisesIniciais];
  const alteracoesPorIndice = new Map<number, AlteracaoBilheteRebalanceado>();

  const scoreMedioAntes =
    analisesIniciais.reduce((acc, a) => acc + a.resumo.scorePercentual, 0) / analisesIniciais.length;

  let criticosEliminados = 0;
  let promovidosPadraoOuro = 0;

  for (let i = 0; i < atuais.length; i++) {
    if (i % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
      onProgress?.(Math.round((i / atuais.length) * 100));
    }

    const analiseAtual = analisesFinais[i];
    const precisaRebalancear =
      analiseAtual.resumo.criticos > 0 ||
      analiseAtual.resumo.classificacao !== 'Padrão Ouro';

    if (!precisaRebalancear) continue;

    const bilheteAtual = atuais[i];
    const maskAtual = masksAtuais[i];
    const setAtual = new Set(bilheteAtual);

    const removiveis = bilheteAtual.filter((n) => !setFixas.has(n));
    const inseriveis = poolBase.filter((n) => !setAtual.has(n));

    if (removiveis.length === 0 || inseriveis.length === 0) continue;

    const divAtual = calcularPenalidadeDiversidade(maskAtual, masksAtuais, i, maxSobreposicaoIdeal);
    const objetivoAtual = avaliarObjetivo(analiseAtual, divAtual.penalidade);

    let melhorSwap: {
      dezenas: number[];
      mask: number;
      analise: ParametrosConcurso;
      outNum: number;
      inNum: number;
      objetivo: number;
      maiorSobreposicao: number;
    } | null = null;

    for (const outNum of removiveis) {
      const maskSemOut = maskAtual & ~(1 << (outNum - 1));
      for (const inNum of inseriveis) {
        const candMask = maskSemOut | (1 << (inNum - 1));

        // Nunca permite duplicata exata na matriz
        if (masksSet.has(candMask)) continue;

        const candDezenas = bilheteAtual
          .map((n) => (n === outNum ? inNum : n))
          .sort((a, b) => a - b);

        const candAnalise = calcularParametrosConcurso(candDezenas, ultimoConcurso);

        // Exige melhoria estatística real (nunca piora críticos nem reduz score mantendo críticos)
        if (candAnalise.resumo.criticos > analiseAtual.resumo.criticos) continue;
        const melhorouEstatistica =
          candAnalise.resumo.criticos < analiseAtual.resumo.criticos ||
          (candAnalise.resumo.classificacao === 'Padrão Ouro' &&
            analiseAtual.resumo.classificacao !== 'Padrão Ouro') ||
          candAnalise.resumo.scorePercentual > analiseAtual.resumo.scorePercentual;

        if (!melhorouEstatistica) continue;

        const divCand = calcularPenalidadeDiversidade(candMask, masksAtuais, i, maxSobreposicaoIdeal);
        const objetivoCand = avaliarObjetivo(candAnalise, divCand.penalidade);

        if (
          objetivoCand > objetivoAtual &&
          (!melhorSwap || objetivoCand > melhorSwap.objetivo)
        ) {
          melhorSwap = {
            dezenas: candDezenas,
            mask: candMask,
            analise: candAnalise,
            outNum,
            inNum,
            objetivo: objetivoCand,
            maiorSobreposicao: divCand.maiorSobreposicao,
          };
        }
      }
    }

    if (melhorSwap) {
      masksSet.delete(maskAtual);
      masksSet.add(melhorSwap.mask);
      atuais[i] = melhorSwap.dezenas;
      masksAtuais[i] = melhorSwap.mask;
      analisesFinais[i] = melhorSwap.analise;

      const deltaCriticos = Math.max(0, analiseAtual.resumo.criticos - melhorSwap.analise.resumo.criticos);
      criticosEliminados += deltaCriticos;
      if (
        analiseAtual.resumo.classificacao !== 'Padrão Ouro' &&
        melhorSwap.analise.resumo.classificacao === 'Padrão Ouro'
      ) {
        promovidosPadraoOuro++;
      }

      alteracoesPorIndice.set(i, {
        indiceBilhete: i,
        dezenaRemovida: melhorSwap.outNum,
        dezenaInserida: melhorSwap.inNum,
        scoreAntes: analiseAtual.resumo.scorePercentual,
        scoreDepois: melhorSwap.analise.resumo.scorePercentual,
        criticosAntes: analiseAtual.resumo.criticos,
        criticosDepois: melhorSwap.analise.resumo.criticos,
        classificacaoAntes: analiseAtual.resumo.classificacao,
        classificacaoDepois: melhorSwap.analise.resumo.classificacao,
        maiorSobreposicaoDepois: melhorSwap.maiorSobreposicao,
      });
    }
  }

  onProgress?.(100);

  const scoreMedioDepois =
    analisesFinais.reduce((acc, a) => acc + a.resumo.scorePercentual, 0) / analisesFinais.length;

  const alteracoes = Array.from(alteracoesPorIndice.values());

  return {
    bilhetes: atuais.map((dezenas, idx) => ({
      dezenas,
      analise: analisesFinais[idx],
      foiRebalanceado: alteracoesPorIndice.has(idx),
      alteracao: alteracoesPorIndice.get(idx),
    })),
    alteracoes,
    totalAvaliados: atuais.length,
    totalRebalanceados: alteracoes.length,
    criticosEliminados,
    promovidosPadraoOuro,
    scoreMedioAntes: Number(scoreMedioAntes.toFixed(1)),
    scoreMedioDepois: Number(scoreMedioDepois.toFixed(1)),
  };
}
