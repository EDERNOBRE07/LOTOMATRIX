import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { getSavedFechamentos, SavedFechamentoPrognostico } from './savedFechamentosStorage';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from './combinatorics';

export interface ExportHistoricoJsonOptions {
  latestDraw: LotofacilDraw;
  savedTickets?: GameTicket[];
  timeRange?: string;
}

/**
 * Exporta o relatório completo de ROI, desempenho financeiro e distribuição de probabilidade
 * para um arquivo JSON formatado legível, permitindo backup e auditoria externa.
 */
export function exportHistoricoRoiProbabilidadeJSON({
  latestDraw,
  savedTickets = [],
  timeRange = 'Todo o Histórico',
}: ExportHistoricoJsonOptions): void {
  const fechamentos = getSavedFechamentos();

  // Consolidação de bilhetes
  let allTickets: GameTicket[] = [];
  fechamentos.forEach((f) => {
    if (Array.isArray(f.tickets)) allTickets.push(...f.tickets);
  });
  if (allTickets.length === 0 && savedTickets.length > 0) {
    allTickets = savedTickets;
  }

  const totalTickets = allTickets.length;
  const custoTotal = totalTickets * VALOR_APOSTA_LOTOFACIL;

  // Tabela de rateio oficial fixo da Lotofácil
  const PREMIOS_FIXOS: Record<number, number> = {
    11: 6.0,
    12: 12.0,
    13: 30.0,
    14: 1540.0,
    15: 1850000.0,
  };

  // Contagem de acertos contra o concurso atual
  const contagemAcertos: Record<number, number> = {};
  for (let k = 0; k <= 15; k++) contagemAcertos[k] = 0;

  let retornoTotal = 0;
  let premiadosTotal = 0;
  let somaTotal = 0;
  let somaZonaOuroCount = 0;

  allTickets.forEach((t) => {
    const hits = countMatches(t.dezenas, latestDraw.dezenas);
    const clamped = Math.max(0, Math.min(15, hits));
    contagemAcertos[clamped] = (contagemAcertos[clamped] || 0) + 1;

    if (PREMIOS_FIXOS[clamped]) {
      retornoTotal += PREMIOS_FIXOS[clamped];
      premiadosTotal++;
    }

    const sumVal = t.soma || t.dezenas.reduce((a, b) => a + b, 0);
    somaTotal += sumVal;
    if (sumVal >= 190 && sumVal <= 210) {
      somaZonaOuroCount++;
    }
  });

  const saldoLiquido = retornoTotal - custoTotal;
  const roiPercentual = custoTotal > 0 ? (saldoLiquido / custoTotal) * 100 : 0;
  const mediaSoma = totalTickets > 0 ? somaTotal / totalTickets : 197.5;
  const taxaZonaOuro = totalTickets > 0 ? (somaZonaOuroCount / totalTickets) * 100 : 0;
  const taxaPremiacao = totalTickets > 0 ? (premiadosTotal / totalTickets) * 100 : 0;

  // Tabela teórica C(25, 15) = 3.268.760
  const TOTAL_COMB = 3268760;
  const PROB_TEORICA: Record<number, number> = {
    11: (286650 / TOTAL_COMB) * 100,
    12: (54600 / TOTAL_COMB) * 100,
    13: (4725 / TOTAL_COMB) * 100,
    14: (150 / TOTAL_COMB) * 100,
    15: (1 / TOTAL_COMB) * 100,
  };

  const distribuicaoRelatorio = [11, 12, 13, 14, 15].map((pontos) => {
    const qtd = contagemAcertos[pontos] || 0;
    const pct = totalTickets > 0 ? (qtd / totalTickets) * 100 : 0;
    return {
      faixaAcertos: `${pontos} Pontos`,
      bilhetesPremiados: qtd,
      percentualJogosSalvos: Number(pct.toFixed(2)),
      percentualTeoricoCaixa: Number((PROB_TEORICA[pontos] || 0).toFixed(3)),
      premioEstimadoUnitario: PREMIOS_FIXOS[pontos] || 0,
      subtotalPremio: qtd * (PREMIOS_FIXOS[pontos] || 0),
    };
  });

  const relatorioCompleto = {
    aplicacao: 'LotoSniper Pro',
    tipoDocumento: 'Relatório Executivo de ROI, Desempenho Financeiro e Distribuição de Probabilidade',
    versao: '2026.11',
    dataExportacao: new Date().toISOString(),
    dataExportacaoFormatada: new Date().toLocaleString('pt-BR'),
    filtroIntervaloTempo: timeRange,
    concursoReferencia: {
      numero: latestDraw.concurso,
      data: latestDraw.data,
      dezenasSorteadas: latestDraw.dezenas,
    },
    resumoFinanceiroROI: {
      totalFechamentosAvaliados: fechamentos.length,
      totalBilhetes: totalTickets,
      custoTotalApostas: Number(custoTotal.toFixed(2)),
      retornoFinanceiroBruto: Number(retornoTotal.toFixed(2)),
      lucroOuPrejuizoLiquido: Number(saldoLiquido.toFixed(2)),
      retornoSobreInvestimentoPercentual: Number(roiPercentual.toFixed(2)),
      totalBilhetesPremiados: premiadosTotal,
      taxaConversaoPremiada: `${taxaPremiacao.toFixed(1)}%`,
      statusBreakeven: saldoLiquido >= 0 ? 'LUCRO_CONFIRMADO' : 'FASE_ACUMULACAO',
    },
    curvaDistribuicaoSomas: {
      mediaSomaJogosSalvos: Number(mediaSoma.toFixed(1)),
      mediaHistoricaCaixa: 197.5,
      percentualZonaOuro_190a210: `${taxaZonaOuro.toFixed(1)}%`,
      percentualHistoricoCaixaZonaOuro: '64.8%',
      bilhetesNaZonaOuro: somaZonaOuroCount,
    },
    distribuicaoProbabilidadeFaixas: distribuicaoRelatorio,
    fechamentosCadastrados: fechamentos.map((f, idx) => ({
      posicao: idx + 1,
      id: f.id,
      nomeFechamento: f.tipoFechamento,
      modalidadeMatriz: f.modalidadeMatriz,
      dataCriacao: f.dataCriacao,
      concursoAlvo: f.concurso + 1,
      totalJogos: f.totalJogos,
      custoTotal: f.custoTotal,
      universoDezenas: f.universoDezenas,
      filtros: {
        soma: f.faixaSoma,
        paridade: f.paridade,
        moldura: f.moldura,
        primos: f.primos,
        fibonacci: f.fibonacci,
        repetidas: f.repetidas,
      },
    })),
  };

  const jsonStr = JSON.stringify(relatorioCompleto, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateSlug = new Date().toISOString().split('T')[0];
  link.download = `lotosniper_relatorio_roi_probabilidade_concurso_${latestDraw.concurso}_${dateSlug}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
