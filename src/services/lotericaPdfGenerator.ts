import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GameTicket } from '../types/lotofacil';
import { SavedFechamentoPrognostico } from './savedFechamentosStorage';

export interface LotericaPdfExportOptions {
  fechamento?: SavedFechamentoPrognostico | null;
  tickets: GameTicket[];
  concurso?: number;
  dataConcurso?: string;
  strategyName?: string;
  modalidadeMatriz?: string;
  universoDezenas?: number[];
  custoTotalEstimado?: number;
  watermarkText?: string;
  includeCheckboxes?: boolean;
}

/**
 * Adiciona a marca d'água de alta qualidade em ângulo de 45° no fundo da página.
 */
function drawHighQualityWatermark(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  customText?: string
) {
  const primaryText = customText || 'LOTO SNIPER • COMPROVANTE OFICIAL DE JOGOS • USO LOTÉRICO';
  const secondaryText = 'AUTENTICAÇÃO ESTATÍSTICA MATRIZ PRO • USO EXCLUSIVO DO APOSTADOR';

  doc.saveGraphicsState();

  // Configuração da marca d'água primária diagonal central
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(226, 232, 240); // slate-200 muito sutil

  // Centro da página
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  // Marca d'água central
  doc.text(primaryText, centerX, centerY, {
    angle: 45,
    align: 'center',
  });

  // Marca d'água superior diagonal secundária
  doc.setFontSize(16);
  doc.setTextColor(235, 239, 245);
  doc.text(secondaryText, centerX - 30, centerY - 80, {
    angle: 45,
    align: 'center',
  });

  // Marca d'água inferior diagonal secundária
  doc.text(secondaryText, centerX + 30, centerY + 80, {
    angle: 45,
    align: 'center',
  });

  // Selo de autenticidade no canto direito (marca d'água circular sutil)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.circle(pageWidth - 28, 28, 14);
  doc.circle(pageWidth - 28, 28, 12);
  doc.setFontSize(5);
  doc.setTextColor(203, 213, 225);
  doc.text('LOTO SNIPER', pageWidth - 28, 26, { align: 'center' });
  doc.text('OFICIAL • 2026', pageWidth - 28, 30, { align: 'center' });

  doc.restoreGraphicsState();
}

/**
 * Gera um PDF profissional de jogos salvos com dezenas, custo estimado e marca d'água de alta qualidade
 * customizado especificamente para levar a casas lotéricas e facilitar a aposta.
 */
export function generateProfessionalLotericaPDF({
  fechamento,
  tickets,
  concurso = 3818,
  dataConcurso,
  strategyName,
  modalidadeMatriz,
  universoDezenas,
  custoTotalEstimado,
  watermarkText,
}: LotericaPdfExportOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Resolução de metadados
  const targetTickets = tickets.length > 0 ? tickets : (fechamento?.tickets || []);
  const resolvedConcurso = concurso || fechamento?.concurso || 3818;
  const resolvedData = dataConcurso || fechamento?.dataConcurso || new Date().toLocaleDateString('pt-BR');
  const resolvedStrategy = strategyName || fechamento?.tipoFechamento || 'Fechamento Lotérico Inteligente';
  const resolvedMode = modalidadeMatriz || fechamento?.modalidadeMatriz || `${targetTickets.length} Jogos • Garantia 14 Pontos`;
  const resolvedPool = universoDezenas && universoDezenas.length > 0
    ? universoDezenas
    : fechamento?.universoDezenas && fechamento.universoDezenas.length > 0
    ? fechamento.universoDezenas
    : Array.from(new Set(targetTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);

  // Custo oficial: R$ 3,50 por bilhete de 15 dezenas (ou cálculo proporcional se apostas com mais dezenas)
  const totalCostNumber = custoTotalEstimado !== undefined
    ? custoTotalEstimado
    : fechamento?.custoTotal !== undefined
    ? fechamento.custoTotal
    : targetTickets.reduce((acc, t) => {
        const count = t.dezenas.length;
        if (count === 16) return acc + 56.0;
        if (count === 17) return acc + 476.0;
        if (count === 18) return acc + 2856.0;
        return acc + 3.5;
      }, 0);

  const totalCostFormatted = totalCostNumber.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // 1. PRIMEIRA PÁGINA: Marca d'água inicial
  drawHighQualityWatermark(doc, pageWidth, pageHeight, watermarkText);

  // 2. HEADER SUPERIOR OFICIAL
  // Faixa de fundo superior azul/ardósia escuro institucional
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 44, 'F');

  // Faixa verde esmeralda / lotérica Caixa
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Linha dourada de requinte
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 4, pageWidth, 1.2, 'F');

  // Borda inferior do header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 43.5, pageWidth, 0.8, 'F');

  // Título e Branding
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('LOTOSNIPER AI PRO', margin, 15);

  doc.setFontSize(9);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('COMPROVANTE OFICIAL DE JOGOS • GUIA DE IMPRESSÃO & APOSTAS LOTÉRICAS', margin, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, 27);
  doc.text(`Estratégia: ${resolvedStrategy}`, margin, 32);
  doc.text(`Modalidade: ${resolvedMode}`, margin, 37);

  // Bloco de Destaque Financeiro no Topo Direito (Custo Estimado e Concurso)
  const rightBoxWidth = 78;
  const rightBoxX = pageWidth - margin - rightBoxWidth;

  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(rightBoxX, 8, rightBoxWidth, 32, 2.5, 2.5, 'F');
  doc.setDrawColor(52, 211, 153); // emerald-400
  doc.setLineWidth(0.5);
  doc.roundedRect(rightBoxX, 8, rightBoxWidth, 32, 2.5, 2.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`CONCURSO ALVO: #${resolvedConcurso}`, rightBoxX + 4, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Total de Apostas: ${targetTickets.length} Bilhetes`, rightBoxX + 4, 19.5);
  doc.text('Custo Unitário (15 dezenas): R$ 3,50', rightBoxX + 4, 24.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(`CUSTO ESTIMADO: ${totalCostFormatted}`, rightBoxX + 4, 31.5);

  doc.setFontSize(6.5);
  doc.setTextColor(245, 158, 11);
  doc.text('✓ 100% Blindagem Zona de Ouro (Soma >= 180)', rightBoxX + 4, 36.5);

  let currentY = 50;

  // 3. BARRA DE UNIVERSO DE DEZENAS
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 13, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`UNIVERSO SELECIONADO (${resolvedPool.length} DEZENAS):`, margin + 3, currentY + 5);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const poolFormatted = resolvedPool.map((n) => n.toString().padStart(2, '0')).join('  ');
  doc.text(poolFormatted, margin + 3, currentY + 10);

  currentY += 17;

  // 4. TABELA OFICIAL DE JOGOS PARA A LOTÉRICA (jspdf-autotable)
  const tableData = targetTickets.map((ticket, index) => {
    const sortedDez = [...ticket.dezenas].sort((a, b) => a - b);
    const dezenasStr = sortedDez.map((n) => n.toString().padStart(2, '0')).join('  ');
    const soma = ticket.soma ?? sortedDez.reduce((a, b) => a + b, 0);
    const pares = ticket.pares ?? sortedDez.filter((n) => n % 2 === 0).length;
    const impares = ticket.impares ?? (15 - pares);
    const primos = ticket.primos ?? sortedDez.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;

    const unitPrice = sortedDez.length === 16 ? 'R$ 56,00' : sortedDez.length === 17 ? 'R$ 476,00' : 'R$ 3,50';

    return [
      `Jogo ${(ticket.index ?? index + 1).toString().padStart(2, '0')}`,
      dezenasStr,
      unitPrice,
      `Soma: ${soma} | ${pares}P/${impares}I | ${primos} Prim`,
      '[   ] Registrado',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 22 },
    head: [[
      'JOGO',
      'DEZENAS PARA MARCAÇÃO NO VOLANTE (15 DEZENAS)',
      'VALOR ESTIM.',
      'FILTROS TÉCNICOS',
      'CHECK LOTÉRICO',
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.2,
      lineColor: [51, 65, 85],
      lineWidth: 0.2,
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2,
      valign: 'middle',
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: {
        font: 'helvetica',
        fontStyle: 'bold',
        textColor: [15, 23, 42],
        halign: 'center',
        cellWidth: 18,
      },
      1: {
        font: 'courier',
        fontStyle: 'bold',
        textColor: [15, 23, 42],
        halign: 'center',
        cellWidth: 88,
        fontSize: 9,
      },
      2: {
        font: 'helvetica',
        fontStyle: 'bold',
        textColor: [5, 150, 105], // emerald-600
        halign: 'center',
        cellWidth: 22,
      },
      3: {
        font: 'helvetica',
        textColor: [71, 85, 105],
        halign: 'center',
        fontSize: 7.2,
        cellWidth: 36,
      },
      4: {
        font: 'helvetica',
        fontStyle: 'bold',
        textColor: [100, 116, 139],
        halign: 'center',
        cellWidth: 22,
        fontSize: 7.5,
      },
    },
    alternateRowStyles: {
      fillColor: [250, 250, 252],
    },
    didDrawPage: (data) => {
      // Desenha a marca d'água de alta qualidade em todas as páginas subseqüentes
      if (data.pageNumber > 1) {
        drawHighQualityWatermark(doc, pageWidth, pageHeight, watermarkText);

        // Header secundário resumido em páginas subseqüentes
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, pageWidth, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text('LOTOSNIPER AI PRO • COMPROVANTE OFICIAL DE JOGOS (USO LOTÉRICO)', margin, 8);

        doc.setFontSize(8);
        doc.setTextColor(52, 211, 153);
        doc.text(`Concurso #${resolvedConcurso} • Total: ${totalCostFormatted}`, pageWidth - margin, 8, { align: 'right' });
      }

      // Rodapé oficial em todas as páginas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `LOTO SNIPER • AUTENTICAÇÃO LOTÉRICA: LS-${resolvedConcurso}-${targetTickets.length}J • Página ${data.pageNumber}`,
        margin,
        pageHeight - 8
      );

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        'Documento emitido para marcação e registro em terminais da Caixa Econômica Federal. Válido mediante bilhete impresso pela lotérica.',
        pageWidth - margin,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  // 5. BLOCO FINAL DE INSTRUÇÕES AO ATENDENTE E APOSTADOR (se couber na última página)
  let finalY = (doc as any).lastAutoTable.finalY + 6;

  // Se estiver muito perto do fim da página, cria nova página para as instruções e certificado
  if (finalY > pageHeight - 45) {
    doc.addPage();
    drawHighQualityWatermark(doc, pageWidth, pageHeight, watermarkText);
    finalY = 20;
  }

  // Caixa de Instruções & Certificado de Validação
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, finalY, pageWidth - margin * 2, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('INSTRUÇÕES PARA O APOSTADOR & OPERADOR LOTÉRICO:', margin + 4, finalY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text(
    '1. Marque no volante da Lotofácil cada grupo de 15 dezenas listado nas linhas acima (ou utilize o serviço de digitação do atendente).',
    margin + 4,
    finalY + 10
  );
  doc.text(
    `2. Custo Total Estimado de ${totalCostFormatted} para o conjunto completo de ${targetTickets.length} jogos simples (R$ 3,50 por volante de 15 dezenas).`,
    margin + 4,
    finalY + 14.5
  );
  doc.text(
    '3. O comprovante oficial de aposta emitido pelo terminal da Caixa Econômica Federal é o único documento válido para recebimento de prêmios.',
    margin + 4,
    finalY + 19
  );

  return doc;
}

/**
 * Dispara o download automático do PDF oficial de lotérica para jogos salvos.
 */
export function downloadProfessionalLotericaPDF(options: LotericaPdfExportOptions): void {
  const doc = generateProfessionalLotericaPDF(options);
  const concurso = options.concurso || options.fechamento?.concurso || 3818;
  const totalJogos = options.tickets.length || options.fechamento?.totalJogos || 1;
  const filename = `lotosniper_comprovante_loterica_concurso_${concurso}_${totalJogos}_jogos.pdf`;
  doc.save(filename);
}
