import React from 'react';
import { FilterCriteria } from '../types/lotofacil';
import { Sliders, CheckCircle2, RotateCcw, Info } from 'lucide-react';
import { DEFAULT_FILTERS } from '../services/combinatorics';

interface FilterControlsProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  onReset: () => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const update = (partial: Partial<FilterCriteria>) => {
    onChange({ ...filters, ...partial });
  };

  const applyCalibrated3804Preset = () => {
    onChange({
      ...filters,
      paresMin: 7,
      paresMax: 8,
      primosMin: 4,
      primosMax: 7,
      somaMin: 175,
      somaMax: 220,
      molduraMin: 8,
      molduraMax: 11,
      fibonacciMin: 3,
      fibonacciMax: 5,
      repetidasMin: 8,
      repetidasMax: 10,
      maxConsecutivas: 5,
    });
  };

  const applyStrictPreset = () => {
    onChange({
      ...filters,
      paresMin: 7,
      paresMax: 8,
      primosMin: 5,
      primosMax: 6,
      somaMin: 180,
      somaMax: 210,
      molduraMin: 9,
      molduraMax: 10,
      fibonacciMin: 3,
      fibonacciMax: 5,
      repetidasMin: 8,
      repetidasMax: 10,
      maxConsecutivas: 4,
    });
  };

  const applyWidePreset = () => {
    onChange({
      ...filters,
      paresMin: 6,
      paresMax: 9,
      primosMin: 4,
      primosMax: 7,
      somaMin: 165,
      somaMax: 225,
      molduraMin: 8,
      molduraMax: 11,
      fibonacciMin: 2,
      fibonacciMax: 6,
      repetidasMin: 7,
      repetidasMax: 11,
      maxConsecutivas: 5,
    });
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-white">
            Filtros Matemáticos & Restrições Canônicas
          </h3>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={applyCalibrated3804Preset}
            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition shadow-sm shadow-emerald-500/20 cursor-pointer"
            title="Calibrado com os parâmetros reais do Concurso 3804"
          >
            ★ Assertividade #3804 (Recomendado)
          </button>
          <button
            onClick={applyStrictPreset}
            className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
          >
            Filtros Estritos
          </button>
          <button
            onClick={applyWidePreset}
            className="px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
          >
            Filtros Amplos
          </button>
          <button
            onClick={onReset}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Restaurar Padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400 my-3 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>
          A poda de ramos combinatórios elimina sequências estatisticamente inviáveis
          (ex: 15 pares, jogos sem primos, somas anômalas).
        </span>
      </p>

      {/* Grid of Sliders and Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Pares / Ímpares */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Pares no Bilhete</span>
            <span className="text-emerald-400 font-mono">
              {filters.paresMin} a {filters.paresMax} pares
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mín:</span>
            <input
              type="range"
              min="4"
              max="11"
              value={filters.paresMin}
              onChange={(e) => update({ paresMin: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.paresMin}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
            <span>Máx:</span>
            <input
              type="range"
              min={filters.paresMin}
              max="11"
              value={filters.paresMax}
              onChange={(e) => update({ paresMax: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.paresMax}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            7P/8I e 8P/7I cobrem 56.8% da história da Lotofácil.
          </p>
        </div>

        {/* Números Primos */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Números Primos (de 9)</span>
            <span className="text-purple-400 font-mono">
              {filters.primosMin} a {filters.primosMax} primos
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mín:</span>
            <input
              type="range"
              min="2"
              max="9"
              value={filters.primosMin}
              onChange={(e) => update({ primosMin: parseInt(e.target.value, 10) })}
              className="w-full accent-purple-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.primosMin}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
            <span>Máx:</span>
            <input
              type="range"
              min={filters.primosMin}
              max="9"
              value={filters.primosMax}
              onChange={(e) => update({ primosMax: parseInt(e.target.value, 10) })}
              className="w-full accent-purple-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.primosMax}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            5 ou 6 primos ocorrem em 60.2% dos sorteios oficiais.
          </p>
        </div>

        {/* Moldura (Borda do volante 5x5) */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Moldura (16 dezenas)</span>
            <span className="text-amber-400 font-mono">
              {filters.molduraMin} a {filters.molduraMax} moldura
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mín:</span>
            <input
              type="range"
              min="7"
              max="13"
              value={filters.molduraMin}
              onChange={(e) => update({ molduraMin: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.molduraMin}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
            <span>Máx:</span>
            <input
              type="range"
              min={filters.molduraMin}
              max="13"
              value={filters.molduraMax}
              onChange={(e) => update({ molduraMax: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.molduraMax}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            9 ou 10 na moldura é a faixa estatística mais frequente (~65%).
          </p>
        </div>

        {/* Sequência de Fibonacci */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Fibonacci (1,2,3,5,8,13,21)</span>
            <span className="text-cyan-400 font-mono">
              {filters.fibonacciMin} a {filters.fibonacciMax} dezenas
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mín:</span>
            <input
              type="range"
              min="1"
              max="7"
              value={filters.fibonacciMin}
              onChange={(e) => update({ fibonacciMin: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.fibonacciMin}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
            <span>Máx:</span>
            <input
              type="range"
              min={filters.fibonacciMin}
              max="7"
              value={filters.fibonacciMax}
              onChange={(e) => update({ fibonacciMax: parseInt(e.target.value, 10) })}
              className="w-full accent-cyan-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.fibonacciMax}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Normalmente saem entre 3 a 5 números da sequência áurea.
          </p>
        </div>

        {/* Soma Total das Dezenas */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Soma Total das 15</span>
            <span className="text-emerald-400 font-mono">
              {filters.somaMin} a {filters.somaMax}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mín:</span>
            <input
              type="range"
              min="140"
              max="210"
              step="5"
              value={filters.somaMin}
              onChange={(e) => update({ somaMin: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500"
            />
            <span className="w-6 font-mono text-white text-right">{filters.somaMin}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
            <span>Máx:</span>
            <input
              type="range"
              min={filters.somaMin}
              max="250"
              step="5"
              value={filters.somaMax}
              onChange={(e) => update({ somaMax: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500"
            />
            <span className="w-6 font-mono text-white text-right">{filters.somaMax}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            A curva de Gauss centraliza em 195 (faixa canônica 180 a 215).
          </p>
        </div>

        {/* Repetidas do Concurso Anterior (3800) */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-300">Repetidas do Sorteio 3800</span>
            <span className="text-amber-300 font-mono">
              {filters.repetidasMin} a {filters.repetidasMax} dezenas
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Mín:</span>
            <input
              type="range"
              min="6"
              max="12"
              value={filters.repetidasMin}
              onChange={(e) => update({ repetidasMin: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.repetidasMin}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1.5">
            <span>Máx:</span>
            <input
              type="range"
              min={filters.repetidasMin}
              max="12"
              value={filters.repetidasMax}
              onChange={(e) => update({ repetidasMax: parseInt(e.target.value, 10) })}
              className="w-full accent-amber-500"
            />
            <span className="w-4 font-mono text-white text-right">{filters.repetidasMax}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Média histórica: exatamente 9 repetidas (8 a 10 ocorrem em ~80%).
          </p>
        </div>
      </div>
    </div>
  );
};
