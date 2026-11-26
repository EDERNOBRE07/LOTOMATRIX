import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LotofacilDraw } from '../types/lotofacil';
import { ConcursoParametrosEstatisticos } from '../utils/concursoParametros';

export interface ConferenceSummaryForPdf {
  totalJogos: number;
  totalPremiados: number;
  taxaAcerto: number;
  custoApostas: number;
  premiosValorTotal: number;
  saldoLiquido: number;
  total15: number;
  total14: number;
  total13: number;
  total12: number;
  total11: number;
}

export interface RecentDrawTrendRow {
  concurso: number;
  data: string;
  somaTotal: number;
  primos: number;
  pares: number;
  impares: number;
  moldura: number;
  fibonacci: number;
}

export interface ResultadosEstatisticosPdfPayload {
  targetDraw: LotofacilDraw;
  parametros: ConcursoParametrosEstatisticos;
  conferenceSummary?: ConferenceSummaryForPdf;
  recent5Trend?: RecentDrawTrendRow[];
}

export interface StatisticalParameterTableRow {
  parametro: string;
  valor: string;
  referencia: string;
  status: 'Equilibrado' | 'Atenção' | 'Informativo';
}

export function buildResultadosEstatisticosRows(
  concurso: number,
  p: ConcursoParametrosEstatisticos
): StatisticalParameterTableRow[] {
  const blocosTexto =
    p.blocosConsecutivos.length > 0
      ? p.blocosConsecutivos
          .map((b) => `${String(b[0]).padStart(2, '0')}–${String(b[b.length - 1]).padStart(2, '0')}`)
          .join(', ')
      : 'Sem blocos consecutivos';

  const q = p.quadrantes;
  const quadrantesTexto = `Q1:${q.q1} · Q2:${q.q2} · Q3:${q.q3} · Q4:${q.q4}${
    q.centro13 ? ' (+13 centro)' : ''
  }`;
  const minQ = Math.min(q.q1, q.q2, q.q3, q.q4);
  const maxQ = Math.max(q.q1, q.q2, q.q3, q.q4);

  return [
    {
      parametro: 'Pares e Ímpares',
      valor: `${p.pares} Pares / ${p.impares} Ímpares`,
      referencia: '6–8 Pares / 7–9 Ímpares',
      status: p.pares >= 6 && p.pares <= 8 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: `Repetidas do Concurso #${concurso - 1}`,
      valor: p.repetidasAnterior !== null ? `${p.repetidasAnterior} dezenas` : 'N/A',
      referencia: '8–10 dezenas',
      status:
        p.repetidasAnterior === null
          ? 'Informativo'
          : p.repetidasAnterior >= 7 && p.repetidasAnterior <= 10
          ? 'Equilibrado'
          : 'Atenção',
    },
    {
      parametro: 'Soma Total das Dezenas',
      valor: `${p.somaTotal}`,
      referencia: '175 – 220',
      status: p.somaTotal >= 175 && p.somaTotal <= 220 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: 'Números Primos',
      valor: `${p.primos} dezenas`,
      referencia: '4 – 7 dezenas',
      status: p.primos >= 4 && p.primos <= 7 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: 'Moldura e Miolo (Volante 5×5)',
      valor: `${p.moldura} Moldura / ${p.miolo} Miolo`,
      referencia: '8–11 Moldura / 4–7 Miolo',
      status: p.moldura >= 8 && p.moldura <= 11 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: 'Sequência de Fibonacci',
      valor: `${p.fibonacci} dezenas`,
      referencia: '3 – 6 dezenas',
      status: p.fibonacci >= 3 && p.fibonacci <= 6 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: 'Números em Sequência',
      valor: `Máx. ${p.maiorSequencia} (${blocosTexto})`,
      referencia: 'Maior seq. ≤ 6',
      status: p.maiorSequencia <= 6 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: 'Cruz Central da Lotofácil',
      valor: `${p.cruz} dezenas`,
      referencia: '4 – 6 dezenas',
      status: p.cruz >= 4 && p.cruz <= 6 ? 'Equilibrado' : 'Atenção',
    },
    {
      parametro: 'Distribuição por Quadrantes',
      valor: quadrantesTexto,
      referencia: '2 – 5 por quadrante',
      status: minQ >= 2 && maxQ <= 5 ? 'Equilibrado' : 'Atenção',
    },
  ];
}

function formatBRL(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}R$ ${Math.abs(value).toFixed(2).replace('.', ',')}`;
}

export function generateResultadosEstatisticosPDF({
  targetDraw,
  parametros,
  conferenceSummary,
  recent5Trend,
}: ResultadosEstatisticosPdfPayload): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const nowLabel = new Date().toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  // Cabeçalho institucional limpo para impressão
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LotoSniper AI Pro — Relatório de Resultados Estatísticos', margin, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Concurso #${targetDraw.concurso} (${targetDraw.data})  |  Gerado em ${nowLabel}`,
    margin,
    21
  );

  let cursorY = 38;

  // Bloco das 15 dezenas sorteadas
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Dezenas Sorteadas — Concurso #${targetDraw.concurso}`, margin, cursorY);
  cursorY += 5;

  const sortedBalls = [...(targetDraw.dezenas || [])].sort((a, b) => a - b);
  const ballWidth = 10.5;
  const ballGap = 1.6;
  sortedBalls.forEach((num, idx) => {
    const x = margin + idx * (ballWidth + ballGap);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(148, 163, 184);
    doc.roundedRect(x, cursorY, ballWidth, 8.5, 1.8, 1.8, 'FD');
    doc.setFont('courier', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(num).padStart(2, '0'), x + ballWidth / 2, cursorY + 5.7, {
      align: 'center',
    });
  });

  cursorY += 15;

  // Tabela Principal: Resultados Estatísticos do Concurso
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Tabela de Resultados Estatísticos Calculados', margin, cursorY);
  cursorY += 3;

  const rows = buildResultadosEstatisticosRows(targetDraw.concurso, parametros);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['Parâmetro Estatístico', 'Valor Calculado', 'Referência Histórica', 'Avaliação']],
    body: rows.map((r) => [r.parametro, r.valor, r.referencia, r.status]),
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 2.8,
    },
    bodyStyles: {
      fontSize: 8.8,
      textColor: [30, 41, 59],
      cellPadding: 2.6,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 54 },
      1: { font: 'courier', fontStyle: 'bold', cellWidth: 58 },
      2: { cellWidth: 44 },
      3: { halign: 'center', cellWidth: 26 },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const text = String(hookData.cell.raw || '');
        if (text === 'Equilibrado') {
          hookData.cell.styles.textColor = [22, 163, 74];
          hookData.cell.styles.fontStyle = 'bold';
        } else if (text === 'Atenção') {
          hookData.cell.styles.textColor = [217, 119, 6];
          hookData.cell.styles.fontStyle = 'bold';
        } else {
          hookData.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
  });

  cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 70) + 9;

  // Tabela Secundária: Tendência dos Últimos 5 Concursos
  if (recent5Trend && recent5Trend.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Evolução Estatística — Últimos 5 Concursos', margin, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Concurso', 'Data', 'Soma Total', 'Primos', 'Pares / Ímp.', 'Moldura', 'Fibonacci']],
      body: recent5Trend.map((d) => [
        `#${d.concurso}${d.concurso === targetDraw.concurso ? ' (Sel.)' : ''}`,
        d.data,
        String(d.somaTotal),
        `${d.primos} dez.`,
        `${d.pares}P / ${d.impares}I`,
        `${d.moldura}M`,
        `${d.fibonacci} dez.`,
      ]),
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        cellPadding: 2.3,
      },
      bodyStyles: {
        fontSize: 8.3,
        font: 'courier',
        textColor: [30, 41, 59],
        cellPadding: 2.2,
      },
    });

    cursorY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 40) + 9;
  }

  // Resumo da Conferência (quando houver jogos analisados)
  if (conferenceSummary && conferenceSummary.totalJogos > 0) {
    if (cursorY > pageHeight - 52) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo da Conferência de Jogos', margin, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [['Indicador da Conferência', 'Resultado', 'Detalhamento']],
      body: [
        [
          'Jogos Conferidos',
          `${conferenceSummary.totalJogos} bilhetes`,
          `Investimento: ${formatBRL(conferenceSummary.custoApostas)}`,
        ],
        [
          'Bilhetes Premiados (11–15 pts)',
          `${conferenceSummary.totalPremiados} (${conferenceSummary.taxaAcerto.toFixed(1)}%)`,
          `15pts:${conferenceSummary.total15} | 14pts:${conferenceSummary.total14} | 13pts:${conferenceSummary.total13} | 12pts:${conferenceSummary.total12} | 11pts:${conferenceSummary.total11}`,
        ],
        [
          'Premiação & Saldo Líquido',
          formatBRL(conferenceSummary.premiosValorTotal),
          `Saldo líquido: ${formatBRL(conferenceSummary.saldoLiquido)}`,
        ],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 8.5,
        cellPadding: 2.3,
      },
      bodyStyles: {
        fontSize: 8.4,
        textColor: [30, 41, 59],
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { font: 'courier', fontStyle: 'bold', cellWidth: 42 },
      },
    });
  }

  // Rodapé de paginação
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `LotoSniper AI Pro · Relatório Estatístico Concurso #${targetDraw.concurso}`,
      margin,
      pageHeight - 8
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }

  return doc;
}

export function downloadResultadosEstatisticosPDF(
  payload: ResultadosEstatisticosPdfPayload
): void {
  const doc = generateResultadosEstatisticosPDF(payload);
  doc.save(`lotosniper_resultados_estatisticos_concurso_${payload.targetDraw.concurso}.pdf`);
}
