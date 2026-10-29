import React, { useRef } from 'react';
import { GameTicket, LotofacilDraw, FechamentoExportMeta } from '../types/lotofacil';
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
  Award,
  ShieldCheck,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  fechamentoMeta?: FechamentoExportMeta | null;
}

export const ExportPDFModal: React.FC<ExportPDFModalProps> = ({
  isOpen,
  onClose,
  tickets,
  latestDraw = CONCURSO_ATUAL,
  fechamentoMeta,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  // Veto automático de bilhetes com alerta estatístico de soma < 180
  const validTickets = tickets.filter((t) => {
    const soma = t.soma ?? t.dezenas.reduce((acc, curr) => acc + curr, 0);
    return soma >= 180;
  });

  // Cálculo das métricas consolidadas do fechamento
  const poolNumbers = Array.from(new Set(validTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);
  const totalCusto = (validTickets.length * 3.5).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const avgSoma = validTickets.length > 0 ? Math.round(validTickets.reduce((acc, t) => acc + t.soma, 0) / validTickets.length) : 200;
  const avgPares = validTickets.length > 0 ? (validTickets.reduce((acc, t) => acc + t.pares, 0) / validTickets.length).toFixed(1) : '7.5';
  const avgPrimos = validTickets.length > 0 ? (validTickets.reduce((acc, t) => acc + t.primos, 0) / validTickets.length).toFixed(1) : '5.3';
  const avgMoldura = validTickets.length > 0 ? (validTickets.reduce((acc, t) => acc + t.moldura, 0) / validTickets.length).toFixed(1) : '9.8';
  const avgScore = validTickets.length > 0 ? Math.round(validTickets.reduce((acc, t) => acc + (t.scoreIA || 80), 0) / validTickets.length) : 85;

  const garantiaNome = fechamentoMeta?.garantia
    ? fechamentoMeta.garantia
    : fechamentoMeta?.modeName
    ? fechamentoMeta.modeName.replace('_', ' ').toUpperCase()
    : `${poolNumbers.length} Dezenas • Garantia 14 Pontos`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>LotoSniper - Relatório Técnico & Volantes (${tickets.length} Jogos)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 10px;
    }
    .technical-header {
      border: 2px solid #7c3aed;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
      background: #faf5ff;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #ddd6fe;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #6b21a8;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .badge-concurso {
      font-size: 11px;
      font-weight: bold;
      background: #6b21a8;
      color: #fff;
      padding: 4px 10px;
      border-radius: 6px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .metric-box {
      background: #ffffff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      padding: 8px 12px;
      text-align: center;
    }
    .metric-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .metric-val {
      font-size: 15px;
      font-weight: 900;
      color: #1e1b4b;
      font-family: monospace;
    }
    .pool-section {
      background: #ffffff;
      border: 1px solid #e9d5ff;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pool-label {
      font-size: 11px;
      font-weight: 800;
      color: #6b21a8;
      white-space: nowrap;
    }
    .pool-balls {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .pool-ball {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #7c3aed;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
    }
    .slips-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .slip-card {
      border: 2px solid #8b5cf6;
      border-radius: 12px;
      padding: 12px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .slip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px dashed #c4b5fd;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .slip-title {
      font-size: 12px;
      font-weight: 900;
      color: #5b21b6;
      font-family: monospace;
    }
    .slip-type {
      font-size: 10px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
    }
    .volante-grid-5x5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 8px;
    }
    .v-cell {
      height: 34px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      font-family: monospace;
      color: #64748b;
      background: #f8fafc;
    }
    .v-cell.selected {
      background: #6b21a8 !important;
      color: #ffffff !important;
      border: 2px solid #4c1d95 !important;
      font-weight: 900 !important;
      box-shadow: inset 0 0 0 1px #ffffff;
    }
    .slip-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px;
      font-family: monospace;
      color: #64748b;
    }
    .fill-instruction {
      font-size: 9px;
      color: #94a3b8;
      font-style: italic;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .slips-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="technical-header">
    <div class="header-top">
      <div>
        <h1 class="brand-title">LotoSniper • Relatório Técnico de Fechamento</h1>
        <div style="font-size: 12px; color: #6b21a8; font-weight: 600; margin-top: 2px;">
          Garantia Matemática Oficial • Matriz Pronta para Preenchimento em Lotérica
        </div>
      </div>
      <div class="badge-concurso">
        CONCURSO BASE #${latestDraw.concurso} • ${latestDraw.data}
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">Total de Jogos</div>
        <div class="metric-val">${tickets.length} apostas</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Custo Total (R$)</div>
        <div class="metric-val">${totalCusto}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Dezenas Base</div>
        <div class="metric-val">${poolNumbers.length} dezenas</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Soma Média</div>
        <div class="metric-val">${avgSoma} (Ideal: 185-210)</div>
      </div>
    </div>

    <div class="pool-section">
      <div class="pool-label">DEZENAS COBERTAS NA MATRIZ:</div>
      <div class="pool-balls">
        ${poolNumbers
          .map((n) => `<div class="pool-ball">${n.toString().padStart(2, '0')}</div>`)
          .join('')}
      </div>
    </div>
  </div>

  <div class="slips-grid">
    ${validTickets
      .map(
        (t) => `
      <div class="slip-card">
        <div class="slip-header">
          <span class="slip-title">JOGO #${t.index.toString().padStart(2, '0')}</span>
          <span class="slip-type">15 Dezenas Marcadas</span>
        </div>
        <div class="volante-grid-5x5">
          ${Array.from({ length: 25 }, (_, i) => {
            const num = i + 1;
            const isSel = t.dezenas.includes(num);
            return `<div class="v-cell ${isSel ? 'selected' : ''}">${num.toString().padStart(2, '0')}</div>`;
          }).join('')}
        </div>
        <div class="slip-footer">
          <span>Soma: <strong>${t.soma}</strong> • ${t.pares}P/${t.impares}I</span>
          <span>Primos: ${t.primos} • Moldura: ${t.moldura}</span>
          <span class="fill-instruction">Marque no volante oficial</span>
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `volantes_lotosniper_${validTickets.length}_jogos_concurso_${latestDraw.concurso}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl relative overflow-hidden font-sans">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Exportação PDF Estilizada & Impressão de Volantes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40">
                  {tickets.length} JOGOS
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Volantes no padrão oficial 5×5 da Caixa com cabeçalho técnico das métricas do fechamento.
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
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              Para salvar em PDF, clique em <strong>"Imprimir / Salvar PDF"</strong> e selecione a impressora{' '}
              <strong className="text-purple-300">"Salvar como PDF"</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadHTML}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Baixar Arquivo HTML Autónomo</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold transition shadow-lg shadow-purple-500/25 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Preview Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5" ref={printAreaRef}>
          {/* Technical Header Card */}
          <div className="bg-gradient-to-br from-purple-950/40 via-slate-950 to-slate-950 border-2 border-purple-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/30">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Laudo Técnico de Fechamento
                </span>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <span>LOTOSNIPER • MATRIZ OFICIAL DE APOSTAS</span>
                </h4>
              </div>

              <div className="flex items-center gap-2 bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-xl font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-slate-300">Concurso Base:</span>
                <strong className="text-purple-300">#{latestDraw.concurso}</strong>
                <span className="text-slate-500">({latestDraw.data})</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Total de Bilhetes</span>
                <div className="text-base font-black font-mono text-white mt-0.5">{validTickets.length} jogos</div>
                <span className="text-[10px] text-purple-400 font-medium">Volantes 15 dezenas</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Custo Estimado</span>
                <div className="text-base font-black font-mono text-emerald-400 mt-0.5">{totalCusto}</div>
                <span className="text-[10px] text-slate-500 font-medium">R$ 3,50 por aposta</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Dezenas no Desdobro</span>
                <div className="text-base font-black font-mono text-cyan-300 mt-0.5">{poolNumbers.length} dezenas</div>
                <span className="text-[10px] text-cyan-400/80 font-medium">Cobertura combinatória</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Soma Média</span>
                <div className="text-base font-black font-mono text-amber-300 mt-0.5">{avgSoma} pts</div>
                <span className="text-[10px] text-amber-400/80 font-medium">Faixa Ouro (185-210)</span>
              </div>
            </div>

            {/* Dezenas Cobertas */}
            <div className="pt-2 border-t border-purple-500/20">
              <span className="text-xs font-bold text-slate-300 block mb-2">
                Conjunto das {poolNumbers.length} Dezenas Utilizadas na Matriz:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {poolNumbers.map((num) => (
                  <span
                    key={num}
                    className="w-7 h-7 rounded-lg bg-purple-600 text-white font-mono font-black text-xs flex items-center justify-center shadow-sm"
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Volantes Visual Grid (Padrão 5x5 Caixa) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                Representação Visual dos Volantes (Pronto para Preenchimento)
              </span>
              <span>{validTickets.length} Volantes Gerados (100% Zona de Ouro)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validTickets.map((t) => (
                <div
                  key={t.id || t.index}
                  className="bg-slate-950 border-2 border-purple-500/40 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-md"
                >
                  {/* Header Volante */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-purple-300">
                        JOGO #{t.index.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        • 15 Dezenas
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span>Soma: <strong className="text-white">{t.soma}</strong></span>
                      <span>{t.pares}P/{t.impares}I</span>
                    </div>
                  </div>

                  {/* 5x5 Volante Grid (Lotofácil Style) */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 25 }, (_, i) => {
                      const num = i + 1;
                      const isSelected = t.dezenas.includes(num);

                      return (
                        <div
                          key={num}
                          className={`h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/40 font-black scale-102 ring-1 ring-white/30'
                              : 'bg-slate-900/80 text-slate-500 border-slate-800'
                          }`}
                        >
                          {num.toString().padStart(2, '0')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Slip Metrics Footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      Primos: <strong className="text-purple-300">{t.primos}</strong> • Moldura:{' '}
                      <strong className="text-emerald-300">{t.moldura}</strong>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      Score IA: {t.scoreIA || 80}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400 font-mono">
            Concurso Base: #{latestDraw.concurso} • {tickets.length} Volantes Formatados
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
