import React from 'react';
import { Calendar, Clock, Filter, Sparkles, TrendingUp, Compass } from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';

export type TimeRangeInterval = '30_dias' | '90_dias' | '6_meses' | '1_ano' | 'todo_historico';

export interface TimeRangeConfigItem {
  id: TimeRangeInterval;
  label: string;
  shortLabel: string;
  drawCount: number;
  description: string;
  badge: string;
}

export const TIME_RANGE_OPTIONS: TimeRangeConfigItem[] = [
  {
    id: '30_dias',
    label: 'Últimos 30 dias',
    shortLabel: '30 Dias',
    drawCount: 25,
    description: 'Análise de curto prazo (~25 concursos)',
    badge: 'Curto Prazo',
  },
  {
    id: '90_dias',
    label: 'Últimos 90 dias',
    shortLabel: '90 Dias',
    drawCount: 65,
    description: 'Análise trimestral (~65 concursos)',
    badge: 'Trimestral',
  },
  {
    id: '6_meses',
    label: 'Últimos 6 meses',
    shortLabel: '6 Meses',
    drawCount: 130,
    description: 'Análise semestral (~130 concursos)',
    badge: 'Médio Prazo',
  },
  {
    id: '1_ano',
    label: 'Último 1 ano',
    shortLabel: '1 Ano',
    drawCount: 250,
    description: 'Análise anual consolidada (~250 concursos)',
    badge: 'Anual',
  },
  {
    id: 'todo_historico',
    label: 'Todo o histórico',
    shortLabel: 'Todo Histórico',
    drawCount: 350,
    description: 'Macro visão histórica completa (~350 concursos)',
    badge: 'Macro Histórico',
  },
];

interface FiltroIntervaloTempoEstatisticasProps {
  value: TimeRangeInterval;
  onChange: (val: TimeRangeInterval) => void;
  latestDraw?: LotofacilDraw;
  compact?: boolean;
  className?: string;
}

export const FiltroIntervaloTempoEstatisticas: React.FC<FiltroIntervaloTempoEstatisticasProps> = ({
  value,
  onChange,
  latestDraw = CONCURSO_ATUAL,
  compact = false,
  className = '',
}) => {
  const activeOption = TIME_RANGE_OPTIONS.find((opt) => opt.id === value) || TIME_RANGE_OPTIONS[0];
  const startConcurso = Math.max(1, latestDraw.concurso - activeOption.drawCount + 1);

  return (
    <div
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl transition ${
        compact ? 'p-2.5' : 'p-3.5'
      } ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Lado Esquerdo: Identificação e Contexto */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Filtro de Intervalo Temporal
              </span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                {activeOption.badge}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Concursos <span className="text-emerald-400 font-bold">#{startConcurso}</span> até{' '}
              <span className="text-emerald-400 font-bold">#{latestDraw.concurso}</span> ({activeOption.drawCount}{' '}
              sorteios avaliados)
            </p>
          </div>
        </div>

        {/* Lado Direito: Botões Segmentados de Intervalo */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {TIME_RANGE_OPTIONS.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 ring-1 ring-emerald-300'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={`${opt.label}: ${opt.description}`}
              >
                <Clock className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
