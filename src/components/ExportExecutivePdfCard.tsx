import React, { useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Layers,
  Settings,
  ShieldCheck,
  Check,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { downloadExecutivePerformancePDF } from '../services/configExecutivePdfGenerator';
import { EfficiencyReportData } from './RelatorioEficienciaGeminiCard';
import { soundService } from '../services/soundAlert';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';

interface ExportExecutivePdfCardProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  efficiencyReport?: EfficiencyReportData | null;
}

export const ExportExecutivePdfCard: React.FC<ExportExecutivePdfCardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  efficiencyReport,
}) => {
  const [includeGeminiAnalysis, setIncludeGeminiAnalysis] = useState<boolean>(true);
  const [includeROICharts, setIncludeROICharts] = useState<boolean>(true);
  const [includeTicketsSummary, setIncludeTicketsSummary] = useState<boolean>(true);
  const [minBetValue, setMinBetValue] = useState<number>(VALOR_APOSTA_LOTOFACIL);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  const fechamentos = getSavedFechamentos();
  const allTickets = fechamentos.flatMap((f) => f.tickets);
  const targetTickets = allTickets.length > 0 ? allTickets : savedTickets;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      // Pequeno timeout para permitir que o spinner renderize suavemente
      await new Promise((r) => setTimeout(r, 350));

      downloadExecutivePerformancePDF({
        savedTickets: targetTickets,
        latestDraw,
        efficiencyReport,
        includeGeminiAnalysis,
        includeROICharts,
        includeTicketsSummary,
        minBetValue,
      });

      soundService.playGoldenZoneSuccessChime();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4500);
    } catch (err) {
      console.error('Erro ao gerar PDF executivo:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-3xl border-2 border-indigo-500/40 p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white">
                Exportação de Relatório Executivo em PDF
              </h3>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PDF PROFISSIONAL
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Gere um documento portátil completo contendo o <strong>resumo da performance dos jogos salvos</strong>, as <strong>análises e diagnósticos da IA Gemini</strong> e os <strong>gráficos visuais de ROI</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Opções de Customização do Relatório */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs relative z-10">
        {/* Opção 1: Resumo dos Jogos */}
        <label className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 cursor-pointer hover:border-slate-700 transition">
          <input
            type="checkbox"
            checked={includeTicketsSummary}
            onChange={(e) => setIncludeTicketsSummary(e.target.checked)}
            className="mt-0.5 accent-indigo-500 rounded"
          />
          <div className="space-y-0.5">
            <strong className="text-white block font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Resumo de Performance</span>
            </strong>
            <span className="text-[11px] text-slate-400 block leading-tight">
              Investimento total, acertos esperados/auditados e premiações das apostas.
            </span>
          </div>
        </label>

        {/* Opção 2: Análises Gemini */}
        <label className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 cursor-pointer hover:border-purple-500/40 transition">
          <input
            type="checkbox"
            checked={includeGeminiAnalysis}
            onChange={(e) => setIncludeGeminiAnalysis(e.target.checked)}
            className="mt-0.5 accent-purple-500 rounded"
          />
          <div className="space-y-0.5">
            <strong className="text-white block font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Análises do Gemini</span>
            </strong>
            <span className="text-[11px] text-slate-400 block leading-tight">
              Score de Eficiência, laudo dos 50 concursos e calibração de fine-tuning.
            </span>
          </div>
        </label>

        {/* Opção 3: Gráficos de ROI */}
        <label className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-2.5 cursor-pointer hover:border-emerald-500/40 transition">
          <input
            type="checkbox"
            checked={includeROICharts}
            onChange={(e) => setIncludeROICharts(e.target.checked)}
            className="mt-0.5 accent-emerald-500 rounded"
          />
          <div className="space-y-0.5">
            <strong className="text-white block font-bold flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gráficos & Tabelas de ROI</span>
            </strong>
            <span className="text-[11px] text-slate-400 block leading-tight">
              Evolução histórica de custos vs prêmios e lucro líquido acumulado.
            </span>
          </div>
        </label>
      </div>

      {/* Seletor de Custo da Aposta & Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 relative z-10">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Valor Base por Aposta:</span>
          <select
            value={minBetValue}
            onChange={(e) => setMinBetValue(parseFloat(e.target.value))}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value={3.50}>R$ 3,50 (Padrão 15 Dezenas)</option>
            <option value={56.00}>R$ 56,00 (16 Dezenas)</option>
            <option value={476.00}>R$ 476,00 (17 Dezenas)</option>
          </select>
          <span className="text-slate-400 text-[11px]">
            ({targetTickets.length} jogos = R$ {(targetTickets.length * minBetValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {downloadSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>Download Concluído!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating || targetTickets.length === 0}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
              isGenerating
                ? 'bg-indigo-600 text-white cursor-wait opacity-80'
                : targetTickets.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25'
            }`}
          >
            <Download className={`w-4 h-4 ${isGenerating ? 'animate-bounce' : ''}`} />
            <span>{isGenerating ? 'Compilando Documento PDF...' : 'Gerar e Baixar Relatório Executivo (.PDF)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
