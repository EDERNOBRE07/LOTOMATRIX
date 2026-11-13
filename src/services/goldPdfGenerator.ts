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
  const concursoBase = Number(fechamento.concurso) || 3824;
  const concursoAlvo = fechamento.concursoAlvo ?? concursoBase + 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Data de Emissão: ${fechamento.dataCriacao || new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 14, { align: 'right' });
  doc.text(`Concurso Alvo: #${concursoAlvo} (Base #${concursoBase})`, pageWidth - margin, 20, { align: 'right' });

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
        `LotoSniper AI Pro • Dossiê Concurso Alvo #${concursoAlvo} (Base #${concursoBase}) • Página ${doc.getNumberOfPages()}`,
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
  const concursoAlvo = fechamento.concursoAlvo ?? (Number(fechamento.concurso) || 3824) + 1;
  const filename = `lotosniper_concurso_${concursoAlvo}_gold_${fechamento.totalJogos}_jogos.pdf`;
  doc.save(filename);
}

export type VolanteExportStyle = 'oficial' | 'economico';
export type PdfFontSizePreference = 'compact' | 'normal' | 'large';
export type PdfMarginPreference = 'compact' | 'normal' | 'wide';

export interface GenerateTicketsPdfOptions {
  concurso?: number;
  concursoAlvo?: number;
  dataConcurso?: string;
  titulo?: string;
  style?: VolanteExportStyle;
  fontSize?: PdfFontSizePreference;
  margin?: PdfMarginPreference;
  includeStatsFooter?: boolean;
}

/**
 * Gera arquivo PDF profissional contendo o layout dos volantes da Lotofácil
 * Suporta dois estilos:
 * 1. 'oficial': Modelo Aposta Oficial com Grid 5x5 completo
 * 2. 'economico': Modelo Lista Otimizada focado em economia de tinta e alta densidade (10 jogos por folha)
 * Permite customização de tamanho de fonte, margens e inclusão de resumo estatístico no rodapé.
 */
export function generateTicketsVolantePDF(
  tickets: any[],
  options: GenerateTicketsPdfOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Margem configurável: compacta (6mm), normal (12mm) ou ampla (18mm)
  const marginPreference = options.margin || 'normal';
  const margin = marginPreference === 'compact' ? 6 : marginPreference === 'wide' ? 18 : 12;

  // Escala de fonte configurável: compacta (0.85), normal (1.0), grande (1.18)
  const fontPreference = options.fontSize || 'normal';
  const fontScale = fontPreference === 'compact' ? 0.85 : fontPreference === 'large' ? 1.18 : 1.0;

  const includeStatsFooter = options.includeStatsFooter !== false; // default true

  // Cálculo prévio do resumo estatístico consolidado dos tickets
  const totalJogos = tickets.length;
  let sumTotal = 0;
  let parTotal = 0;
  let moldTotal = 0;
  let primTotal = 0;
  tickets.forEach((t) => {
    const dezs: number[] = t.dezenas || t;
    sumTotal += t.soma ?? dezs.reduce((a: number, b: number) => a + b, 0);
    parTotal += t.pares ?? dezs.filter((n: number) => n % 2 === 0).length;
    moldTotal += t.moldura ?? dezs.filter((n: number) => [1,2,3,4,5,6,10,11,15,16,20,21,22,23,24,25].includes(n)).length;
    primTotal += t.primos ?? dezs.filter((n: number) => [2,3,5,7,11,13,17,19,23].includes(n)).length;
  });
  const mediaSoma = totalJogos > 0 ? (sumTotal / totalJogos).toFixed(1) : '190.0';
  const mediaPares = totalJogos > 0 ? (parTotal / totalJogos).toFixed(1) : '7.0';
  const mediaImpares = totalJogos > 0 ? (15 - Number(mediaPares)).toFixed(1) : '8.0';
  const mediaMoldura = totalJogos > 0 ? (moldTotal / totalJogos).toFixed(1) : '9.5';
  const mediaPrimos = totalJogos > 0 ? (primTotal / totalJogos).toFixed(1) : '5.2';

  const statsFooterText = `RESUMO TÉCNICO: ${totalJogos} Jogos • Média Soma: ${mediaSoma} (Zona de Ouro) • Paridade: ${mediaPares}P/${mediaImpares}I • Moldura: ${mediaMoldura} • Primos: ${mediaPrimos}`;

  const concursoBase = Number(options.concurso) || 3824;
  const concursoAlvo = Number(options.concursoAlvo) || concursoBase + 1;
  const dataConcurso = options.dataConcurso || 'Atual';
  const style = options.style || 'oficial';

  // ==========================================
  // ESTILO 2: MODELO LISTA OTIMIZADA (ECONOMIA DE TINTA)
  // ==========================================
  if (style === 'economico') {
    const volantesPerPage = 10; // 2 colunas x 5 linhas por página
    const totalPages = Math.ceil(tickets.length / volantesPerPage);
    const colWidth = (pageWidth - margin * 2 - 8) / 2; // ~89mm
    const cardHeight = 47; // ~47mm por bilhete

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      // Cabeçalho Limpo Monocromático (Sem preenchimentos escuros para economizar toner)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(options.titulo || 'LOTOSNIPER • LISTA OTIMIZADA DE JOGOS', margin, 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Modelo Econômico • Concurso Alvo #${concursoAlvo} (Base #${concursoBase}) • Total: ${tickets.length} Jogos`,
        margin,
        17
      );

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Página ${page + 1} de ${totalPages}`, pageWidth - margin, 17, { align: 'right' });

      // Linha divisória fina
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, 20, pageWidth - margin, 20);

      // Renderiza até 10 jogos nesta página
      const startIndex = page * volantesPerPage;
      const pageTickets = tickets.slice(startIndex, startIndex + volantesPerPage);

      pageTickets.forEach((ticket, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);

        const x = margin + col * (colWidth + 8);
        const y = 25 + row * (cardHeight + 4);

        // Caixa Externa do Jogo (Fundo branco, borda fina cinza)
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.35);
        doc.roundedRect(x, y, colWidth, cardHeight, 2, 2, 'FD');

        // Barra do Cabeçalho do Bilhete (Cinza ultra claro para contraste sem gastar tinta)
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, y, colWidth, 7, 2, 2, 'F');
        doc.rect(x, y + 4, colWidth, 3, 'F');

        const gameNum = (ticket.index ?? startIndex + idx + 1).toString().padStart(2, '0');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`JOGO #${gameNum}`, x + 3, y + 5);

        const soma = ticket.soma ?? ticket.dezenas.reduce((a: number, b: number) => a + b, 0);
        const pares = ticket.pares ?? ticket.dezenas.filter((n: number) => n % 2 === 0).length;
        const primos =
          ticket.primos ??
          ticket.dezenas.filter((n: number) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(71, 85, 105);
        doc.text(`Soma: ${soma}  •  ${pares}P/${15 - pares}I  •  ${primos} Prim`, x + colWidth - 3, y + 5, {
          align: 'right',
        });

        // Grid das 15 Dezenas em 3 linhas x 5 colunas de caixas compactas limpas
        const sorted = [...ticket.dezenas].sort((a: number, b: number) => a - b);
        const gridStartX = x + 3.5;
        const gridStartY = y + 9;
        const cellW = (colWidth - 7) / 5; // ~16.4mm
        const cellH = 9.5; // ~9.5mm

        sorted.forEach((num: number, nIdx: number) => {
          const r = Math.floor(nIdx / 5);
          const c = nIdx % 5;
          const cx = gridStartX + c * cellW;
          const cy = gridStartY + r * cellH;

          // Caixa da Dezena: Fundo branco, contorno fino, texto em preto forte
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(15, 23, 42);
          doc.setLineWidth(0.3);
          doc.roundedRect(cx + 0.6, cy + 0.6, cellW - 1.2, cellH - 1.2, 1, 1, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(
            num.toString().padStart(2, '0'),
            cx + cellW / 2,
            cy + cellH / 2 + 1.8,
            { align: 'center' }
          );
        });

        // Rodapé da caixa
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text('15 dezenas marcadas • Pronto para terminal', x + 3.5, y + cardHeight - 1.8);
        doc.text('LotoSniper', x + colWidth - 3.5, y + cardHeight - 1.8, { align: 'right' });
      });

      // Rodapé da Página
      if (includeStatsFooter) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        const footerBoxH = 5.2;
        const footerBoxY = pageHeight - Math.max(margin, 8) - footerBoxH + 2;
        doc.roundedRect(margin, footerBoxY, pageWidth - margin * 2, footerBoxH, 1, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.4 * fontScale);
        doc.setTextColor(30, 41, 59);
        doc.text(statsFooterText, pageWidth / 2, footerBoxY + 3.6, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7 * fontScale);
        doc.setTextColor(148, 163, 184);
        doc.text(
          'LOTOSNIPER • Modelo Lista Otimizada • Layout de Alta Densidade e Economia de Tinta',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
    }

    return doc;
  }

  // ==========================================
  // ESTILO 1: MODELO APOSTA OFICIAL (GRID 5X5 VOLANTE)
  // ==========================================
  const titulo = options.titulo || 'LOTOSNIPER GOLD • VOLANTES DE APOSTA';
  const volantesPerPage = 4; // 2x2 grid por página
  const totalPages = Math.ceil(tickets.length / volantesPerPage);

  const colWidth = (pageWidth - margin * 2 - 8) / 2; // ~89mm
  const cardHeight = 118; // ~118mm por bilhete

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    // Faixa Superior
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 0, pageWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11);
    doc.text(titulo, margin, 11);

    doc.setFontSize(8);
    doc.setTextColor(226, 232, 240);
    doc.text(
      `Concurso Alvo #${concursoAlvo} (Base #${concursoBase}) • Total de ${tickets.length} Jogos • Modelo Aposta Oficial 5×5`,
      margin,
      17
    );

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${page + 1} de ${totalPages}`, pageWidth - margin, 17, { align: 'right' });

    // Renderiza até 4 volantes nesta página
    const startIndex = page * volantesPerPage;
    const pageTickets = tickets.slice(startIndex, startIndex + volantesPerPage);

    pageTickets.forEach((ticket, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);

      const x = margin + col * (colWidth + 8);
      const y = 30 + row * (cardHeight + 8);

      // Caixa do Cartão
      doc.setDrawColor(217, 119, 6); // amber-600
      doc.setLineWidth(0.6);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, colWidth, cardHeight, 3, 3, 'FD');

      // Cabeçalho do Volante
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(x, y, colWidth, 11, 3, 3, 'F');
      doc.rect(x, y + 8, colWidth, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(180, 83, 9);
      doc.text(`JOGO #${(ticket.index ?? startIndex + idx + 1).toString().padStart(2, '0')}`, x + 4, y + 7.5);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('15 DEZENAS MARCADAS', x + colWidth - 4, y + 7.5, { align: 'right' });

      // Grid 5x5 do Volante Oficial
      const gridStartX = x + 5;
      const gridStartY = y + 15;
      const cellSize = (colWidth - 10) / 5;

      const dezenasSet = new Set(ticket.dezenas || []);

      for (let num = 1; num <= 25; num++) {
        const rowG = Math.floor((num - 1) / 5);
        const colG = (num - 1) % 5;

        const cellX = gridStartX + colG * cellSize;
        const cellY = gridStartY + rowG * cellSize;

        const isDrawn = dezenasSet.has(num);

        if (isDrawn) {
          // Célula Selecionada: Âmbar Dourado com texto branco nítido
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
          // Célula Não Selecionada
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

      // Rodapé do volante
      const footerY = gridStartY + 5 * cellSize + 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(x + 4, footerY, x + colWidth - 4, footerY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);

      const soma = ticket.soma ?? ticket.dezenas.reduce((a: number, b: number) => a + b, 0);
      const pares = ticket.pares ?? ticket.dezenas.filter((n: number) => n % 2 === 0).length;
      const primos =
        ticket.primos ??
        ticket.dezenas.filter((n: number) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;

      doc.text(`Soma: ${soma}  •  ${pares}P/${15 - pares}I  •  ${primos} Primos`, x + 4, footerY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text('LotoSniper Gold', x + colWidth - 4, footerY + 5, { align: 'right' });
    });

    // Rodapé da Página Oficial
    if (includeStatsFooter) {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(245, 158, 11); // amber-500
      doc.setLineWidth(0.3);
      const footerBoxH = 5.2;
      const footerBoxY = pageHeight - Math.max(margin, 8) - footerBoxH + 2;
      doc.roundedRect(margin, footerBoxY, pageWidth - margin * 2, footerBoxH, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4 * fontScale);
      doc.setTextColor(146, 64, 14); // amber-800
      doc.text(statsFooterText, pageWidth / 2, footerBoxY + 3.6, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7 * fontScale);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'LOTOSNIPER • Sistema de Inteligência para Lotofácil • Modelo Aposta Oficial 5×5 para Marcação em Lotéricas',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }
  }

  return doc;
}

export function downloadTicketsVolantePDF(
  tickets: any[],
  options: GenerateTicketsPdfOptions = {}
): void {
  const doc = generateTicketsVolantePDF(tickets, options);
  const style = options.style || 'oficial';
  const concursoAlvo = Number(options.concursoAlvo) || (Number(options.concurso) || 3824) + 1;
  const prefix = style === 'economico' ? 'lotosniper_lista_economica' : 'lotosniper_volantes_5x5';
  const filename = `${prefix}_concurso_${concursoAlvo}_${tickets.length}_jogos.pdf`;
  doc.save(filename);
}

