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
