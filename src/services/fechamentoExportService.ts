/**
 * Serviço de Exportação de Fechamentos para PDF e CSV Formato Oficial
 * Permite ao usuário imprimir seus jogos formatados para conferência / lotérica ou importar em planilhas / softwares externos.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GameTicket, LotofacilDraw, FilterCriteria } from '../types/lotofacil';
import { VALOR_APOSTA_LOTOFACIL } from './combinatorics';
import { PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import { FechamentoExportMeta } from './txtExportFormatter';

export interface FechamentoExportOptions {
  tickets: GameTicket[];
  latestDraw: LotofacilDraw;
  meta?: FechamentoExportMeta | null;
}

/**
 * Exporta a lista de jogos para um arquivo PDF com formatação profissional (A4, tabelas estilizadas e cabeçalho executivo).
 */
export function exportFechamentoToPdf({
  tickets,
  latestDraw,
  meta,
}: FechamentoExportOptions): void {
  if (!tickets || tickets.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const concurso = meta?.concurso || latestDraw.concurso;
  const dataConcurso = meta?.dataConcurso || latestDraw.data || new Date().toLocaleDateString('pt-BR');
  const strategyName = meta?.strategyName || '⚡ Fechamento Otimizado para 14 Pontos';
  const garantia = meta?.garantia || 'Garantia de 14 Pontos';
  const totalJogos = tickets.length;
  const custoTotal = totalJogos * VALOR_APOSTA_LOTOFACIL;

  const selectedNumbers =
    meta?.selectedNumbers && meta.selectedNumbers.length > 0
      ? meta.selectedNumbers
      : Array.from(new Set(tickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);

  const fixedNumbers = meta?.fixedNumbers || [];
  const excludedNumbers = meta?.excludedNumbers || [];

  // 1. CABEÇALHO ELEGANTE (DARK SLATE & EMERALD ACCENTS)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Faixa de destaque dourada / esmeralda no topo
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 3, 'F');

  // Título e Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('LOTOSNIPER', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('PRECISÃO CIRÚRGICA MATEMÁTICA • LOTOFÁCIL CAIXA', 14, 22);

  // Badge de Garantia / Status
  doc.setFillColor(6, 78, 59); // emerald-900
  doc.roundedRect(pageWidth - 68, 10, 54, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`GARANTIA: ${garantia.toUpperCase()}`, pageWidth - 41, 15.5, { align: 'center' });

  // Metadados do Concurso na barra superior
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Concurso Base: #${concurso} (${dataConcurso})`, 14, 32);
  doc.text(`Total: ${totalJogos} Jogos | Investimento: R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 14, 32, { align: 'right' });

  // 2. CARD RESUMO ESTRATÉGICO
  let startY = 44;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(14, startY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('PARÂMETROS DA MATRIZ:', 18, startY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`• Estratégia: ${strategyName}`, 18, startY + 11);
  doc.text(
    `• Universo (${selectedNumbers.length} Dezenas): ${selectedNumbers.map((n) => n.toString().padStart(2, '0')).join(' ')}`,
    18,
    startY + 16
  );

  const fixStr = fixedNumbers.length > 0 ? fixedNumbers.map((n) => n.toString().padStart(2, '0')).join(', ') : 'Nenhuma';
  const excStr = excludedNumbers.length > 0 ? excludedNumbers.map((n) => n.toString().padStart(2, '0')).join(', ') : 'Nenhuma';
  doc.text(`• Fixas: ${fixStr} | Excluídas: ${excStr}`, 18, startY + 20);

  // 3. TABELA DOS JOGOS FORMATADOS (jspdf-autotable)
  const previousDrawDezenas = latestDraw?.dezenas || [];

  const tableBody = tickets.map((t) => {
    const pares = t.pares ?? t.dezenas.filter((n) => n % 2 === 0).length;
    const impares = 15 - pares;
    const primos = t.primos ?? t.dezenas.filter((n) => PRIMOS.includes(n)).length;
    const soma = t.soma ?? t.dezenas.reduce((acc, curr) => acc + curr, 0);
    const moldura = t.moldura ?? t.dezenas.filter((n) => MOLDURA.includes(n)).length;
    const repetidas = t.repetidas ?? (previousDrawDezenas.length > 0 ? t.dezenas.filter((n) => previousDrawDezenas.includes(n)).length : '-');

    const formattedNumbers = t.dezenas.map((n) => n.toString().padStart(2, '0')).join('  ');

    return [
      `#${t.index.toString().padStart(2, '0')}`,
      formattedNumbers,
      soma.toString(),
      `${pares}P / ${impares}I`,
      primos.toString(),
      moldura.toString(),
      repetidas.toString(),
    ];
  });

  autoTable(doc, {
    startY: startY + 26,
    head: [
      [
        'Jogo',
        'Dezenas Escolhidas para Aposta (15 Números)',
        'Soma',
        'Paridade',
        'Primos',
        'Moldura',
        'Repet.',
      ],
    ],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [248, 250, 252],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      halign: 'center',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 14, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'left', fontStyle: 'bold', font: 'courier' },
      2: { cellWidth: 16 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { cellWidth: 16 },
      6: { cellWidth: 15 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Rodapé da página
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `LotoSniper © 2026 • Gerado em ${new Date().toLocaleString('pt-BR')} • Página ${data.pageNumber}`,
        14,
        pageHeight - 8
      );
      doc.text('Pronto para marcação nos volantes oficiais da Caixa', pageWidth - 14, pageHeight - 8, {
        align: 'right',
      });
    },
  });

  // Salva e aciona download automático no browser
  const filename = `lotosniper_fechamento_concurso_${concurso}_${totalJogos}_jogos.pdf`;
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

  const concurso = meta?.concurso || latestDraw.concurso;
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
  link.download = `lotosniper_fechamento_concurso_${concurso}_${tickets.length}_jogos.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
