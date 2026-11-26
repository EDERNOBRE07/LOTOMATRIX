import {
  calcularAderenciaConcurso,
  avaliarFaixa,
  avaliarStatusSomaTotal,
  resolvePreviousDrawDezenas,
} from './concursoParametros';
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
  avaliarFaixa,
  avaliarStatusSomaTotal,
  resolvePreviousDrawDezenas,
};

export type {
  StatusParametro,
  StatusParametroLabel,
  MetricaResultado,
  ResumoAderencia,
  ParametrosConcurso,
};

export interface JogoAvaliado {
  dezenas: number[];
  analise: ParametrosConcurso;
}

export interface CriteriosFiltroJogos {
  scoreMinimo?: number; // ex: 75 (0 a 100)
  maxCriticos?: number; // ex: 0 (nenhum indicador vermelho)
  apenasPadraoOuro?: boolean;
}

/**
 * Calcula todos os 9 parâmetros estatísticos, seus status de semáforo
 * (`ideal` | `alerta` | `critico` | `neutro`) e o Score Geral de Aderência (0–100%).
 */
export function calcularParametrosConcurso(
  dezenasAtuais: readonly number[],
  dezenasAnteriores?: readonly number[] | null
): ParametrosConcurso {
  return calcularAderenciaConcurso(dezenasAtuais, dezenasAnteriores);
}

/**
 * Avalia, filtra e ranqueia uma lista de jogos gerados (ex: fechamento)
 * usando o último concurso oficial como referência para repetidas.
 *
 * Ordena do maior `scorePercentual` para o menor, com desempate por menor
 * número de indicadores em `alerta` (e menor número de críticos).
 */
export function filtrarERanquearJogos(
  jogosGerados: readonly number[][],
  ultimoConcursoOficial?: readonly number[] | null,
  criterios: CriteriosFiltroJogos = {}
): JogoAvaliado[] {
  const { scoreMinimo = 0, maxCriticos = 9, apenasPadraoOuro = false } = criterios;

  return jogosGerados
    .map((dezenas) => ({
      dezenas,
      analise: calcularParametrosConcurso(dezenas, ultimoConcursoOficial),
    }))
    .filter(({ analise }) => {
      const { scorePercentual, criticos, classificacao } = analise.resumo;
      if (apenasPadraoOuro && classificacao !== 'Padrão Ouro') return false;
      if (scorePercentual < scoreMinimo) return false;
      if (criticos > maxCriticos) return false;
      return true;
    })
    .sort((a, b) => {
      // Ordena do maior Score para o menor
      if (b.analise.resumo.scorePercentual !== a.analise.resumo.scorePercentual) {
        return b.analise.resumo.scorePercentual - a.analise.resumo.scorePercentual;
      }
      // Desempate: menos críticos primeiro, depois menos alertas
      if (a.analise.resumo.criticos !== b.analise.resumo.criticos) {
        return a.analise.resumo.criticos - b.analise.resumo.criticos;
      }
      return a.analise.resumo.alertas - b.analise.resumo.alertas;
    });
}
