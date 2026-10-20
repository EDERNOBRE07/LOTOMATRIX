import React, { useRef } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
}

export const ExportPDFModal: React.FC<ExportPDFModalProps> = ({
  isOpen,
  onClose,
  tickets,
  latestDraw = CONCURSO_ATUAL,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    if (!printAreaRef.current) return;
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>LotoSniper - Volantes Lotofácil para Impressão</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; margin: 20px; }
    .header { text-align: center; border-bottom: 2px solid #7c3aed; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: #7c3aed; font-size: 22px; text-transform: uppercase; }
    .header p { margin: 4px 0 0 0; color: #555; font-size: 12px; }
    .slips-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .slip-card { border: 2px solid #9333ea; border-radius: 8px; padding: 12px; page-break-inside: avoid; background: #faf5ff; }
    .slip-title { font-weight: bold; font-size: 13px; color: #7c3aed; display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #d8b4fe; padding-bottom: 4px; }
    .grid-5x5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
    .cell { border: 1px solid #c084fc; border-radius: 4px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; font-family: monospace; color: #475569; background: #fff; }
    .cell.selected { background: #9333ea; color: #fff; border-color: #6b21a8; box-shadow: inset 0 0 0 2px #581c87; font-weight: 900; }
    .metrics { font-size: 10px; color: #64748b; margin-top: 8px; display: flex; justify-content: space-between; border-top: 1px solid #e9d5ff; padding-top: 4px; }
    @media print {
      body { margin: 0; padding: 10mm; background: #fff; }
      .no-print { display: none !important; }
      .slips-grid { grid-template-columns: repeat(2, 1fr); gap: 15px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LotoSniper - Volantes Prontos para Impressão</h1>
    <p>Concurso de Referência: #${latestDraw.concurso} (${latestDraw.data}) • Total de Jogos: ${tickets.length} • Formato Oficial 5×5 Lotofácil</p>
  </div>
  <div class="slips-grid">
    ${tickets
      .map(
        (t) => `
      <div class="slip-card">
        <div class="slip-title">
          <span>JOGO #${t.index.toString().padStart(2, '0')}</span>
          <span>15 DEZENAS</span>
        </div>
        <div class="grid-5x5">
          ${Array.from({ length: 25 }, (_, i) => {
            const num = i + 1;
            const isSel = t.dezenas.includes(num);
            return `<div class="cell ${isSel ? 'selected' : ''}">${num.toString().padStart(2, '0')}</div>`;
          }).join('')}
        </div>
        <div class="metrics">
          <span>Soma: ${t.soma} • ${t.pares}P/${t.impares}I</span>
          <span>Primos: ${t.primos} • Moldura: ${t.moldura}</span>
          <span>Score IA: ${t.scoreIA}%</span>
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `volantes_lotofacil_lotosniper_${tickets.length}_jogos.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Impressão & PDF Formatado de Volantes Lotofácil</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                  {tickets.length} JOGOS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Visualização formatada no padrão 5×5 da Lotofácil da Caixa, otimizada para impressão ou salvamento em PDF.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="px-5 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="text-slate-300">
            Dica: No diálogo de impressão, selecione <strong className="text-white">"Salvar como PDF"</strong> para gerar o arquivo PDF oficial.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadHTML}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Baixar Arquivo HTML</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold transition shadow-lg shadow-purple-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Volantes Preview Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4" ref={printAreaRef}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tickets.map((t) => (
              <div
                key={t.id || t.index}
                className="bg-purple-950/20 border-2 border-purple-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden"
              >
                {/* Header Volante */}
                <div className="flex items-center justify-between pb-2 border-b border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-purple-300">
                      BILHETE #{t.index.toString().padStart(2, '0')}
                    </span>
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex gap-1">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/30 text-purple-200 font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                    15 Dezenas
                  </span>
                </div>

                {/* 5x5 Volante Grid */}
                <div className="grid grid-cols-5 gap-1.5">
                  {Array.from({ length: 25 }, (_, i) => {
                    const num = i + 1;
                    const isSelected = t.dezenas.includes(num);

                    return (
                      <div
                        key={num}
                        className={`h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition border ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50 scale-105 font-black ring-1 ring-white/40'
                            : 'bg-slate-900/80 text-slate-500 border-slate-800'
                        }`}
                      >
                        {num.toString().padStart(2, '0')}
                      </div>
                    );
                  })}
                </div>

                {/* Statistical Footer */}
                <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>
                    Soma: <strong className="text-white">{t.soma}</strong> • {t.pares}P/{t.impares}I
                  </span>
                  <span>
                    Primos: <strong className="text-purple-300">{t.primos}</strong> • Moldura:{' '}
                    <strong className="text-emerald-300">{t.moldura}</strong>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    IA: {t.scoreIA}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 font-mono">
            Concurso Oficial: #{latestDraw.concurso} • Total: {tickets.length} Volantes
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
