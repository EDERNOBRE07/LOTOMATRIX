import { calcularParametrosConcurso, ParametrosConcurso } from '../utils/lotofacilStats';
import { dezenasParaBitmask } from '../utils/lotofacilEngine';

export interface ConfigPodaRebalanceamento {
  bilhetes: number[][];            // Matriz de fechamento já gerada (jogos de 15 dezenas)
  pool: number[];                  // Pool original de dezenas do fechamento (ex: 18 a 21 dezenas)
  ultimoConcurso: number[];        // Último concurso oficial (para cálculo de repetidas)
  dezenasFixas?: number[];         // Opcional: dezenas que a busca local nunca pode remover
  scoreMinimoAlvo?: number;        // Padrão: 80 (%)
  maxCriticosPermitidos?: number;  // Padrão: 0 (nenhum indicador vermelho)
  podarIrrecuperaveis?: boolean;   // Se true, remove bilhetes que continuam 'Fora do Padrão' após busca local
  onProgress?: (percent: number) => void;
}

export interface AlteracaoBilhete {
  indiceOriginal: number;
  acao: 'mantido' | 'rebalanceado' | 'podado';
  dezenasAntes: number[];
  dezenasDepois?: number[];
  dezenaRemovida?: number;
  dezenaInserida?: number;
  scoreAntes: number;
  scoreDepois?: number;
  criticosAntes: number;
  criticosDepois?: number;
}

export interface ResultadoPodaRebalanceamento {
  bilhetesOtimizados: { dezenas: number[]; analise: ParametrosConcurso }[];
  alteracoes: AlteracaoBilhete[];
  resumo: {
    totalAntes: number;
    totalDepois: number;
    rebalanceados: number;
    podados: number;
    mantidos: number;
    scoreMedioAntes: number;
    scoreMedioDepois: number;
    criticosAntes: number;
    criticosDepois: number;
    bilhetesOuroAntes: number;
    bilhetesOuroDepois: number;
  };
}

function contarBits(n: number): number {
  let c = 0;
  while (n > 0) {
    n &= n - 1;
    c++;
  }
  return c;
}

/**
 * Mede a maior sobreposição (em dezenas iguais) entre um bilhete candidato
 * e todos os outros bilhetes da matriz. Quanto menor, maior a preservação de cobertura.
 */
function calcularMaxSobreposicao(candidatoMask: number, masksMatriz: number[], ignorarIndice: number): number {
  let maxOverlap = 0;
  for (let i = 0; i < masksMatriz.length; i++) {
    if (i === ignorarIndice || masksMatriz[i] === 0) continue;
    const overlap = contarBits(candidatoMask & masksMatriz[i]);
    if (overlap > maxOverlap) maxOverlap = overlap;
  }
  return maxOverlap;
}

export async function executarPodaERebalanceamentoAsync(
  config: ConfigPodaRebalanceamento
): Promise<ResultadoPodaRebalanceamento> {
  const {
    bilhetes,
    pool,
    ultimoConcurso,
    dezenasFixas = [],
    scoreMinimoAlvo = 80,
    maxCriticosPermitidos = 0,
    podarIrrecuperaveis = false,
    onProgress,
  } = config;

  const setFixas = new Set(dezenasFixas);
  const poolOrdenado = [...new Set(pool)].sort((a, b) => a - b);

  // Estado mutável da matriz durante a busca local
  const matrizAtual: number[][] = bilhetes.map((b) => [...b].sort((a, b2) => a - b2));
  const masksAtuais: number[] = matrizAtual.map((b) => dezenasParaBitmask(b));
  const setMasksUnicas = new Set<number>(masksAtuais);

  const analisesIniciais = matrizAtual.map((b) => calcularParametrosConcurso(b, ultimoConcurso));

  const scoreMedioAntes =
    analisesIniciais.length > 0
      ? Number(
          (
            analisesIniciais.reduce((acc, a) => acc + a.resumo.scorePercentual, 0) /
            analisesIniciais.length
          ).toFixed(1)
        )
      : 0;
  const criticosAntes = analisesIniciais.reduce((acc, a) => acc + a.resumo.criticos, 0);
  const bilhetesOuroAntes = analisesIniciais.filter((a) => a.resumo.classificacao === 'Padrão Ouro').length;

  const alteracoes: AlteracaoBilhete[] = [];
  const bilhetesFinais: { dezenas: number[]; analise: ParametrosConcurso }[] = [];

  let rebalanceados = 0;
  let podados = 0;
  let mantidos = 0;

  for (let idx = 0; idx < matrizAtual.length; idx++) {
    if (idx % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
      onProgress?.(Math.round((idx / matrizAtual.length) * 100));
    }

    const bilheteAtual = matrizAtual[idx];
    const analiseAtual = analisesIniciais[idx];
    const { scorePercentual: scoreAtual, criticos: criticosAtual } = analiseAtual.resumo;

    const precisaOtimizar = criticosAtual > maxCriticosPermitidos || scoreAtual < scoreMinimoAlvo;

    if (!precisaOtimizar) {
      mantidos++;
      bilhetesFinais.push({ dezenas: bilheteAtual, analise: analiseAtual });
      alteracoes.push({
        indiceOriginal: idx,
        acao: 'mantido',
        dezenasAntes: bilheteAtual,
        dezenasDepois: bilheteAtual,
        scoreAntes: scoreAtual,
        scoreDepois: scoreAtual,
        criticosAntes: criticosAtual,
        criticosDepois: criticosAtual,
      });
      continue;
    }

    // --- BUSCA LOCAL 1-OPT (troca de 1 dezena dentro do pool) ---
    const setBilhete = new Set(bilheteAtual);
    const dezenasDisponiveisNoPool = poolOrdenado.filter((d) => !setBilhete.has(d));
    const dezenasRemoviveis = bilheteAtual.filter((d) => !setFixas.has(d));

    let melhorCandidato: {
      dezenas: number[];
      mask: number;
      analise: ParametrosConcurso;
      sai: number;
      entra: number;
      fitness: number;
    } | null = null;

    // Fitness base do bilhete original (penaliza fortemente críticos e sobreposição alta)
    const overlapAtual = calcularMaxSobreposicao(masksAtuais[idx], masksAtuais, idx);
    const fitnessAtual = scoreAtual * 2 - criticosAtual * 45 - Math.max(0, overlapAtual - 12) * 8;

    for (const sai of dezenasRemoviveis) {
      for (const entra of dezenasDisponiveisNoPool) {
        const candidato = bilheteAtual.map((d) => (d === sai ? entra : d)).sort((a, b) => a - b);
        const mask = dezenasParaBitmask(candidato);

        // Nunca gerar bilhete duplicado na matriz
        if (setMasksUnicas.has(mask)) continue;

        const analiseCand = calcularParametrosConcurso(candidato, ultimoConcurso);
        const { scorePercentual: sc, criticos: cr, classificacao } = analiseCand.resumo;

        // Só aceita troca que realmente melhore ou elimine críticos
        if (cr > criticosAtual) continue;
        if (cr === criticosAtual && sc <= scoreAtual) continue;

        const maxOverlap = calcularMaxSobreposicao(mask, masksAtuais, idx);
        const bonusOuro = classificacao === 'Padrão Ouro' ? 25 : 0;
        const penalidadeOverlap = Math.max(0, maxOverlap - 12) * 10;

        // Função objetivo combinando qualidade estatística + preservação de cobertura
        const fitness = sc * 2 + bonusOuro - cr * 45 - penalidadeOverlap;

        if (!melhorCandidato || fitness > melhorCandidato.fitness) {
          melhorCandidato = { dezenas: candidato, mask, analise: analiseCand, sai, entra, fitness };
        }
      }
    }

    if (melhorCandidato && melhorCandidato.fitness > fitnessAtual) {
      // Aplica a substituição na matriz
      setMasksUnicas.delete(masksAtuais[idx]);
      setMasksUnicas.add(melhorCandidato.mask);
      matrizAtual[idx] = melhorCandidato.dezenas;
      masksAtuais[idx] = melhorCandidato.mask;

      rebalanceados++;
      bilhetesFinais.push({ dezenas: melhorCandidato.dezenas, analise: melhorCandidato.analise });
      alteracoes.push({
        indiceOriginal: idx,
        acao: 'rebalanceado',
        dezenasAntes: bilheteAtual,
        dezenasDepois: melhorCandidato.dezenas,
        dezenaRemovida: melhorCandidato.sai,
        dezenaInserida: melhorCandidato.entra,
        scoreAntes: scoreAtual,
        scoreDepois: melhorCandidato.analise.resumo.scorePercentual,
        criticosAntes: criticosAtual,
        criticosDepois: melhorCandidato.analise.resumo.criticos,
      });
    } else if (podarIrrecuperaveis && analiseAtual.resumo.foraDoPadrao) {
      // Poda apenas se o usuário ativou e o bilhete continuou 'Fora do Padrão'
      setMasksUnicas.delete(masksAtuais[idx]);
      masksAtuais[idx] = 0;
      podados++;
      alteracoes.push({
        indiceOriginal: idx,
        acao: 'podado',
        dezenasAntes: bilheteAtual,
        scoreAntes: scoreAtual,
        criticosAntes: criticosAtual,
      });
    } else {
      // Mantém original caso não haja troca melhor e poda esteja desativada
      mantidos++;
      bilhetesFinais.push({ dezenas: bilheteAtual, analise: analiseAtual });
      alteracoes.push({
        indiceOriginal: idx,
        acao: 'mantido',
        dezenasAntes: bilheteAtual,
        dezenasDepois: bilheteAtual,
        scoreAntes: scoreAtual,
        scoreDepois: scoreAtual,
        criticosAntes: criticosAtual,
        criticosDepois: criticosAtual,
      });
    }
  }

  onProgress?.(100);

  const scoreMedioDepois =
    bilhetesFinais.length > 0
      ? Number(
          (
            bilhetesFinais.reduce((acc, b) => acc + b.analise.resumo.scorePercentual, 0) /
            bilhetesFinais.length
          ).toFixed(1)
        )
      : 0;
  const criticosDepois = bilhetesFinais.reduce((acc, b) => acc + b.analise.resumo.criticos, 0);
  const bilhetesOuroDepois = bilhetesFinais.filter(
    (b) => b.analise.resumo.classificacao === 'Padrão Ouro'
  ).length;

  return {
    bilhetesOtimizados: bilhetesFinais,
    alteracoes,
    resumo: {
      totalAntes: matrizAtual.length,
      totalDepois: bilhetesFinais.length,
      rebalanceados,
      podados,
      mantidos,
      scoreMedioAntes,
      scoreMedioDepois,
      criticosAntes,
      criticosDepois,
      bilhetesOuroAntes,
      bilhetesOuroDepois,
    },
  };
}
