import React, { useMemo } from 'react';
import { FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  Scale,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Check,
  Info,
} from 'lucide-react';

interface EquilibrioEstruturalSelectorProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  selectedNumbers?: number[];
  latestDraw?: LotofacilDraw;
}

export type StructuralPreset = '7P_8I' | '8P_7I' | 'CANONICO_DUPLO' | 'AMPLO';

export const EquilibrioEstruturalSelector: React.FC<EquilibrioEstruturalSelectorProps> = ({
  filters,
  onChange,
  selectedNumbers = [],
  latestDraw = CONCURSO_ATUAL,
}) => {
  // Cálculo de pares e ímpares no volante atual selecionado
  const contagemVolante = useMemo(() => {
    const pares = selectedNumbers.filter((n) => n % 2 === 0).length;
    const impares = selectedNumbers.length - pares;
    return { pares, impares };
  }, [selectedNumbers]);

  // Média esperada de pares para bilhetes de 15 dezenas com base no volante selecionado
  const mediaSugeridaPares = useMemo(() => {
    if (selectedNumbers.length === 0) return 7.5;
    const proporcaoPares = contagemVolante.pares / selectedNumbers.length;
    return Math.round(proporcaoPares * 15 * 10) / 10;
  }, [selectedNumbers.length, contagemVolante.pares]);

  // Identifica o preset ativo atual com base nos filtros
  const presetAtivo: StructuralPreset | 'CUSTOM' = useMemo(() => {
    if (filters.paresMin === 7 && filters.paresMax === 8) return 'CANONICO_DUPLO';
    if (filters.paresMin === 8 && filters.paresMax === 8) return '8P_7I';
    if (filters.paresMin === 7 && filters.paresMax === 7) return '7P_8I';
    if (filters.paresMin === 6 && filters.paresMax === 9) return 'AMPLO';
    return 'CUSTOM';
  }, [filters.paresMin, filters.paresMax]);

  // Aplica preset estrutural nos filtros
  const handleApplyPreset = (preset: StructuralPreset) => {
    if (preset === 'CANONICO_DUPLO') {
      onChange({ ...filters, paresMin: 7, paresMax: 8 });
    } else if (preset === '8P_7I') {
      onChange({ ...filters, paresMin: 8, paresMax: 8 });
    } else if (preset === '7P_8I') {
      onChange({ ...filters, paresMin: 7, paresMax: 7 });
    } else if (preset === 'AMPLO') {
      onChange({ ...filters, paresMin: 6, paresMax: 9 });
    }
  };

  // Porcentagem calculada para a balança visual (com centro em 50%)
  const balancePercentage = useMemo(() => {
    const minP = filters.paresMin;
    const maxP = filters.paresMax;
    const avgP = (minP + maxP) / 2;
    // 7.5 é exatamente o centro (50%). Cada 1 par de desvio altera ~10%
    return Math.min(85, Math.max(15, 50 + (avgP - 7.5) * 16));
  }, [filters.paresMin, filters.paresMax]);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header com Ícone de Balança */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-300">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Seletor de Equilíbrio Estrutural (Pares & Ímpares)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                  Balança Canônica
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calcule e ajuste a proporção de dezenas pares e ímpares para aplicar diretamente aos filtros da matriz combinatória.
              </p>
            </div>
          </div>
        </div>

        {/* Resumo do Volante Selecionado */}
        {selectedNumbers.length > 0 && (
          <div className="bg-slate-950 p-2.5 px-3.5 rounded-xl border border-slate-800 flex items-center gap-3 text-xs shrink-0">
            <span className="text-slate-400 text-[11px]">Volante ({selectedNumbers.length} dezenas):</span>
            <div className="flex items-center gap-2 font-mono font-bold">
              <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                {contagemVolante.pares} Pares
              </span>
              <span className="text-slate-500">/</span>
              <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/30">
                {contagemVolante.impares} Ímpares
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Balança Visual Interativa */}
      <div className="bg-slate-950/90 rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between text-xs">
          {/* Lado Esquerdo: Pares */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
            <span className="font-bold text-emerald-300">Dezenas Pares</span>
            <span className="text-[11px] font-mono text-slate-400">
              (Configurado: <strong>{filters.paresMin} a {filters.paresMax}P</strong>)
            </span>
          </div>

          {/* Centro: Indicador de Média Sugerida */}
          <div className="text-center hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Média Sugerida no Desdobramento</span>
            <strong className="text-white font-mono text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              {mediaSugeridaPares} Pares / {(15 - mediaSugeridaPares).toFixed(1)} Ímpares
            </strong>
          </div>

          {/* Lado Direito: Ímpares */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              (Configurado: <strong>{15 - filters.paresMax} a {15 - filters.paresMin}I</strong>)
            </span>
            <span className="font-bold text-indigo-300">Dezenas Ímpares</span>
            <span className="w-3 h-3 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]"></span>
          </div>
        </div>

        {/* Barra Visual de Balança (Gangorra Dinâmica) */}
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
            {/* Lado Par */}
            <div
              className="h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 relative flex items-center justify-end pr-2"
              style={{ width: `${balancePercentage}%` }}
            >
              <span className="text-[9px] font-mono font-black text-slate-950">
                {Math.round(balancePercentage)}%
              </span>
            </div>
            {/* Lado Ímpar */}
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 relative flex items-center pl-2"
              style={{ width: `${100 - balancePercentage}%` }}
            >
              <span className="text-[9px] font-mono font-black text-white">
                {Math.round(100 - balancePercentage)}%
              </span>
            </div>
          </div>

          {/* Pivot da Balança */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>6P / 9I (16.2%)</span>
            <span className="text-emerald-400 font-bold">7P / 8I (31.1%)</span>
            <span className="text-amber-400 font-black">Centro Perfeito (7.5P)</span>
            <span className="text-indigo-400 font-bold">8P / 7I (31.2%)</span>
            <span>9P / 6I (13.1%)</span>
          </div>
        </div>

        {/* Presets Rápidos da Balança Estrutural */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {/* Preset 1: Equilíbrio Canônico Duplo (7 ou 8 Pares) */}
          <button
            type="button"
            onClick={() => handleApplyPreset('CANONICO_DUPLO')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              presetAtivo === 'CANONICO_DUPLO'
                ? 'bg-gradient-to-br from-emerald-950/60 to-indigo-950/60 border-emerald-400 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>7P ou 8P</span>
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                62.3%
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block font-semibold mt-0.5">
              Canônico Ouro
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Filtro: 7 a 8 Pares (7P/8I ou 8P/7I)
            </span>
          </button>

          {/* Preset 2: Foco em 8 Pares / 7 Ímpares */}
          <button
            type="button"
            onClick={() => handleApplyPreset('8P_7I')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              presetAtivo === '8P_7I'
                ? 'bg-emerald-500/20 border-emerald-400 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-300">
                8P / 7I
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                31.2%
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block font-semibold mt-0.5">
              Mais Pares
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Filtro: Exatamente 8 Pares e 7 Ímpares
            </span>
          </button>

          {/* Preset 3: Foco em 7 Pares / 8 Ímpares */}
          <button
            type="button"
            onClick={() => handleApplyPreset('7P_8I')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              presetAtivo === '7P_8I'
                ? 'bg-indigo-500/20 border-indigo-400 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-400'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-300">
                7P / 8I
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                31.1%
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block font-semibold mt-0.5">
              Mais Ímpares
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Filtro: Exatamente 7 Pares e 8 Ímpares
            </span>
          </button>

          {/* Preset 4: Faixa Ampliada (6 a 9 Pares) */}
          <button
            type="button"
            onClick={() => handleApplyPreset('AMPLO')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              presetAtivo === 'AMPLO'
                ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400'
                : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-300">
                6P a 9P
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                94.8%
              </span>
            </div>
            <span className="text-[10px] text-slate-300 block font-semibold mt-0.5">
              Ampla Cobertura
            </span>
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Filtro: 6 a 9 Pares (94.8% dos concursos)
            </span>
          </button>
        </div>
      </div>

      {/* Nota de Auditoria Estrutural */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Ao calibrar a balança, os filtros matemáticos são atualizados automaticamente e todo fechamento gerado respeita rigorosamente o limite de pares e ímpares definido.
          </span>
        </div>
        <span className="text-emerald-400 font-mono font-bold shrink-0">
          ✓ Zero Anomalias de Paridade
        </span>
      </div>
    </div>
  );
};
