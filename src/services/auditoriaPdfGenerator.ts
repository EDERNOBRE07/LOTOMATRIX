import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GameTicket, LotofacilDraw, SimulationResult } from '../types/lotofacil';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from './combinatorics';
import { getHistorical100Draws } from './historical100Draws';
import { auditBatchTicketsROI, formatCurrencyBRL } from './ticketRoiAudit';
import { getSavedFechamentos } from './savedFechamentosStorage';

export interface AuditoriaPdfExportOptions {
  tickets: GameTicket[];
  latestDraw: LotofacilDraw;
  simulationResult?: SimulationResult | null;
  simulationScopeLabel?: string;
  apostaMinima?: number;
  auditWindow?: number;
}

function getTicketBetCost(ticket: GameTicket, baseCost: number): number {
  const count = Array.isArray(ticket?.dezenas) ? ticket.dezenas.length : 15;
  if (count === 16) return baseCost * 16;
  if (count === 17) return baseCost * 136;
  if (count === 18) return baseCost * 816;
  return baseCost;
}

export function exportAuditoriaSimuladorPDF(options: AuditoriaPdfExportOptions): string {
  const {
    latestDraw,
    simulationResult = null,
    simulationScopeLabel,
    apostaMinima = VALOR_APOSTA_LOTOFACIL,
    auditWindow = 20,
  } = options;

  let sourceTickets = Array.isArray(options.tickets) ? options.tickets : [];
  if (sourceTickets.length === 0) {
    const saved = getSavedFechamentos();
    sourceTickets = saved.flatMap((f) => (Array.isArray(f.tickets) ? f.tickets : []));
  }

  const historical = getHistorical100Draws(latestDraw);
  const last5Draws = historical.slice(0, 5);
  const windowDraws = historical.slice(0, auditWindow);

  const roiBatch = auditBatchTicketsROI(sourceTickets, latestDraw, {
    windowSize: auditWindow,
    suggestedMarginPercent: 0,
    baseBetCost: apostaMinima,
  });

  // Avaliar concurso mais recente e últimas 5 rodadas
  const latestAwardedGames: Array<{
    index: number;
    dezenas: number[];
    matchedNumbers: number[];
    hits: number;
    prizeValue: number;
  }> = [];

  const latestCounts = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };
  const drawnSet = new Set(latestDraw.dezenas || []);

  sourceTickets.forEach((t, idx) => {
    const dez = Array.isArray(t.dezenas) ? [...t.dezenas].sort((a, b) => a - b) : [];
    const matchedNumbers = dez.filter((n) => drawnSet.has(n));
    const hits = matchedNumbers.length;
    if (hits >= 11) {
      let prizeValue = 0;
      if (hits === 15) {
        latestCounts[15]++;
        prizeValue = latestDraw.premiacoes?.faixa15?.valor || 1800000;
      } else if (hits === 14) {
        latestCounts[14]++;
        prizeValue = latestDraw.premiacoes?.faixa14?.valor || 1500;
      } else if (hits === 13) {
        latestCounts[13]++;
        prizeValue = latestDraw.premiacoes?.faixa13?.valor || 35;
      } else if (hits === 12) {
        latestCounts[12]++;
        prizeValue = latestDraw.premiacoes?.faixa12?.valor || 14;
      } else {
        latestCounts[11]++;
        prizeValue = latestDraw.premiacoes?.faixa11?.valor || 7;
      }
      latestAwardedGames.push({
        index: t.index ?? idx + 1,
        dezenas: dez,
        matchedNumbers,
        hits,
        prizeValue,
      });
    }
  });

  latestAwardedGames.sort((a, b) => b.hits - a.hits);

  // Evolução das últimas 5 rodadas em ordem cronológica
  const custoPorRodada = sourceTickets.reduce(
    (acc, t) => acc + getTicketBetCost(t, apostaMinima),
    0
  );
  let runningBalance5 = 0;
  let totalCost5 = 0;
  let totalReturn5 = 0;
  const last5Rows = [...last5Draws].reverse().map((draw) => {
    let retornoRodada = 0;
    let premiadosRodada = 0;
    sourceTickets.forEach((t) => {
      const hits = countMatches(t.dezenas || [], draw.dezenas || []);
      if (hits >= 11) {
        premiadosRodada++;
        if (hits === 15) retornoRodada += draw.premiacoes?.faixa15?.valor || 1800000;
        else if (hits === 14) retornoRodada += draw.premiacoes?.faixa14?.valor || 1500;
        else if (hits === 13) retornoRodada += draw.premiacoes?.faixa13?.valor || 35;
        else if (hits === 12) retornoRodada += draw.premiacoes?.faixa12?.valor || 14;
        else retornoRodada += draw.premiacoes?.faixa11?.valor || 7;
      }
    });
    const saldoRodada = retornoRodada - custoPorRodada;
    runningBalance5 += saldoRodada;
    totalCost5 += custoPorRodada;
    totalReturn5 += retornoRodada;
    return {
      concurso: `#${draw.concurso}`,
      data: draw.data || '-',
      premiados: premiadosRodada,
      custo: custoPorRodada,
      premio: retornoRodada,
      saldoRodada,
      saldoAcumulado: runningBalance5,
    };
  });

  const totalCostWindow = roiBatch.items.reduce((acc, it) => acc + it.custoTotalPeriodo, 0);
  const totalReturnWindow = roiBatch.items.reduce((acc, it) => acc + it.retornoTotalPeriodo, 0);
  const netProfitWindow = totalReturnWindow - totalCostWindow;
  const roiWindowPercent = totalCostWindow > 0 ? (netProfitWindow / totalCostWindow) * 100 : 0;
  const multiplierWindow = totalCostWindow > 0 ? totalReturnWindow / totalCostWindow : 0;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const concursoAlvo = Number(latestDraw.concurso) + 1;
  const dataEmissao = new Date().toLocaleString('pt-BR');

  // ==========================================================
  // 1. CABEÇALHO COM BRANDING LOTOSNIPER AI PRO
  // ==========================================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(16, 185, 129); // emerald-500 accent bar
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Emblema vetorial LotoSniper (alvo concêntrico)
  const logoCx = margin + 7;
  const logoCy = 18;
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.9);
  doc.circle(logoCx, logoCy, 6, 'S');
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.setLineWidth(0.5);
  doc.circle(logoCx, logoCy, 3.2, 'S');
  doc.setFillColor(16, 185, 129);
  doc.circle(logoCx, logoCy, 1.2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('LOTOSNIPER AI PRO', margin + 17, 15);

  doc.setFontSize(9);
  doc.setTextColor(52, 211, 153);
  doc.text('RELATÓRIO EXECUTIVO DE AUDITORIA & SIMULAÇÃO ROI', margin + 17, 21.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Base Oficial: Concurso #${latestDraw.concurso} (${latestDraw.data})  |  Alvo: #${concursoAlvo}  |  Emissão: ${dataEmissao}`,
    margin + 17,
    27.5
  );

  // ==========================================================
  // 2. SEÇÃO DE DEZENAS SORTEADAS & PREMIADAS NO ÚLTIMO CONCURSO
  // ==========================================================
  let y = 41;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `1. Dezenas Sorteadas (#${latestDraw.concurso}) e Premiações Auditadas`,
    margin,
    y
  );

  y += 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const sortedOfficial = [...(latestDraw.dezenas || [])].sort((a, b) => a - b);
  const pillStartX = margin + 5;
  const pillY = y + 9;
  const pillStep = (pageWidth - margin * 2 - 10) / 15;

  sortedOfficial.forEach((num, i) => {
    const cx = pillStartX + i * pillStep + pillStep / 2;
    doc.setFillColor(16, 185, 129);
    doc.circle(cx, pillY, 4.1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(num.toString().padStart(2, '0'), cx, pillY + 1, { align: 'center' });
  });

  y += 23;

  // ==========================================================
  // 3. TABELA DE MÉTRICAS DE ROI & PERFORMANCE GLOBAL
  // ==========================================================
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `2. Tabela de Métricas de ROI (Janela de ${windowDraws.length} Concursos${
      simulationResult ? ` + ${simulationScopeLabel || 'Simulação'}` : ''
    })`,
    margin,
    y
  );

  const metricsBody: string[][] = [
    [
      'Auditoria Histórica Consolidada',
      `${sourceTickets.length} jogos`,
      formatCurrencyBRL(totalCostWindow),
      formatCurrencyBRL(totalReturnWindow),
      `${netProfitWindow >= 0 ? '+' : ''}${formatCurrencyBRL(netProfitWindow)}`,
      `${roiWindowPercent >= 0 ? '+' : ''}${roiWindowPercent.toFixed(1).replace('.', ',')}% (${multiplierWindow.toFixed(2).replace('.', ',')}x)`,
    ],
    [
      'Últimas 5 Rodadas (Curto Prazo)',
      `${sourceTickets.length} jogos`,
      formatCurrencyBRL(totalCost5),
      formatCurrencyBRL(totalReturn5),
      `${totalReturn5 - totalCost5 >= 0 ? '+' : ''}${formatCurrencyBRL(totalReturn5 - totalCost5)}`,
      `${totalCost5 > 0 ? (((totalReturn5 - totalCost5) / totalCost5) * 100).toFixed(1).replace('.', ',') : '0,0'}%`,
    ],
  ];

  if (simulationResult) {
    const simRoi =
      simulationResult.custoTotal > 0
        ? (simulationResult.saldoLiquido / simulationResult.custoTotal) * 100
        : 0;
    metricsBody.push([
      simulationScopeLabel || 'Simulação Executada',
      `${sourceTickets.length} jogos`,
      formatCurrencyBRL(simulationResult.custoTotal),
      formatCurrencyBRL(simulationResult.premioTotal),
      `${simulationResult.saldoLiquido >= 0 ? '+' : ''}${formatCurrencyBRL(simulationResult.saldoLiquido)}`,
      `${simRoi >= 0 ? '+' : ''}${simRoi.toFixed(1).replace('.', ',')}%`,
    ]);
  }

  autoTable(doc, {
    startY: y + 3,
    head: [['Escopo Auditado', 'Bilhetes', 'Custo Total', 'Retorno Bruto', 'Saldo Líquido', 'ROI / Mult.']],
    body: metricsBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' },
      4: { halign: 'right', fontStyle: 'bold' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // Tabela das últimas 5 rodadas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Evolução do Saldo Líquido (Últimas 5 Rodadas)', margin, y);

  autoTable(doc, {
    startY: y + 3,
    head: [['Concurso', 'Data', 'Premiados (11+)', 'Custo', 'Prêmios', 'Saldo Rodada', 'Saldo Acumulado']],
    body: last5Rows.map((r) => [
      r.concurso,
      r.data,
      `${r.premiados} bilhete(s)`,
      formatCurrencyBRL(r.custo),
      formatCurrencyBRL(r.premio),
      `${r.saldoRodada >= 0 ? '+' : ''}${formatCurrencyBRL(r.saldoRodada)}`,
      `${r.saldoAcumulado >= 0 ? '+' : ''}${formatCurrencyBRL(r.saldoAcumulado)}`,
    ]),
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', textColor: [5, 150, 105] },
      5: { halign: 'right', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================================
  // 4. LISTA DE BILHETES & DEZENAS PREMIADAS (CONCURSO ATUAL)
  // ==========================================================
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `3. Lista de Dezenas Premiadas no Concurso #${latestDraw.concurso} (${latestAwardedGames.length} bilhete(s) premiado(s))`,
    margin,
    y
  );

  if (latestAwardedGames.length > 0) {
    autoTable(doc, {
      startY: y + 3,
      head: [['Jogo', 'Acertos', 'Prêmio Estimado', 'Dezenas Acertadas (Premiadas)']],
      body: latestAwardedGames.slice(0, 40).map((g) => [
        `#${g.index.toString().padStart(2, '0')}`,
        `${g.hits} Pontos`,
        formatCurrencyBRL(g.prizeValue),
        g.matchedNumbers.map((n) => n.toString().padStart(2, '0')).join(' - '),
      ]),
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 24, fontStyle: 'bold', textColor: [5, 150, 105] },
        2: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
        3: { halign: 'left', fontStyle: 'bold' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Nenhum bilhete atingiu 11+ acertos no concurso #${latestDraw.concurso}. Faixas: 15pts (${latestCounts[15]}) | 14pts (${latestCounts[14]}) | 13pts (${latestCounts[13]}) | 12pts (${latestCounts[12]}) | 11pts (${latestCounts[11]}).`,
      margin,
      y
    );
    y += 8;
  }

  // ==========================================================
  // 5. GRADE COMPLETA DE RESULTADOS POR JOGO AUDITADO
  // ==========================================================
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `4. Grade de Resultados e ROI Individual por Jogo (${sourceTickets.length} jogos)`,
    margin,
    y
  );

  const resultsGridRows = sourceTickets.map((t, idx) => {
    const dez = Array.isArray(t.dezenas) ? [...t.dezenas].sort((a, b) => a - b) : [];
    const hitsLatest = countMatches(dez, latestDraw.dezenas || []);
    const audit = roiBatch.items[idx];
    return [
      `#${(t.index ?? idx + 1).toString().padStart(2, '0')}`,
      dez.map((n) => n.toString().padStart(2, '0')).join(' '),
      `${hitsLatest} pts`,
      audit ? `${audit.premiacoesNoPeriodo}/${roiBatch.windowSize}` : '0',
      audit ? formatCurrencyBRL(audit.custoTotalPeriodo) : formatCurrencyBRL(apostaMinima),
      audit ? formatCurrencyBRL(audit.retornoTotalPeriodo) : formatCurrencyBRL(0),
      audit ? `${audit.roiPercent > 0 ? '+' : ''}${audit.roiPercent.toFixed(1).replace('.', ',')}%` : '0,0%',
    ];
  });

  autoTable(doc, {
    startY: y + 3,
    head: [['Jogo', 'Dezenas do Bilhete', 'Atual', 'Prêmios', 'Custo Total', 'Retorno Hist.', 'ROI (%)']],
    body: resultsGridRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 74, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 24, textColor: [5, 150, 105] },
      6: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },
    },
    didDrawPage: () => {
      const pageNum = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'LotoSniper AI Pro • Auditoria Estatística & Backtesting ROI',
        margin,
        pageHeight - 6
      );
      doc.text(`Página ${pageNum}`, pageWidth - margin - 14, pageHeight - 6);
    },
  });

  const fileName = `lotosniper_auditoria_roi_concurso_${concursoAlvo}.pdf`;
  doc.save(fileName);
  return fileName;
}
