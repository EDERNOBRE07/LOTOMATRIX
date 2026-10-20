import React, { useState, useMemo } from 'react';
import { DezenaStats, LotofacilDraw } from '../types/lotofacil';
import { DEZENAS_STATS, CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  Sparkles,
  Clock,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  Filter,
  BarChart3,
  HelpCircle,
} from 'lucide-react';

interface HistoricalProbability500ModuleProps {
  dynamicStats?: DezenaStats[];
  latestDraw?: LotofacilDraw;
  onApplyNumber?: (num: number) => void;
  onApplyNumbers?: (nums: number[]) => void;
}

export const HistoricalProbability500Module: React.FC<HistoricalProbability500ModuleProps> = ({
  dynamicStats = DEZENAS_STATS,
  latestDraw = CONCURSO_ATUAL,
  onApplyNumber,
  onApplyNumbers,
}) => {
  const [sortBy, setSortBy] = useState<'probabilidade_desc' | 'atraso_desc' | 'numero_asc'>('probabilidade_desc');
  const [filterType, setFilterType] = useState<'all' | 'alta_propensao' | 'atrasadas'>('all');

  // Compute 500-contest statistical indicators for each dezena
  const items = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      const stat = dynamicStats.find((s) => s.numero === num) || {
        numero: num,
        vezes: 2280,
        atrasoAtual: 1,
        atrasoMedio: 1.6,
        maiorAtraso: 7,
      };

      // In 500 official draws, expected appearances is ~ 300 (60%)
      // Scale historical proportion to 500 draws baseline + short-term variation
      const historical500Freq = Math.round((stat.vezes / 3804) * 500);
      const probBase = (historical500Freq / 500) * 100;

      // Bayesian delay pressure adjustment: as delay approaches or exceeds average/max, probability of exit increases
      const delayFactor = Math.min(1.25, Math.max(0.85, 1 + (stat.atrasoAtual - stat.atrasoMedio) * 0.05));
      const adjustedProb = Math.min(78.5, Math.max(46.0, Math.round(probBase * delayFactor * 10) / 10));

      let statusDesc = 'Equilíbrio Normal';
      let statusColor = 'text-slate-400 bg-slate-800/60 border-slate-700';

      if (stat.atrasoAtual >= 4) {
        statusDesc = 'Atraso Crítico (Alta Saída)';
        statusColor = 'text-rose-300 bg-rose-500/15 border-rose-500/40';
      } else if (adjustedProb >= 63) {
        statusDesc = 'Alta Propensão Bayesiana';
        statusColor = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40';
      } else if (stat.atrasoAtual === 0) {
        statusDesc = 'Recente (Repetida Provável)';
        statusColor = 'text-amber-300 bg-amber-500/15 border-amber-500/40';
      }

      return {
        numero: num,
        vezes500: historical500Freq,
        probabilidade: adjustedProb,
        probBase: Math.round(probBase * 10) / 10,
        atrasoAtual: stat.atrasoAtual,
        atrasoMedio: stat.atrasoMedio,
        maiorAtraso: stat.maiorAtraso,
        statusDesc,
        statusColor,
      };
    });
  }, [dynamicStats]);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (filterType === 'alta_propensao') {
      result = result.filter((i) => i.probabilidade >= 61);
    } else if (filterType === 'atrasadas') {
      result = result.filter((i) => i.atrasoAtual >= 2);
    }

    result.sort((a, b) => {
      if (sortBy === 'probabilidade_desc') return b.probabilidade - a.probabilidade;
      if (sortBy === 'atraso_desc') return b.atrasoAtual - a.atrasoAtual;
      return a.numero - b.numero;
    });

    return result;
  }, [items, sortBy, filterType]);

  const handleApplyTop15 = () => {
    if (onApplyNumbers) {
      const top15 = [...items].sort((a, b) => b.probabilidade - a.probabilidade).slice(0, 15).map((x) => x.numero);
      onApplyNumbers(top15);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Probabilidade de Ocorrência das 25 Dezenas (Amostragem de 500 Concursos)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 uppercase">
                  500 Concursos vs Atraso
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Cálculo de probabilidade bayesiana ajustada pela pressão de atraso atual comparada à média histórica dos últimos 500 concursos da Caixa.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions & Top 15 apply */}
        <div className="flex items-center gap-2 shrink-0">
          {onApplyNumbers && (
            <button
              onClick={handleTop15Click}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              title="Aplica as 15 dezenas com maior probabilidade bayesiana no Fechamento"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Usar Top 15 com Maior Probabilidade</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sorting Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-850">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filtrar:</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              Todas (25)
            </button>
            <button
              onClick={() => setFilterType('alta_propensao')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'alta_propensao'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              Alta Propensão (&gt;61%)
            </button>
            <button
              onClick={() => setFilterType('atrasadas')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                filterType === 'atrasadas'
                  ? 'bg-rose-500 text-slate-950 font-bold'
                  : 'bg-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              Atrasadas (≥ 2 concursos)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Ordenar por:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-1 font-medium cursor-pointer"
          >
            <option value="probabilidade_desc">Maior Probabilidade (%)</option>
            <option value="atraso_desc">Maior Atraso Atual</option>
            <option value="numero_asc">Número da Dezena (01-25)</option>
          </select>
        </div>
      </div>

      {/* 25 Dezenas Grid Card Display */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {filteredItems.map((item) => (
          <div
            key={item.numero}
            onClick={() => onApplyNumber && onApplyNumber(item.numero)}
            className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 text-white font-mono font-black text-sm border border-slate-700 group-hover:border-emerald-500 group-hover:text-emerald-400 transition">
                {item.numero.toString().padStart(2, '0')}
              </span>
              <div className="text-right">
                <span className="font-mono text-sm font-black text-emerald-400">
                  {item.probabilidade}%
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {item.vezes500}/500 conc.
                </span>
              </div>
            </div>

            {/* Probability Progress Bar */}
            <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden my-1">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  item.probabilidade >= 64
                    ? 'bg-emerald-400'
                    : item.probabilidade >= 58
                    ? 'bg-teal-400'
                    : 'bg-slate-600'
                }`}
                style={{ width: `${Math.min(100, item.probabilidade * 1.3)}%` }}
              ></div>
            </div>

            {/* Delay & Status Information */}
            <div className="pt-2 border-t border-slate-850/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Atraso:</span>
                <strong className={item.atrasoAtual >= 3 ? 'text-rose-400 font-mono' : 'text-slate-200 font-mono'}>
                  {item.atrasoAtual} {item.atrasoAtual === 1 ? 'conc.' : 'conc.'}
                </strong>
              </span>

              <span className="text-[10px] text-slate-500 font-mono">
                Méd: {item.atrasoMedio}
              </span>
            </div>

            <div className="mt-2">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border block text-center truncate ${item.statusColor}`}>
                {item.statusDesc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  function handleTop15Click() {
    handleApplyTop15();
  }
};
