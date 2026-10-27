import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import {
  BarChart3,
  Flame,
  Snowflake,
  Scale,
  Sparkles,
  ArrowUpDown,
  Filter,
  Check,
  Copy,
  Info,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface FrequenciaVinteConcursosComponentProps {
  latestDraw?: LotofacilDraw;
  recentDraws?: LotofacilDraw[];
  dynamicStats?: DezenaStats[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export interface DezenaFreq20 {
  numero: number;
  label: string;
  frequencia: number; // 0 a 20
  percentual: number; // 0 a 100%
  status: 'quente' | 'fria' | 'neutra';
  atrasoAtual: number;
  ultimoConcursoPresente: boolean;
  ePrimo: boolean;
  eMoldura: boolean;
  eFibonacci: boolean;
}

export const FrequenciaVinteConcursosComponent: React.FC<FrequenciaVinteConcursosComponentProps> = ({
  latestDraw = CONCURSO_ATUAL,
  recentDraws = RECENT_DRAWS,
  dynamicStats,
  onApplyNumbers,
}) => {
  const [sortOrder, setSortOrder] = useState<'numero' | 'frequencia_desc' | 'frequencia_asc'>('numero');
  const [statusFilter, setStatusFilter] = useState<'all' | 'quente' | 'fria' | 'neutra'>('all');
  const [copiedRanking, setCopiedRanking] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Considerar exatamente os últimos 20 concursos
  const window20Draws = useMemo(() => {
    const list = recentDraws && recentDraws.length > 0 ? recentDraws : [latestDraw];
    return list.slice(0, 20);
  }, [recentDraws, latestDraw]);

  const totalConcursos = window20Draws.length;
  const concursoMaisRecente = window20Draws[0]?.concurso || latestDraw.concurso;
  const concursoMaisAntigo = window20Draws[window20Draws.length - 1]?.concurso || (latestDraw.concurso - 19);

  // Calcular a frequência exata das 25 dezenas nos últimos 20 concursos
  const dezenasAnalysis = useMemo<DezenaFreq20[]>(() => {
    const result: DezenaFreq20[] = [];

    for (let n = 1; n <= 25; n++) {
      let freq = 0;
      let atraso = 0;
      let achouAtraso = false;

      for (let i = 0; i < window20Draws.length; i++) {
        const draw = window20Draws[i];
        if (draw.dezenas.includes(n)) {
          freq++;
          if (!achouAtraso) {
            atraso = i;
            achouAtraso = true;
          }
        }
      }

      if (!achouAtraso) {
        atraso = window20Draws.length; // Não saiu em nenhum dos 20 concursos
      }

      const pct = totalConcursos > 0 ? (freq / totalConcursos) * 100 : 0;
      const ultimoConcursoPresente = window20Draws[0]?.dezenas.includes(n) || false;

      // Classificação matemática de temperatura em janela de 20 concursos:
      // Média teórica é 12 saídas (60%).
      // Quente: >= 14 saídas (>= 70%)
      // Fria: <= 9 saídas (<= 45%)
      // Neutra: 10 a 13 saídas (50% a 65%)
      let status: 'quente' | 'fria' | 'neutra' = 'neutra';
      if (freq >= 14) {
        status = 'quente';
      } else if (freq <= 9) {
        status = 'fria';
      }

      result.push({
        numero: n,
        label: n.toString().padStart(2, '0'),
        frequencia: freq,
        percentual: Math.round(pct * 10) / 10,
        status,
        atrasoAtual: atraso,
        ultimoConcursoPresente,
        ePrimo: PRIMOS.includes(n),
        eMoldura: MOLDURA.includes(n),
        eFibonacci: FIBONACCI.includes(n),
      });
    }

    return result;
  }, [window20Draws, totalConcursos]);

  // Listas de destaque
  const dezenasQuentes = useMemo(() => dezenasAnalysis.filter((d) => d.status === 'quente'), [dezenasAnalysis]);
  const dezenasFrias = useMemo(() => dezenasAnalysis.filter((d) => d.status === 'fria'), [dezenasAnalysis]);
  const dezenasNeutras = useMemo(() => dezenasAnalysis.filter((d) => d.status === 'neutra'), [dezenasAnalysis]);

  // Dados ordenados e filtrados para o Recharts
  const chartData = useMemo(() => {
    let filtered = [...dezenasAnalysis];
    if (statusFilter !== 'all') {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    if (sortOrder === 'frequencia_desc') {
      filtered.sort((a, b) => b.frequencia - a.frequencia || a.numero - b.numero);
    } else if (sortOrder === 'frequencia_asc') {
      filtered.sort((a, b) => a.frequencia - b.frequencia || a.numero - b.numero);
    } else {
      filtered.sort((a, b) => a.numero - b.numero);
    }

    return filtered;
  }, [dezenasAnalysis, sortOrder, statusFilter]);

  // Cores personalizadas para as barras
  const getBarColor = (item: DezenaFreq20) => {
    if (item.status === 'quente') {
      if (item.frequencia >= 16) return '#f43f5e'; // Rose intensa (Super Quente)
      return '#f97316'; // Laranja Flame (Quente)
    }
    if (item.status === 'fria') {
      if (item.frequencia <= 7) return '#3b82f6'; // Azul royal (Gelo profundo)
      return '#0284c7'; // Azul ciano (Fria)
    }
    return '#10b981'; // Esmeralda (Equilibrada/Neutra)
  };

  // Copiar ranking para a área de transferência
  const handleCopyRanking = () => {
    const sorted = [...dezenasAnalysis].sort((a, b) => b.frequencia - a.frequencia);
    const text = [
      `📊 FREQUÊNCIA DAS 25 DEZENAS - LOTOFÁCIL (Últimos ${totalConcursos} Concursos #${concursoMaisAntigo} ao #${concursoMaisRecente})`,
      `Média Teórica: 12 saídas (60%)\n`,
      `🔥 DEZENAS QUENTES (>= 14 saídas):`,
      ...dezenasQuentes.map((d) => `• Dezena ${d.label}: ${d.frequencia} saídas (${d.percentual}%) - Atraso: ${d.atrasoAtual} conc.`),
      `\n❄️ DEZENAS FRIAS (<= 9 saídas):`,
      ...dezenasFrias.map((d) => `• Dezena ${d.label}: ${d.frequencia} saídas (${d.percentual}%) - Atraso: ${d.atrasoAtual} conc.`),
      `\n⚖️ DEZENAS NEUTRAS (10 a 13 saídas):`,
      ...dezenasNeutras.map((d) => `• Dezena ${d.label}: ${d.frequencia} saídas (${d.percentual}%)`),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedRanking(true);
    setTimeout(() => setCopiedRanking(false), 2000);
  };

  // Aplicar dezenas quentes diretamente no fechamento
  const handleApplyQuentes = () => {
    if (!onApplyNumbers) return;
    const nums = dezenasQuentes.map((d) => d.numero);
    onApplyNumbers(nums);
    soundService.playGoldenZoneSuccessChime();
    setActionNotice(`✓ ${nums.length} Dezenas Quentes [${nums.map(n => n.toString().padStart(2, '0')).join(', ')}] enviadas para o Fechamento!`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/20">
              <Flame className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Frequência das 25 Dezenas nos Últimos 20 Concursos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 uppercase font-bold">
                  Concursos #{concursoMaisAntigo} a #{concursoMaisRecente}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Gráfico interativo com destaque para dezenas <strong className="text-rose-400">Quentes</strong> (alta frequência),{' '}
                <strong className="text-sky-400">Frias</strong> (baixa ocorrência) e <strong className="text-emerald-400">Neutras</strong> (média de 12 saídas).
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {onApplyNumbers && (
            <button
              type="button"
              onClick={handleApplyQuentes}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-400 hover:to-rose-400 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-rose-500/20 flex items-center gap-1.5 active:scale-95"
              title="Aplica as dezenas quentes no volante de fechamento"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Fixar Quentes ({dezenasQuentes.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyRanking}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
            title="Copiar relatório estatístico dos 20 concursos"
          >
            {copiedRanking ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Ranking</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 shadow-md">
          <span>{actionNotice}</span>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-emerald-400 hover:text-white font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards: Quentes, Frias, Neutras & Média Teórica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Dezenas Quentes */}
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-rose-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400 fill-rose-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Dezenas Quentes</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              ≥ 14 Saídas (70%+)
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-rose-400 font-mono">
              {dezenasQuentes.length} <span className="text-xs text-slate-400 font-normal">dezenas</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Média: {dezenasQuentes.length > 0 ? (dezenasQuentes.reduce((s, d) => s + d.frequencia, 0) / dezenasQuentes.length).toFixed(1) : 0} saídas
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
            {dezenasQuentes.map((d) => (
              <span
                key={d.numero}
                className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30"
                title={`Dezena ${d.label}: ${d.frequencia} vezes nos últimos 20 concursos`}
              >
                {d.label} ({d.frequencia}x)
              </span>
            ))}
          </div>
        </div>

        {/* Card 2: Dezenas Frias */}
        <div className="bg-gradient-to-br from-sky-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-sky-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Snowflake className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Dezenas Frias</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              ≤ 9 Saídas (≤ 45%)
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-sky-400 font-mono">
              {dezenasFrias.length} <span className="text-xs text-slate-400 font-normal">dezenas</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Média: {dezenasFrias.length > 0 ? (dezenasFrias.reduce((s, d) => s + d.frequencia, 0) / dezenasFrias.length).toFixed(1) : 0} saídas
            </span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
            {dezenasFrias.map((d) => (
              <span
                key={d.numero}
                className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold border border-sky-500/30"
                title={`Dezena ${d.label}: apenas ${d.frequencia} vezes nos últimos 20 concursos`}
              >
                {d.label} ({d.frequencia}x)
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: Dezenas Neutras */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Neutras / Equilibradas</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              10 a 13 Saídas
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {dezenasNeutras.length} <span className="text-xs text-slate-400 font-normal">dezenas</span>
            </div>
            <span className="text-[11px] text-slate-400">Oscilação natural Caixa</span>
          </div>
          <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-800/80">
            {dezenasNeutras.slice(0, 8).map((d) => (
              <span
                key={d.numero}
                className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-semibold border border-emerald-500/20"
              >
                {d.label}
              </span>
            ))}
            {dezenasNeutras.length > 8 && (
              <span className="text-[10px] text-slate-500 font-mono self-center">
                +{dezenasNeutras.length - 8} outras
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Média Teórica e Parâmetros */}
        <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Média Teórica</span>
            </div>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              12,0 SAÍDAS (60%)
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Como cada concurso sorteia 15 de 25 bolas, em 20 concursos são sorteadas 300 dezenas, resultando em{' '}
            <strong className="text-white">12 saídas esperadas</strong> por dezena.
          </p>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span>Janela: <strong className="text-slate-200">20 concursos</strong></span>
            <span>Universo: <strong className="text-slate-200">300 bolas</strong></span>
          </div>
        </div>
      </div>

      {/* Control Bar: Sorting & Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtro:</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas ({dezenasAnalysis.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('quente')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'quente'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <Flame className="w-3 h-3 fill-current" />
            <span>Quentes ({dezenasQuentes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('fria')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'fria'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-sky-400 hover:bg-sky-500/10'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            <span>Frias ({dezenasFrias.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('neutra')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              statusFilter === 'neutra'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <Scale className="w-3 h-3" />
            <span>Neutras ({dezenasNeutras.length})</span>
          </button>
        </div>

        {/* Sorter */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Ordenar:</span>
          </span>
          <button
            type="button"
            onClick={() => setSortOrder('numero')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              sortOrder === 'numero'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            01 a 25
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('frequencia_desc')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              sortOrder === 'frequencia_desc'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Flame className="w-3 h-3 fill-current" />
            <span>Mais Quentes</span>
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('frequencia_asc')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              sortOrder === 'frequencia_asc'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            <span>Mais Frias</span>
          </button>
        </div>
      </div>

      {/* Main Bar Chart (Recharts) */}
      <div className="h-80 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 10, left: -15, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              domain={[0, 20]}
              ticks={[0, 4, 8, 12, 16, 20]}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload as DezenaFreq20;
                return (
                  <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[210px] backdrop-blur-md">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center justify-center text-sm">
                          {d.label}
                        </span>
                        <span className="text-white font-bold">Dezena {d.label}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          d.status === 'quente'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : d.status === 'fria'
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {d.status === 'quente' ? '🔥 Quente' : d.status === 'fria' ? '❄️ Fria' : '⚖️ Neutra'}
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Frequência:</span>
                        <strong className="text-white">
                          {d.frequencia} de {totalConcursos} ({d.percentual}%)
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Atraso Atual:</span>
                        <span className={d.atrasoAtual === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {d.atrasoAtual === 0 ? 'Saiu no último sorteio' : `${d.atrasoAtual} concursos sem sair`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Desvio da Média (12):</span>
                        <span className={d.frequencia >= 12 ? 'text-rose-400 font-bold' : 'text-sky-400 font-bold'}>
                          {d.frequencia >= 12 ? `+${d.frequencia - 12}` : `${d.frequencia - 12}`} saídas
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800 text-[9px] font-mono">
                      {d.ePrimo && <span className="px-1 py-0.2 rounded bg-purple-500/20 text-purple-300">Primo</span>}
                      {d.eMoldura && <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">Moldura</span>}
                      {d.eFibonacci && <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">Fibonacci</span>}
                    </div>
                  </div>
                );
              }}
            />
            {/* Linha da Média Teórica Esperada (12) */}
            <ReferenceLine
              y={12}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Média Esperada: 12 saídas (60%)',
                fill: '#10b981',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Bar dataKey="frequencia" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.numero}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend & Legend Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500"></span>
            <span className="text-slate-300">Quente (≥ 14 saídas • 70%+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500"></span>
            <span className="text-slate-300">Neutra / Equilibrada (10 a 13 saídas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-500"></span>
            <span className="text-slate-300">Fria (≤ 9 saídas • ≤ 45%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-emerald-400"></span>
            <span className="text-emerald-400 font-mono text-[11px]">Média Teórica Caixa (12)</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Visualizando {chartData.length} de 25 dezenas
        </span>
      </div>
    </div>
  );
};
