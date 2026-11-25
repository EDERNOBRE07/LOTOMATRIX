/**
 * Serviço de Exportação de Fechamentos para PDF e CSV Formato Oficial
 * Permite ao usuário imprimir seus jogos formatados para conferência / lotérica ou importar em planilhas / softwares externos.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GameTicket, LotofacilDraw, FilterCriteria } from '../types/lotofacil';
import { VALOR_APOSTA_LOTOFACIL } from './combinatorics';
import { CONCURSO_ATUAL, PRIMOS, MOLDURA, FIBONACCI, CRUZ_DEZENAS } from '../data/lotofacilData';
import { FechamentoExportMeta } from './txtExportFormatter';


export interface FechamentoExportOptions {
  tickets: GameTicket[];
  latestDraw: LotofacilDraw;
  meta?: FechamentoExportMeta | null;
  filters?: FilterCriteria;
}

/**
 * Exporta a lista de jogos para um arquivo PDF com formatação profissional para impressão
 * (A4, cabeçalho Dark/Gold LotoSniper AI Pro, telemetria completa de filtros, classificação Zona de Ouro e paginação X/Y).
 */
export function exportFechamentoToPdf({
  tickets,
  latestDraw,
  meta,
  filters,
}: FechamentoExportOptions): void {
  if (!tickets || tickets.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const concursoBase = Number(meta?.concurso || latestDraw.concurso) || CONCURSO_ATUAL.concurso;
  const concursoAlvo = Number(meta?.concursoAlvo) || concursoBase + 1;
  const dataConcurso = meta?.dataConcurso || latestDraw.data || new Date().toLocaleDateString('pt-BR');
  const strategyName = meta?.strategyName || 'Fechamento Otimizado para 14 Pontos';
  const garantia = meta?.garantia || 'Garantia de 14 Pontos';
  const totalJogos = tickets.length;
  const custoTotal = totalJogos * VALOR_APOSTA_LOTOFACIL;

  const selectedNumbers =
    meta?.selectedNumbers && meta.selectedNumbers.length > 0
      ? meta.selectedNumbers
      : Array.from(new Set(tickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);

  const fixedNumbers = meta?.fixedNumbers || filters?.dezenasFixas || [];
  const excludedNumbers = meta?.excludedNumbers || filters?.dezenasExcluidas || [];

  const goldenCount = tickets.filter((t) => {
    const s = t.soma ?? t.dezenas.reduce((acc, c) => acc + c, 0);
    return s >= 180 && s <= 215;
  }).length;
  const avgSoma = Math.round(
    tickets.reduce((acc, t) => acc + (t.soma ?? t.dezenas.reduce((a, b) => a + b, 0)), 0) /
      Math.max(1, tickets.length)
  );

  // 1. CABEÇALHO EXECUTIVO PARA IMPRESSÃO (DARK OBSIDIAN & GOLD ACCENTS)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Faixa de destaque Dourada Imperial no topo
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Título e Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('LOTOSNIPER AI PRO', 14, 15.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('RELATÓRIO TÉCNICO PARA IMPRESSÃO • FECHAMENTO OTIMIZADO LOTOFÁCIL', 14, 21.5);

  // Badge de Garantia / Status
  doc.setFillColor(120, 53, 15); // amber-900
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(pageWidth - 72, 9.5, 58, 9, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(253, 224, 71); // yellow-300
  doc.text(`GARANTIA: ${garantia.toUpperCase()}`, pageWidth - 43, 15.2, { align: 'center' });

  // Metadados do Concurso na barra superior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Concurso Alvo: #${concursoAlvo} (Base Caixa: #${concursoBase} • ${dataConcurso})`, 14, 32.5);
  doc.text(
    `Total: ${totalJogos} Jogos | Investimento: R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    pageWidth - 14,
    32.5,
    { align: 'right' }
  );

  // 2. CARD RESUMO ESTRATÉGICO & TELEMETRIA DE FILTROS
  const startY = 45;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, startY, pageWidth - 28, 30, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('PARÂMETROS DA MATRIZ & FILTROS APLICADOS:', 18, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Estratégia: ${strategyName} | Soma Média: ${avgSoma} (${goldenCount}/${totalJogos} na Zona Central 180–215)`, 18, startY + 11.5);
  doc.text(
    `• Universo (${selectedNumbers.length} Dezenas): ${selectedNumbers.map((n) => n.toString().padStart(2, '0')).join(' ')}`,
    18,
    startY + 16.5
  );

  const fixStr = fixedNumbers.length > 0 ? fixedNumbers.map((n) => n.toString().padStart(2, '0')).join(', ') : 'Nenhuma';
  const excStr = excludedNumbers.length > 0 ? excludedNumbers.map((n) => n.toString().padStart(2, '0')).join(', ') : 'Nenhuma';
  doc.text(`• Fixas: ${fixStr} | Excluídas: ${excStr}`, 18, startY + 21.5);

  const filterSummary = filters
    ? `• Filtros: Soma ${filters.somaMin}–${filters.somaMax} | ${filters.paresMin}–${filters.paresMax}P | Moldura ${filters.molduraMin}–${filters.molduraMax} | Repetidas ${filters.repetidasMin}–${filters.repetidasMax}${
        filters.hammingDinamicoAtivo ? ` | Hamming ≥ ${filters.hammingMinimoPersonalizado ?? 3}` : ''
      }`
    : '• Filtros: Equilíbrio Canônico LotoSniper AI Pro (Poda Bitwise & Anti-Cisne Negro)';
  doc.text(filterSummary, 18, startY + 26.5);

  // 3. TABELA DOS JOGOS FORMATADOS PARA IMPRESSÃO (jspdf-autotable)
  const previousDrawDezenas = latestDraw?.dezenas || [];

  const tableBody = tickets.map((t) => {
    const pares = t.pares ?? t.dezenas.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const primos = t.primos ?? t.dezenas.filter((n) => PRIMOS.includes(n)).length;
    const soma = t.soma ?? t.dezenas.reduce((acc, curr) => acc + curr, 0);
    const moldura = t.moldura ?? t.dezenas.filter((n) => MOLDURA.includes(n)).length;
    const cruz = t.cruz ?? t.dezenas.filter((n) => CRUZ_DEZENAS.includes(n)).length;
    const repetidas = t.repetidas ?? (previousDrawDezenas.length > 0 ? t.dezenas.filter((n) => previousDrawDezenas.includes(n)).length : '-');
    const faixaTag =
      soma >= 190 && soma <= 210
        ? 'Ouro'
        : soma >= 180 && soma <= 215
        ? 'Central'
        : soma > 215
        ? 'C.Alta'
        : 'C.Baixa';

    const formattedNumbers = t.dezenas.map((n) => n.toString().padStart(2, '0')).join('  ');

    return [
      `#${t.index.toString().padStart(2, '0')}`,
      formattedNumbers,
      soma.toString(),
      faixaTag,
      `${pares}P/${impares}I`,
      primos.toString(),
      moldura.toString(),
      cruz.toString(),
      repetidas.toString(),
    ];
  });

  autoTable(doc, {
    startY: startY + 34,
    head: [
      [
        'Jogo',
        'Dezenas Escolhidas para Aposta (15 Números)',
        'Soma',
        'Zona',
        'Parid.',
        'Prim.',
        'Mold.',
        'Cruz',
        'Rep.',
      ],
    ],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [251, 191, 36],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [51, 65, 85],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      halign: 'center',
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    columnStyles: {
      0: { cellWidth: 12, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold', font: 'courier' },
      2: { cellWidth: 12, fontStyle: 'bold' },
      3: { cellWidth: 14 },
      4: { cellWidth: 15 },
      5: { cellWidth: 11 },
      6: { cellWidth: 11 },
      7: { cellWidth: 11 },
      8: { cellWidth: 11 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        if (hookData.cell.raw === 'Ouro') {
          hookData.cell.styles.textColor = [180, 83, 9];
          hookData.cell.styles.fontStyle = 'bold';
        } else if (hookData.cell.raw === 'Central') {
          hookData.cell.styles.textColor = [5, 150, 105];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `LotoSniper AI Pro • Gerado em ${new Date().toLocaleString('pt-BR')} • Página ${p} de ${totalPages}`,
      14,
      pageHeight - 7.5
    );
    doc.text('Layout Otimizado para Impressão A4 e Conferência Caixa', pageWidth - 14, pageHeight - 7.5, {
      align: 'right',
    });
  }

  // Salva e aciona download automático no browser
  const filename = `lotosniper_concurso_${concursoAlvo}_${totalJogos}_jogos.pdf`;
  doc.save(filename);
}

/**
 * Exporta a lista de jogos para arquivo CSV delimitado por ponto e vírgula com BOM UTF-8
 * para compatibilidade direta com Excel, Google Sheets, LibreOffice e softwares lotéricos.
 */
export function exportFechamentoToCsv({
  tickets,
  latestDraw,
  meta,
}: FechamentoExportOptions): void {
  if (!tickets || tickets.length === 0) return;

  const concursoBase = Number(meta?.concurso || latestDraw.concurso) || CONCURSO_ATUAL.concurso;
  const concursoAlvo = Number(meta?.concursoAlvo) || concursoBase + 1;
  const previousDrawDezenas = latestDraw?.dezenas || [];

  const headers = [
    'Jogo',
    'D01',
    'D02',
    'D03',
    'D04',
    'D05',
    'D06',
    'D07',
    'D08',
    'D09',
    'D10',
    'D11',
    'D12',
    'D13',
    'D14',
    'D15',
    'Soma',
    'Pares',
    'Impares',
    'Primos',
    'Moldura',
    'Fibonacci',
    'Repetidas',
  ];

  const rows: string[] = [];
  rows.push(headers.join(';'));

  tickets.forEach((t) => {
    const pares = t.pares ?? t.dezenas.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const primos = t.primos ?? t.dezenas.filter((n) => PRIMOS.includes(n)).length;
    const soma = t.soma ?? t.dezenas.reduce((acc, curr) => acc + curr, 0);
    const moldura = t.moldura ?? t.dezenas.filter((n) => MOLDURA.includes(n)).length;
    const fibonacci = t.fibonacci ?? t.dezenas.filter((n) => FIBONACCI.includes(n)).length;
    const repetidas = previousDrawDezenas.length > 0 ? t.dezenas.filter((n) => previousDrawDezenas.includes(n)).length : 0;

    const row = [
      `Jogo ${t.index.toString().padStart(2, '0')}`,
      ...t.dezenas.map((n) => n.toString().padStart(2, '0')),
      soma.toString(),
      pares.toString(),
      impares.toString(),
      primos.toString(),
      moldura.toString(),
      fibonacci.toString(),
      repetidas.toString(),
    ];

    rows.push(row.join(';'));
  });

  // Prefixa com BOM UTF-8 (\uFEFF) para garantir acentuação perfeita no Microsoft Excel
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lotosniper_concurso_${concursoAlvo}_${tickets.length}_jogos.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
