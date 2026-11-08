import jsPDF from 'jspdf';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { VALOR_APOSTA_LOTOFACIL } from './combinatorics';
import { FechamentoExportMeta } from './txtExportFormatter';
import { CRUZ_DEZENAS } from '../data/lotofacilData';

export interface CartoesExportOptions {
  tickets: GameTicket[];
  latestDraw: LotofacilDraw;
  meta?: FechamentoExportMeta | null;
  fechamentoNome?: string;
}

/**
 * Gera um documento PDF formatado profissionalmente com cartões/volantes de aposta
 * no padrão oficial da Lotofácil (grid 5x5 de 01 a 25), pronto para impressão e marcação.
 */
export function exportCartoesJogosToPdf({
  tickets,
  latestDraw,
  meta,
  fechamentoNome,
}: CartoesExportOptions): void {
  if (!tickets || tickets.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  const concurso = meta?.concurso || latestDraw.concurso;
  const targetConcurso = concurso + 1;
  const dataConcurso = meta?.dataConcurso || latestDraw.data || new Date().toLocaleDateString('pt-BR');
  const nomeFechamento =
    fechamentoNome || meta?.strategyName || 'Fechamento Clássico';
  const totalJogos = tickets.length;
  const custoTotal = totalJogos * VALOR_APOSTA_LOTOFACIL;

  // Layout dos cartões: 4 cartões por página A4 (2 linhas x 2 colunas)
  const marginX = 12;
  const marginY = 14;
  const cardWidth = (pageWidth - marginX * 2 - 10) / 2; // ~88mm
  const cardHeight = (pageHeight - marginY * 2 - 14) / 2; // ~128mm

  const ticketsPerPage = 4;
  const totalPages = Math.ceil(totalJogos / ticketsPerPage);

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) {
      doc.addPage();
    }

    // Cabeçalho da Página
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Faixa esmeralda
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, pageWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('LOTOSNIPER • CARTÕES OFICIAIS DE APOSTA PARA IMPRESSÃO', marginX, 7.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(
      `Concurso Alvo: #${targetConcurso} | Página ${page + 1} de ${totalPages} | ${nomeFechamento}`,
      pageWidth - marginX,
      7.5,
      { align: 'right' }
    );

    // Renderizar até 4 cartões nesta página
    for (let slot = 0; slot < ticketsPerPage; slot++) {
      const ticketIndex = page * ticketsPerPage + slot;
      if (ticketIndex >= totalJogos) break;

      const ticket = tickets[ticketIndex];
      const col = slot % 2;
      const row = Math.floor(slot / 2);

      const cardX = marginX + col * (cardWidth + 10);
      const cardY = marginY + row * (cardHeight + 10);

      renderSingleBetCard(doc, ticket, ticketIndex + 1, totalJogos, targetConcurso, cardX, cardY, cardWidth, cardHeight, nomeFechamento);
    }

    // Rodapé da Página
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(
      `LotoSniper Inteligência Matemática • Imprima em 100% (sem ajuste de escala) para preenchimento em lotéricas • Custo Total: R$ ${custoTotal.toFixed(2)}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  const filename = `lotosniper_cartoes_${nomeFechamento.toLowerCase().replace(/\s+/g, '_')}_${totalJogos}_jogos.pdf`;
  doc.save(filename);
}

/**
 * Desenha um cartão individual de aposta com layout de volante oficial 5x5
 */
function renderSingleBetCard(
  doc: jsPDF,
  ticket: GameTicket,
  ticketNum: number,
  totalTickets: number,
  targetConcurso: number,
  x: number,
  y: number,
  w: number,
  h: number,
  fechamentoName: string
): void {
  const dezenasSet = new Set(ticket.dezenas);

  // Borda do cartão
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Cabeçalho do Cartão (Faixa Superior)
  doc.setFillColor(30, 41, 59); // slate-800
  doc.roundedRect(x, y, w, 14, 2, 2, 'F');
  // Ajuste do canto inferior do header
  doc.rect(x, y + 10, w, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`VOLANTE DE APOSTA • JOGO ${(ticketNum).toString().padStart(2, '0')}/${totalTickets.toString().padStart(2, '0')}`, x + 3.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Alvo: Concurso #${targetConcurso} • R$ 3,50 Caixa`, x + 3.5, y + 10.5);

  // Badge no canto superior direito
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(x + w - 24, y + 3, 21, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('15 NÚMEROS', x + w - 13.5, y + 8, { align: 'center' });

  // Grid 5x5 do volante (números de 01 a 25)
  const gridStartX = x + 6;
  const gridStartY = y + 18;
  const cellWidth = (w - 12) / 5;
  const cellHeight = (h - 40) / 5;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const num = row * 5 + col + 1;
      const numStr = num.toString().padStart(2, '0');
      const isSelected = dezenasSet.has(num);

      const cellX = gridStartX + col * cellWidth;
      const cellY = gridStartY + row * cellHeight;

      if (isSelected) {
        // Dezena Marcada: preenchimento escuro com número branco e contorno forte
        doc.setFillColor(15, 23, 42); // slate-900 (marcado)
        doc.setDrawColor(16, 185, 129); // borda esmeralda
        doc.setLineWidth(0.6);
        doc.roundedRect(cellX + 1, cellY + 0.8, cellWidth - 2, cellHeight - 1.6, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(255, 255, 255);
        doc.text(numStr, cellX + cellWidth / 2, cellY + cellHeight / 2 + 3, { align: 'center' });
      } else {
        // Dezena Não Marcada: quadrado claro vazado
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.roundedRect(cellX + 1, cellY + 0.8, cellWidth - 2, cellHeight - 1.6, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(numStr, cellX + cellWidth / 2, cellY + cellHeight / 2 + 2.8, { align: 'center' });
      }
    }
  }

  // Rodapé do Cartão com Dossiê Técnico Compacto
  const footerY = y + h - 18;
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(x + 1, footerY, w - 2, 17, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text(`Estratégia: ${fechamentoName}`, x + 3.5, footerY + 4.5);

  const soma = ticket.soma || ticket.dezenas.reduce((a, b) => a + b, 0);
  const pares = ticket.pares ?? ticket.dezenas.filter((n) => n % 2 === 0).length;
  const impares = 15 - pares;
  const moldura = ticket.moldura ?? ticket.dezenas.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length;
  const primos = ticket.primos ?? ticket.dezenas.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
  const cruz = ticket.cruz ?? ticket.dezenas.filter((n) => CRUZ_DEZENAS.includes(n)).length;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Soma: ${soma} | Paridade: ${pares}P/${impares}I | Moldura: ${moldura} | Cruz: ${cruz} | Primos: ${primos}`,
    x + 3.5,
    footerY + 9
  );


  // Linha com os 15 números em texto para conferência rápida
  const dezenasLinha = [...ticket.dezenas]
    .sort((a, b) => a - b)
    .map((n) => n.toString().padStart(2, '0'))
    .join(' ');
  doc.setFont('courier', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(dezenasLinha, x + 3.5, footerY + 13.5);

  // Linhas de picote/corte tracejadas para impressão
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(x - 1, y - 1, w + 2, h + 2, 'D');
  doc.setLineDashPattern([], 0); // reset
}
