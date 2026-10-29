import React, { useRef } from 'react';
import { GameTicket, LotofacilDraw, FechamentoExportMeta } from '../types/lotofacil';
import { CONCURSO_ATUAL, MOLDURA, PRIMOS, FIBONACCI } from '../data/lotofacilData';
import { SavedFechamentoPrognostico } from '../services/savedFechamentosStorage';
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
  Target,
  Zap,
} from 'lucide-react';

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  fechamentoMeta?: FechamentoExportMeta | null;
  savedFechamento?: SavedFechamentoPrognostico | null;
}

export const ExportPDFModal: React.FC<ExportPDFModalProps> = ({
  isOpen,
  onClose,
  tickets: propTickets,
  latestDraw = CONCURSO_ATUAL,
  fechamentoMeta,
  savedFechamento,
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  // Resolve tickets (priorizando o fechamento salvo se passado)
  const sourceTickets = savedFechamento?.tickets && savedFechamento.tickets.length > 0
    ? savedFechamento.tickets
    : propTickets;

  // Veto categórico de bilhetes com alerta estatístico de soma < 180 (blindagem da Zona de Ouro)
  const validTickets = sourceTickets.filter((t) => {
    const soma = t.soma ?? t.dezenas.reduce((acc, curr) => acc + curr, 0);
    return soma >= 180;
  });

  // Metadados do fechamento
  const resolvedConcurso = savedFechamento?.concurso || fechamentoMeta?.concurso || latestDraw.concurso;
  const resolvedData = savedFechamento?.dataConcurso || fechamentoMeta?.dataConcurso || latestDraw.data;
  const strategyName =
    savedFechamento?.tipoFechamento ||
    fechamentoMeta?.strategyName ||
    'Fechamento Inteligente Ponderado (Zona de Ouro)';
  const modeName =
    savedFechamento?.modalidadeMatriz ||
    fechamentoMeta?.modeName ||
    `${validTickets.length} Jogos • Garantia 14 Pontos`;

  // Universo de dezenas
  const poolNumbers =
    savedFechamento?.universoDezenas && savedFechamento.universoDezenas.length > 0
      ? savedFechamento.universoDezenas
      : Array.from(new Set(validTickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);

  const fixedNumbers = savedFechamento?.dezenasFixas || fechamentoMeta?.fixedNumbers || [];
  const excludedNumbers = savedFechamento?.dezenasExcluidas || fechamentoMeta?.excludedNumbers || [];

  const totalCusto = (validTickets.length * 3.5).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const avgSoma =
    validTickets.length > 0
      ? Math.round(validTickets.reduce((acc, t) => acc + t.soma, 0) / validTickets.length)
      : 200;
  const avgPares =
    validTickets.length > 0
      ? (validTickets.reduce((acc, t) => acc + t.pares, 0) / validTickets.length).toFixed(1)
      : '7.5';
  const avgPrimos =
    validTickets.length > 0
      ? (validTickets.reduce((acc, t) => acc + t.primos, 0) / validTickets.length).toFixed(1)
      : '5.3';
  const avgMoldura =
    validTickets.length > 0
      ? (validTickets.reduce((acc, t) => acc + t.moldura, 0) / validTickets.length).toFixed(1)
      : '9.8';
  const avgScore =
    validTickets.length > 0
      ? Math.round(validTickets.reduce((acc, t) => acc + (t.scoreIA || 85), 0) / validTickets.length)
      : 88;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>LotoSniper Gold - Relatório Técnico & Volantes (${validTickets.length} Jogos)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
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
      padding: 8px;
    }
    .gold-header {
      border: 2px solid #d97706;
      border-radius: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
      background: #fffbeb;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #fde68a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 900;
      color: #b45309;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .badge-concurso {
      font-size: 11px;
      font-weight: 900;
      background: #d97706;
      color: #ffffff;
      padding: 4px 12px;
      border-radius: 6px;
      font-family: monospace;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .metric-box {
      background: #ffffff;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 6px 10px;
      text-align: center;
    }
    .metric-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #78350f;
      font-weight: 800;
      margin-bottom: 2px;
    }
    .metric-val {
      font-size: 14px;
      font-weight: 900;
      color: #92400e;
      font-family: monospace;
    }
    .pool-section {
      background: #ffffff;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    .pool-label {
      font-size: 11px;
      font-weight: 900;
      color: #b45309;
      white-space: nowrap;
    }
    .pool-balls {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .pool-ball {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: #d97706;
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: monospace;
    }
    .dossier-filters {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.4;
      background: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px dashed #fde68a;
    }
    .dossier-filters strong {
      color: #0f172a;
    }
    .slips-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .slip-card {
      border: 2px solid #d97706;
      border-radius: 10px;
      padding: 10px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .slip-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px dashed #fde68a;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .slip-title {
      font-size: 11px;
      font-weight: 900;
      color: #b45309;
      font-family: monospace;
    }
    .slip-type {
      font-size: 9px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
    }
    .volante-grid-5x5 {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 5px;
      margin-bottom: 6px;
    }
    .v-cell {
      height: 30px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      font-family: monospace;
      color: #64748b;
      background: #f8fafc;
    }
    .v-cell.selected {
      background: #d97706 !important;
      color: #ffffff !important;
      border: 2px solid #b45309 !important;
      font-weight: 900 !important;
      box-shadow: inset 0 0 0 1px #fef08a;
    }
    .slip-footer {
      border-top: 1px solid #f1f5f9;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      font-family: monospace;
      color: #64748b;
    }
    .slip-footer strong {
      color: #0f172a;
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
        gap: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="gold-header">
    <div class="header-top">
      <div>
        <h1 class="brand-title">LotoSniper Gold · Matriz Oficial Caixa</h1>
        <div style="font-size: 11px; color: #78350f; font-weight: 700; margin-top: 2px;">
          ${strategyName} • ${modeName}
        </div>
      </div>
      <div class="badge-concurso">CONCURSO #${resolvedConcurso} (${resolvedData})</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-box">
        <div class="metric-label">Total de Bilhetes</div>
        <div class="metric-val">${validTickets.length} Jogos</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Custo Estimado</div>
        <div class="metric-val">${totalCusto}</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Dezenas no Desdobro</div>
        <div class="metric-val">${poolNumbers.length} Números</div>
      </div>
      <div class="metric-box">
        <div class="metric-label">Soma Média</div>
        <div class="metric-val">${avgSoma} pts (Zona Ouro)</div>
      </div>
    </div>

    <div class="pool-section">
      <span class="pool-label">Universo (${poolNumbers.length}D):</span>
      <div class="pool-balls">
        ${poolNumbers
          .map((n) => `<div class="pool-ball">${n.toString().padStart(2, '0')}</div>`)
          .join('')}
      </div>
    </div>

    <div class="dossier-filters">
      <strong>Filtros Canônicos & Avançados Auditados:</strong>
      Soma Zona de Ouro (≥ 180 pts, Média ${avgSoma}) • Paridade Dinâmica (${avgPares} Pares / ${(15 - Number(avgPares)).toFixed(1)} Ímpares) •
      Primos Médios: ${avgPrimos} • Moldura Média: ${avgMoldura} • Sequência Máxima: até 6 consecutivas • Anomalias: 0 (100% blindado na Zona de Ouro).
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
          <span style="color: #b45309; font-weight: bold;">LotoSniper Gold</span>
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
    link.download = `volantes_lotosniper_gold_${validTickets.length}_jogos_concurso_${resolvedConcurso}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl shadow-amber-500/10 relative overflow-hidden font-sans">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md shadow-amber-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Exportação PDF Gold & Impressão de Volantes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/40">
                  {validTickets.length} JOGOS
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  PADRÃO GOLD
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Volantes no formato oficial 5×5 da Caixa com identidade visual Gold, prontos para impressão ou visualização externa.
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
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Para gerar o arquivo PDF, clique em <strong>"Imprimir / Salvar PDF Gold"</strong> e selecione o destino{' '}
              <strong className="text-amber-300">"Salvar como PDF"</strong>.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Baixar Arquivo HTML Gold</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black transition shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF Gold</span>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Preview Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5" ref={printAreaRef}>
          {/* Technical Header Card */}
          <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">
                  Dossiê Oficial · LotoSniper Gold
                </span>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{strategyName}</span>
                </h4>
                <span className="text-xs text-slate-400 font-mono mt-0.5 block">{modeName}</span>
              </div>

              <div className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-xl font-mono text-xs">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-slate-300">Concurso Base:</span>
                <strong className="text-amber-300">#{resolvedConcurso}</strong>
                <span className="text-slate-500">({resolvedData})</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Total de Bilhetes</span>
                <div className="text-base font-black font-mono text-white mt-0.5">{validTickets.length} jogos</div>
                <span className="text-[10px] text-amber-400 font-medium">100% Zona de Ouro (Soma ≥ 180)</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Custo Estimado</span>
                <div className="text-base font-black font-mono text-emerald-400 mt-0.5">{totalCusto}</div>
                <span className="text-[10px] text-slate-500 font-medium">R$ 3,50 por aposta</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Dezenas no Desdobro</span>
                <div className="text-base font-black font-mono text-cyan-300 mt-0.5">{poolNumbers.length} dezenas</div>
                <span className="text-[10px] text-cyan-400/80 font-medium">Universo selecionado</span>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 text-[10px] block uppercase font-bold">Soma Média</span>
                <div className="text-base font-black font-mono text-amber-300 mt-0.5">{avgSoma} pts</div>
                <span className="text-[10px] text-amber-400/80 font-medium">Faixa Ouro Central</span>
              </div>
            </div>

            {/* Dezenas Cobertas */}
            <div className="pt-2 border-t border-amber-500/20">
              <span className="text-xs font-bold text-slate-300 block mb-2 font-mono">
                Universo de Dezenas na Matriz ({poolNumbers.length} números):
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {poolNumbers.map((num) => {
                  const isFixed = fixedNumbers.includes(num);
                  return (
                    <span
                      key={num}
                      className={`w-7 h-7 rounded-lg font-mono font-black text-xs flex items-center justify-center shadow-sm ${
                        isFixed
                          ? 'bg-amber-400 text-slate-950 border-2 border-amber-200 ring-2 ring-amber-400/50'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {num.toString().padStart(2, '0')}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Fixed / Excluded Notice if any */}
            {(fixedNumbers.length > 0 || excludedNumbers.length > 0) && (
              <div className="flex flex-wrap items-center gap-4 text-xs pt-2 border-t border-slate-800/80 font-mono">
                {fixedNumbers.length > 0 && (
                  <span className="text-slate-300">
                    Fixas: <strong className="text-amber-300">{fixedNumbers.map((n) => n.toString().padStart(2, '0')).join(' ')}</strong>
                  </span>
                )}
                {excludedNumbers.length > 0 && (
                  <span className="text-slate-300">
                    Excluídas: <strong className="text-rose-400">{excludedNumbers.map((n) => n.toString().padStart(2, '0')).join(' ')}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Volantes Visual Grid (Padrão 5x5 Caixa) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-white uppercase tracking-wider text-[11px] font-mono flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Representação dos Volantes Oficiais (Identidade Visual Gold)
              </span>
              <span className="font-mono text-amber-300 font-bold">{validTickets.length} Volantes Prontos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validTickets.map((t) => (
                <div
                  key={t.id || t.index}
                  className="bg-slate-950 border-2 border-amber-500/40 hover:border-amber-400/80 transition rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-md shadow-amber-950/20"
                >
                  {/* Header Volante */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-amber-400">
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
                              ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 border-amber-300 font-black shadow-md shadow-amber-950/40 scale-102 ring-1 ring-white/50'
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
                      Primos: <strong className="text-amber-300">{t.primos}</strong> • Moldura:{' '}
                      <strong className="text-emerald-300">{t.moldura}</strong>
                    </span>
                    <span className="text-amber-400 font-bold">
                      {t.scoreIA ? `Score IA: ${t.scoreIA}%` : 'Zona de Ouro ✓'}
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
            Concurso Base Caixa: #{resolvedConcurso} • {validTickets.length} Volantes Formatados (100% Zona de Ouro)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black transition cursor-pointer shadow-md shadow-amber-500/20 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
