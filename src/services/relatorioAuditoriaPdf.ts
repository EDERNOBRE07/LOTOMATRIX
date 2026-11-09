import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HistogramaAcertos, IndicadorGarantiaPayload } from './tabelasCoberturaLJCR';

export interface RelatorioAuditoriaPdfParams {
  totalDezenas?: number;
  dezenasSelecionadas?: number[];
  garantiaAlvo?: string;
  jogosOriginais?: number;
  jogosFiltrados?: number;
  taxaGarantiaEfetiva?: number;
  totalCenarios?: number;
  histograma?: HistogramaAcertos;
  concursoBase?: number | null;
  dataConcurso?: string | null;
  indicador?: IndicadorGarantiaPayload;
  fechamentoNome?: string;
  ticketsCount?: number;
  selectedNumbers?: number[];
  filters?: any;
  tickets?: any;
}

export function gerarRelatorioAuditoriaPDF(params: RelatorioAuditoriaPdfParams): void {
  const dezenasSelecionadas = params.dezenasSelecionadas || params.selectedNumbers || [];
  const totalDezenas = params.totalDezenas ?? dezenasSelecionadas.length;
  const indicador = params.indicador;
  const garantiaAlvo = params.garantiaAlvo || indicador?.garantiaAlvo || '14 se 15';
  const jogosOriginais = params.jogosOriginais ?? (indicador ? indicador.matrizOriginalQtd : 0);
  const jogosFiltrados = params.jogosFiltrados ?? (indicador ? indicador.matrizFiltradaQtd : (params.ticketsCount || 0));
  const taxaGarantiaEfetiva = params.taxaGarantiaEfetiva ?? (indicador ? indicador.garantiaEfetiva : 0);
  const totalCenarios = params.totalCenarios ?? (indicador?.totalCenarios || 0);
  const histograma: HistogramaAcertos = params.histograma || indicador?.histograma || {
    15: 0,
    14: 0,
    13: 0,
    12: 0,
    11: 0,
    abaixo11: 0,
  };
  const concursoBase = params.concursoBase ?? null;
  const dataConcurso = params.dataConcurso ?? null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentColor: [number, number, number] = [14, 165, 233]; // Sky 500

  // 1. Cabeçalho Executivo
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('LOTOSNIPER | RELATÓRIO DE AUDITORIA COMBINATÓRIA', 14, 15);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 140, 15);

  // 2. Sumário da Estrutura
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('1. Resumo do Fechamento', 14, 34);

  const dezenasFormatadas = dezenasSelecionadas
    .map((d) => String(d).padStart(2, '0'))
    .join(' - ');

  const economiaPercent =
    jogosOriginais > 0
      ? ((1 - jogosFiltrados / jogosOriginais) * 100).toFixed(1)
      : '0.0';

  const resumoData = [
    ['Dezenas Selecionadas', `${totalDezenas} dezenas (${dezenasFormatadas})`],
    ['Garantia Teórica Canônica', `${garantiaAlvo} se acertar 15`],
    [
      'Concurso Base de Referência',
      concursoBase
        ? `#${concursoBase}${dataConcurso ? ` (${dataConcurso})` : ''}`
        : 'Não informado',
    ],
    ['Total de Jogos Canônicos (LJCR)', `${jogosOriginais} cartões`],
    [
      'Jogos Aprovados pelos Filtros',
      `${jogosFiltrados} cartões (Economia de ${economiaPercent}%)`,
    ],
    [
      'Investimento Estimado (R$ 3,50)',
      `R$ ${(jogosFiltrados * 3.5).toFixed(2).replace('.', ',')}`,
    ],
  ];

  autoTable(doc, {
    startY: 38,
    head: [['Parâmetro', 'Configuração']],
    body: resumoData,
    theme: 'grid',
    headStyles: { fillColor: accentColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });

  // 3. Auditoria Matemática C(V, 15)
  const yAudit = ((doc as any).lastAutoTable?.finalY ?? 95) + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('2. Cobertura Matemática Efetiva C(V, 15)', 14, yAudit);

  const statusGarantia =
    taxaGarantiaEfetiva >= 95
      ? 'COBERTURA EXCELENTE (>= 95%)'
      : taxaGarantiaEfetiva >= 80
      ? 'COBERTURA MODERADA (>= 80%)'
      : 'COBERTURA RESTRITA (< 80%)';

  const auditData = [
    ['Total de Cenários Avaliados C(V, 15)', totalCenarios.toLocaleString('pt-BR')],
    ['Taxa de Garantia Efetiva Calculada', `${taxaGarantiaEfetiva.toFixed(2)}%`],
    ['Status de Integridade Matemática', statusGarantia],
  ];

  autoTable(doc, {
    startY: yAudit + 4,
    body: auditData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 85 } },
  });

  // 4. Histograma de Distribuição de Acertos Teóricos
  const yHisto = ((doc as any).lastAutoTable?.finalY ?? 135) + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('3. Distribuição de Acertos Máximos por Cenário', 14, yHisto);

  const getPercent = (v: number) =>
    totalCenarios > 0 ? `${((v / totalCenarios) * 100).toFixed(2)}%` : '0.00%';

  const histoData = [
    ['15 Pontos', histograma[15].toLocaleString('pt-BR'), getPercent(histograma[15])],
    ['14 Pontos', histograma[14].toLocaleString('pt-BR'), getPercent(histograma[14])],
    ['13 Pontos', histograma[13].toLocaleString('pt-BR'), getPercent(histograma[13])],
    ['12 Pontos', histograma[12].toLocaleString('pt-BR'), getPercent(histograma[12])],
    ['11 Pontos', histograma[11].toLocaleString('pt-BR'), getPercent(histograma[11])],
    ['Abaixo de 11 Pontos', histograma.abaixo11.toLocaleString('pt-BR'), getPercent(histograma.abaixo11)],
  ];

  autoTable(doc, {
    startY: yHisto + 4,
    head: [['Faixa de Premiação', 'Cenários Cobertos', 'Probabilidade Condicional']],
    body: histoData,
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  // Rodapé Técnico
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Documento de auditoria gerado pelo algoritmo determinístico LotoSniper. Base canônica LJCR.',
      14,
      288
    );
    doc.text(`Página ${i} de ${paginas}`, 180, 288);
  }

  doc.save(`Auditoria_LotoSniper_${totalDezenas}D_${garantiaAlvo.replace(/\s+/g, '_')}.pdf`);
}
