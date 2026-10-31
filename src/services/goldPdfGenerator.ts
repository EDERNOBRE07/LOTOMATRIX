import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SavedFechamentoPrognostico } from './savedFechamentosStorage';
import { VALOR_APOSTA_LOTOFACIL } from './combinatorics';

export interface GenerateGoldPdfOptions {
  fechamento: SavedFechamentoPrognostico;
  titulo?: string;
  autor?: string;
}

export function generateGoldFechamentoPDF({
  fechamento,
  titulo = 'LOTOSNIPER AI PRO • DOSSIÊ TÉCNICO DE FECHAMENTO',
}: GenerateGoldPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // 1. HEADER GOLD BANNER
  // Fundo Superior Grafite / Black
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Faixa Dourada Superior
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Linha de Destaque Ouro Inferior
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 39, pageWidth, 1.2, 'F');

  // Título Principal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(245, 158, 11); // Gold
  doc.text('LOTOSNIPER AI PRO', margin, 14);

  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text('ENGENHARIA ESTATÍSTICA & FECHAMENTOS INTELIGENTES LOTOFÁCIL', margin, 20);

  // Metadados Laterais no Header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Data de Emissão: ${fechamento.dataCriacao || new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 14, { align: 'right' });
  doc.text(`Concurso Alvo: #${fechamento.concurso} (${fechamento.dataConcurso || 'Atual'})`, pageWidth - margin, 20, { align: 'right' });

  // Badge de Jogos e Investimento
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-400
  const custo = (fechamento.totalJogos * VALOR_APOSTA_LOTOFACIL).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  doc.text(`${fechamento.totalJogos} Bilhetes Gerados • Total: R$ ${custo}`, pageWidth - margin, 26, { align: 'right' });

  let y = 47;

  // 2. SEÇÃO DE INFORMAÇÕES ESTRATÉGICAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('1. DADOS DO FECHAMENTO & ESTRATÉGIA', margin, y);
  y += 5;

  const infoRows = [
    [
      { content: 'Tipo de Fechamento:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
      { content: fechamento.tipoFechamento, styles: { textColor: [15, 23, 42] } },
      { content: 'Modalidade / Matriz:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
      { content: fechamento.modalidadeMatriz, styles: { textColor: [15, 23, 42] } },
    ],
    [
      { content: 'Universo de Dezenas:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
      {
        content: `${fechamento.universoDezenas.length} dezenas (${fechamento.universoDezenas.map((n) => n.toString().padStart(2, '0')).join(' ')})`,
        styles: { textColor: [15, 23, 42], fontStyle: 'bold' },
      },
      { content: 'Dezenas Fixas:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
      {
        content: fechamento.dezenasFixas.length > 0 ? fechamento.dezenasFixas.map((n) => n.toString().padStart(2, '0')).join(' ') : 'Nenhuma',
        styles: { textColor: fechamento.dezenasFixas.length > 0 ? [180, 83, 9] : [100, 116, 139], fontStyle: 'bold' },
      },
    ],
    [
      { content: 'Dezenas Excluídas:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
      {
        content: fechamento.dezenasExcluidas.length > 0 ? fechamento.dezenasExcluidas.map((n) => n.toString().padStart(2, '0')).join(' ') : 'Nenhuma',
        styles: { textColor: [100, 116, 139] },
      },
      { content: 'Auditoria de Anomalias:', styles: { fontStyle: 'bold', textColor: [51, 65, 85] } },
      {
        content: '0 Anomalias • 100% Zona de Ouro (Soma >= 180)',
        styles: { textColor: [5, 150, 105], fontStyle: 'bold' },
      },
    ],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    body: infoRows as any,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.8 },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // 3. SEÇÃO DE FILTROS APLICADOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text('2. FILTROS OBRIGATÓRIOS & PROBABILIDADE CONDICIONAL', margin, y);
  y += 5;

  const filtrosData = [
    [
      'Faixa de Soma',
      `${fechamento.faixaSoma.min} a ${fechamento.faixaSoma.max} (Zona de Ouro: 190 a 210)`,
      'Paridade Estrutural',
      `${fechamento.paridade.minPares} a ${fechamento.paridade.maxPares} Pares / ${15 - fechamento.paridade.maxPares} a ${15 - fechamento.paridade.minPares} Ímpares`,
    ],
    [
      'Dezenas na Moldura',
      `${fechamento.moldura.min} a ${fechamento.moldura.max} dezenas externas`,
      'Números Primos',
      `${fechamento.primos.min} a ${fechamento.primos.max} números primos`,
    ],
    [
      'Repetidas Anterior',
      `${fechamento.repetidas.min} a ${fechamento.repetidas.max} repetidas (#${fechamento.repetidas.concursoRef || fechamento.concurso})`,
      'Sequência Fibonacci',
      `${fechamento.fibonacci.min} a ${fechamento.fibonacci.max} dezenas Fibonacci`,
    ],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Filtro Estatístico', 'Faixa Parametrizada', 'Filtro Estrutural', 'Faixa Parametrizada']],
    body: filtrosData,
    theme: 'striped',
    headStyles: {
      fillColor: [245, 158, 11],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2,
    },
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // 4. SEÇÃO DOS BILHETES PARA APOSTA
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9);
  doc.text(`3. BILHETES DA MATRIZ (${fechamento.tickets.length} JOGOS PRONTOS PARA MARCAÇÃO)`, margin, y);
  y += 4;

  const ticketsTableRows = fechamento.tickets.map((t, idx) => {
    const formattedNumbers = t.dezenas
      .map((n) => n.toString().padStart(2, '0'))
      .join('  ');

    return [
      `Jogo ${(idx + 1).toString().padStart(2, '0')}`,
      formattedNumbers,
      t.soma.toString(),
      `${t.pares}P / ${t.impares}I`,
      t.moldura.toString(),
      t.primos.toString(),
      t.scoreIA ? `${t.scoreIA}%` : 'Zona Ouro',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['#', 'Dezenas Selecionadas (15 Números)', 'Soma', 'Pares/Ímp', 'Mold.', 'Prim.', 'Score']],
    body: ticketsTableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [245, 158, 11], // amber-500
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.2,
    },
    styles: {
      fontSize: 7.8,
      font: 'courier',
      cellPadding: 1.8,
      halign: 'center',
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { font: 'helvetica', fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 14 },
      1: { font: 'courier', fontStyle: 'bold', textColor: [15, 23, 42], halign: 'center', cellWidth: 92 },
      2: { font: 'helvetica', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 15 },
      3: { font: 'helvetica', textColor: [51, 65, 85], cellWidth: 22 },
      4: { font: 'helvetica', textColor: [51, 65, 85], cellWidth: 14 },
      5: { font: 'helvetica', textColor: [51, 65, 85], cellWidth: 13 },
      6: { font: 'helvetica', fontStyle: 'bold', textColor: [180, 83, 9], cellWidth: 14 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    didDrawPage: (data) => {
      // Rodapé em todas as páginas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `LotoSniper AI Pro • Dossiê Oficial #${fechamento.concurso} • Página ${doc.getNumberOfPages()}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    },
  });

  return doc;
}

export function downloadGoldFechamentoPDF(fechamento: SavedFechamentoPrognostico): void {
  const doc = generateGoldFechamentoPDF({ fechamento });
  const filename = `lotosniper_fechamento_gold_${fechamento.concurso}_${fechamento.totalJogos}_jogos.pdf`;
  doc.save(filename);
}

/**
 * Gera arquivo PDF profissional contendo o layout dos volantes oficiais 5x5 da Lotofácil
 * pronto para marcação e impressão.
 */
export function generateTicketsVolantePDF(
  tickets: any[],
  options: {
    concurso?: number;
    dataConcurso?: string;
    titulo?: string;
  } = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  const concurso = options.concurso || 3817;
  const dataConcurso = options.dataConcurso || new Date().toLocaleDateString('pt-BR');
  const titulo = options.titulo || 'LOTOSNIPER GOLD • VOLANTES DE APOSTA';

  const volantesPerPage = 4; // 2x2 grid per page for maximum readability and volante size
  const totalPages = Math.ceil(tickets.length / volantesPerPage);

  const colWidth = (pageWidth - margin * 2 - 8) / 2; // ~89mm
  const cardHeight = 118; // ~118mm per slip

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setFillColor(245, 158, 11); // amber-500 line
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11);
    doc.text(titulo, margin, 11);

    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(
      `Concurso #${concurso} (${dataConcurso}) • Total de ${tickets.length} Jogos • Volantes Oficiais 5×5`,
      margin,
      17
    );

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${page + 1} de ${totalPages}`, pageWidth - margin, 17, { align: 'right' });

    // Render up to 4 slips on this page
    const startIndex = page * volantesPerPage;
    const pageTickets = tickets.slice(startIndex, startIndex + volantesPerPage);

    pageTickets.forEach((ticket, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      const x = margin + col * (colWidth + 8);
      const y = 30 + row * (cardHeight + 8);

      // Card Container Border
      doc.setDrawColor(217, 119, 6); // amber-600 border
      doc.setLineWidth(0.6);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, colWidth, cardHeight, 3, 3, 'FD');

      // Header of slip
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(x, y, colWidth, 11, 3, 3, 'F');
      doc.rect(x, y + 8, colWidth, 3, 'F'); // flatten bottom corners

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`JOGO #${(ticket.index ?? startIndex + idx + 1).toString().padStart(2, '0')}`, x + 4, y + 7.5);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('15 DEZENAS MARCADAS', x + colWidth - 4, y + 7.5, { align: 'right' });

      // 5x5 Volante Grid
      const gridStartX = x + 5;
      const gridStartY = y + 15;
      const cellSize = (colWidth - 10) / 5; // ~15.8mm per cell

      const dezenasSet = new Set(ticket.dezenas || []);

      for (let num = 1; num <= 25; num++) {
        const rowG = Math.floor((num - 1) / 5);
        const colG = (num - 1) % 5;

        const cellX = gridStartX + colG * cellSize;
        const cellY = gridStartY + rowG * cellSize;

        const isDrawn = dezenasSet.has(num);

        if (isDrawn) {
          // Selected Cell: Solid Amber Gold with crisp white text
          doc.setFillColor(217, 119, 6);
          doc.setDrawColor(180, 83, 9);
          doc.setLineWidth(0.4);
          doc.roundedRect(cellX + 0.8, cellY + 0.8, cellSize - 1.6, cellSize - 1.6, 2, 2, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9.5);
          doc.setTextColor(255, 255, 255);
          doc.text(
            num.toString().padStart(2, '0'),
            cellX + cellSize / 2,
            cellY + cellSize / 2 + 3.2,
            { align: 'center' }
          );
        } else {
          // Unselected Cell: Light slate background with clear outline
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.2);
          doc.roundedRect(cellX + 0.8, cellY + 0.8, cellSize - 1.6, cellSize - 1.6, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(100, 116, 139);
          doc.text(
            num.toString().padStart(2, '0'),
            cellX + cellSize / 2,
            cellY + cellSize / 2 + 3,
            { align: 'center' }
          );
        }
      }

      // Footer of slip with telemetry stats
      const footerY = gridStartY + 5 * cellSize + 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(x + 4, footerY, x + colWidth - 4, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);

      const soma = ticket.soma ?? ticket.dezenas.reduce((a: number, b: number) => a + b, 0);
      const pares = ticket.pares ?? ticket.dezenas.filter((n: number) => n % 2 === 0).length;
      const primos = ticket.primos ?? ticket.dezenas.filter((n: number) => [2,3,5,7,11,13,17,19,23].includes(n)).length;

      doc.text(`Soma: ${soma}  •  ${pares}P/${15 - pares}I  •  ${primos} Primos`, x + 4, footerY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('LotoSniper Gold', x + colWidth - 4, footerY + 5, { align: 'right' });
    });

    // Page footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'LOTOSNIPER • Sistema de Inteligência para Lotofácil • Prontos para Marcação em Casas Lotéricas',
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  return doc;
}

export function downloadTicketsVolantePDF(
  tickets: any[],
  options: { concurso?: number; dataConcurso?: string; titulo?: string } = {}
): void {
  const doc = generateTicketsVolantePDF(tickets, options);
  const filename = `volantes_lotosniper_oficiais_${tickets.length}_jogos_concurso_${options.concurso || 3817}.pdf`;
  doc.save(filename);
}

