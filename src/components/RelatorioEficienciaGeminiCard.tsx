import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Award,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Flame,
  Layers,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { soundService } from '../services/soundAlert';

interface RelatorioEficienciaGeminiCardProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export interface EfficiencyReportData {
  scoreEficiencia: number;
  classificacao: string;
  diagnosticoGeral: string;
  pontosFortes: string[];
  vulnerabilidades: string[];
  tendencias50Concursos: {
    dezenasSuperQuentes: number[];
    dezenasFrias: number[];
    mediaSoma: number;
    padraoDominante: string;
  };
  ajustesRecomendados: string[];
  dezenasSugeridasFixar: number[];
  dezenasSugeridasAlternar: number[];
  potencialOtimizacaoPercent?: number;
}

export const RelatorioEficienciaGeminiCard: React.FC<RelatorioEficienciaGeminiCardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  onApplyNumbers,
}) => {
  const [report, setReport] = useState<EfficiencyReportData | null>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_gemini_efficiency_report');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem('lotosniper_gemini_efficiency_date');
    } catch {
      return null;
    }
  });

  const allSavedTickets = React.useMemo(() => {
    if (savedTickets && savedTickets.length > 0) return savedTickets;
    const fechamentos = getSavedFechamentos();
    const flat = fechamentos.flatMap((f) => f.tickets);
    return flat.length > 0 ? flat : [];
  }, [savedTickets]);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const historical50 = getHistorical100Draws(latestDraw).slice(0, 50);

      const response = await fetch('/api/ai/efficiency-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          savedTickets: allSavedTickets,
          last50Draws: historical50,
          latestDraw,
        }),
      });

      const json = await response.json();
      if (json && json.report) {
        setReport(json.report);
        const nowStr = new Date().toLocaleString('pt-BR');
        setLastGeneratedAt(nowStr);
        try {
          localStorage.setItem('lotosniper_gemini_efficiency_report', JSON.stringify(json.report));
          localStorage.setItem('lotosniper_gemini_efficiency_date', nowStr);
        } catch {}
        soundService.playGoldenZoneSuccessChime();
      }
    } catch (err) {
      console.error('Erro ao consultar relatório de eficiência Gemini:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!report) return;
    const text = [
      '========================================================',
      `RELATÓRIO DE EFICIÊNCIA LOTOSNIPER • IA GEMINI 3.8 FLASH`,
      '========================================================',
      `Score de Eficiência: ${report.scoreEficiencia}/100 (${report.classificacao})`,
      `Auditoria contra os Últimos 50 Concursos da Caixa Econômica Federal`,
      '',
      'DIAGNÓSTICO GERAL:',
      report.diagnosticoGeral,
      '',
      'TENDÊNCIAS DOS ÚLTIMOS 50 CONCURSOS:',
      `• Dezenas Super Quentes (Top 7): ${report.tendencias50Concursos.dezenasSuperQuentes.join(', ')}`,
      `• Dezenas Frias (Menor Frequência): ${report.tendencias50Concursos.dezenasFrias.join(', ')}`,
      `• Média de Soma: ${report.tendencias50Concursos.mediaSoma}`,
      `• Padrão Dominante: ${report.tendencias50Concursos.padraoDominante}`,
      '',
      'PONTOS FORTES IDENTIFICADOS:',
      ...report.pontosFortes.map((p) => `✓ ${p}`),
      '',
      'VULNERABILIDADES & RISCOS:',
      ...report.vulnerabilidades.map((v) => `⚠ ${v}`),
      '',
      'AJUSTES RECOMENDADOS PELA IA:',
      ...report.ajustesRecomendados.map((a) => `• ${a}`),
      `• Dezenas Sugeridas para Fixar: ${report.dezenasSugeridasFixar.join(', ')}`,
      `• Dezenas Sugeridas para Alternar: ${report.dezenasSugeridasAlternar.join(', ')}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleApplyFixedNumbers = () => {
    if (!report?.dezenasSugeridasFixar) return;
    if (onApplyNumbers) {
      onApplyNumbers(report.dezenasSugeridasFixar);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('switch-tab', {
          detail: { tab: 'fechamento', fixNumbers: report.dezenasSugeridasFixar },
        })
      );
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 rounded-3xl border-2 border-indigo-500/40 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Relatório de Eficiência · IA Gemini 3.8 Flash
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                AUDITORIA 50 CONCURSOS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Diagnóstico de precisão matemática com IA que avalia todos os seus jogos salvos em contraste com os padrões, frequências e desvios dos <strong>últimos 50 sorteios da Lotofácil</strong>, sugerindo correções cirúrgicas de cobertura.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analisando com IA...' : report ? 'Atualizar Laudo Gemini' : 'Gerar Laudo com Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Relatório Renderizado */}
      {report ? (
        <div className="space-y-5 relative z-10 animate-fadeIn">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Score Geral */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-md font-mono shrink-0">
                {Math.round(report.scoreEficiencia)}
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Score de Eficiência</span>
                <strong className="text-sm font-bold text-white block">{report.classificacao}</strong>
                <span className="text-[10px] text-emerald-400 font-mono">
                  +{report.potencialOtimizacaoPercent || 15}% potencial
                </span>
              </div>
            </div>

            {/* Base de Jogos Auditados */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Amostra Analisada</span>
                <strong className="text-sm font-bold text-white block">
                  {allSavedTickets.length} Jogos Salvos
                </strong>
                <span className="text-[10px] text-slate-400 font-mono">
                  {getSavedFechamentos().length} fechamento(s)
                </span>
              </div>
            </div>

            {/* Intervalo de Referência */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Horizonte Histórico</span>
                <strong className="text-sm font-bold text-amber-300 block">Últimos 50 Sorteios</strong>
                <span className="text-[10px] text-slate-400 font-mono">
                  Concurso base #{latestDraw.concurso}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnóstico Geral da IA */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-2">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Diagnóstico Geral da Inteligência Artificial:</span>
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {report.diagnosticoGeral}
            </p>
          </div>

          {/* Tendências dos Últimos 50 Concursos */}
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Tendências Identificadas nos Últimos 50 Concursos</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Dezenas Super Quentes (Top 50)</span>
                <div className="flex flex-wrap gap-1">
                  {report.tendencias50Concursos.dezenasSuperQuentes.map((n) => (
                    <span key={n} className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold text-[11px]">
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Dezenas Menos Frequentes (Frias)</span>
                <div className="flex flex-wrap gap-1">
                  {report.tendencias50Concursos.dezenasFrias.map((n) => (
                    <span key={n} className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono font-bold text-[11px]">
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Média de Soma (50 Sorteios)</span>
                <strong className="text-sm font-mono text-white block">
                  {report.tendencias50Concursos.mediaSoma}
                </strong>
                <span className="text-[10px] text-slate-500">Faixa ideal: 180 a 215</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-slate-400 block">Padrão Dominante</span>
                <strong className="text-xs font-bold text-amber-300 block">
                  {report.tendencias50Concursos.padraoDominante}
                </strong>
              </div>
            </div>
          </div>

          {/* Pontos Fortes e Vulnerabilidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pontos Fortes */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 space-y-2.5">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Pontos Fortes Identificados:</span>
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {report.pontosFortes.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vulnerabilidades */}
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/40 space-y-2.5">
              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Vulnerabilidades & Riscos Detectados:</span>
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {report.vulnerabilidades.map((v, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold shrink-0">⚠</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ajustes Recomendados pela IA */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/40 space-y-3">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Ajustes Cirúrgicos Recomendados pela IA para os Próximos Concursos:</span>
            </span>

            <ul className="space-y-2 text-xs text-slate-200">
              {report.ajustesRecomendados.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold shrink-0">✦</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>

            {/* Dezenas Sugeridas para Fixar e Alternar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              {/* Fixar */}
              <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <span>Dezenas Recomendadas para Fixar:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {report.dezenasSugeridasFixar.map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center justify-center font-mono font-bold text-xs"
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Alternar */}
              <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/30 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <span>Dezenas Recomendadas para Alternar / Evitar:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {report.dezenasSugeridasAlternar.map((n) => (
                    <span
                      key={n}
                      className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center justify-center font-mono font-bold text-xs"
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-mono text-[11px]">
              {lastGeneratedAt ? `Gerado em: ${lastGeneratedAt}` : ''}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyReport}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Laudo'}</span>
              </button>

              <button
                type="button"
                onClick={handleApplyFixedNumbers}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <span>Aplicar Dezenas no Fechamento</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Not Generated State */
        <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white">Nenhum Laudo de Eficiência Gerado Ainda</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Clique no botão acima para acionar a API do Gemini e auditar os seus {allSavedTickets.length} jogos salvos confrontando com os últimos 50 concursos da Caixa.
          </p>
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-xs transition cursor-pointer inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Gerar Relatório de Eficiência com Gemini</span>
          </button>
        </div>
      )}
    </div>
  );
};
