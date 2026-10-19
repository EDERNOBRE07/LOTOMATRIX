import React from 'react';
import { FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { DEFAULT_FILTERS } from '../services/combinatorics';
import {
  Sliders,
  CheckCircle2,
  RotateCcw,
  Info,
  Scale,
  Repeat,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Flame,
  Check,
} from 'lucide-react';

interface FilterControlsProps {
  filters: FilterCriteria;
  onChange: (filters: FilterCriteria) => void;
  onReset: () => void;
  latestDraw?: LotofacilDraw;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onChange,
  onReset,
  latestDraw = CONCURSO_ATUAL,
}) => {
  const update = (partial: Partial<FilterCriteria>) => {
    onChange({ ...filters, ...partial });
  };

  const [appliedNotice, setAppliedNotice] = React.useState<string | null>(null);

  // Insights Diários da IA para calibrar os Filtros Matemáticos & Restrições Canônicas
  const applyAIDailyInsightsPreset = () => {
    onChange({
      ...filters,
      paresMin: 7,
      paresMax: 8,
      primosMin: 4,
      primosMax: 6,
      somaMin: 190, // Regra de Ouro da Soma recomendada pela IA
      somaMax: 210,
      molduraMin: 9,
      molduraMax: 10,
      fibonacciMin: 3,
      fibonacciMax: 5,
      repetidasMin: 8,
      repetidasMax: 10,
      maxConsecutivas: 4,
    });
    setAppliedNotice(
      `Insights Diários da IA aplicados: Soma na Zona de Ouro (190–210), 4–6 Primos, 3–5 Fibonacci e 8–10 Repetidas do Concurso #${latestDraw.concurso}.`
    );
    setTimeout(() => setAppliedNotice(null), 5000);
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
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header com Identificação Clara */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Filtros Personalizados & Restrições Canônicas</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                Poda de Ramos Ativa
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure parâmetros específicos para o gerador de matrizes. As combinações que
            ultrapassarem os limites definidos serão podadas automaticamente antes do fechamento.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={applyAIDailyInsightsPreset}
            className="px-3 py-1.5 text-xs rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black hover:opacity-95 transition shadow-sm shadow-emerald-500/25 cursor-pointer flex items-center gap-1.5"
            title="Aplica os Insights Diários da IA nos Filtros Matemáticos: Zona de Ouro (190–210), 4–6 Primos, 3–5 Fibonacci e 8–10 Repetidas"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
            <span>Insights Diários da IA</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-950 text-emerald-300 font-mono font-bold">
              RECOMENDADO
            </span>
          </button>
          <button
            type="button"
            onClick={applyStrictPreset}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
          >
            Filtros Estritos
          </button>
          <button
            type="button"
            onClick={applyWidePreset}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
          >
            Filtros Amplos
          </button>
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
            title="Restaurar Valores Padrão"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alerta de Aplicação dos Insights Diários da IA */}
      {appliedNotice && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 shadow-md shadow-emerald-500/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setAppliedNotice(null)}
            className="text-emerald-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO PRINCIPAL DE DESTAQUE: REPETIDAS DO CONCURSO ANTERIOR & FAIXA DE SOMA */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Limite Máximo de Dezenas Repetidas do Concurso Anterior */}
        <div className="bg-gradient-to-br from-amber-950/30 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-amber-500/40 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Repeat className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Dezenas Repetidas do Concurso Anterior</span>
                </h4>
                <span className="text-[11px] text-amber-300/80 font-mono">
                  Referência: Concurso #{latestDraw.concurso} ({latestDraw.data})
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Limite Máximo</span>
              <strong className="text-base font-black font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/40">
                Máx {filters.repetidasMax}
              </strong>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Restrinja o número máximo de dezenas repetidas do sorteio #{latestDraw.concurso}.
            Historicamente, ~80% dos concursos repetem entre 8 e 10 dezenas.
          </p>

          {/* Sliders for Min and Max */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Faixa Configurada:</span>
              <span className="font-mono font-bold text-white text-xs">
                {filters.repetidasMin} a {filters.repetidasMax} repetidas
              </span>
            </div>

            {/* Repetidas Máximo Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-amber-300 font-semibold flex items-center gap-1">
                  <span>Limite Máximo de Repetidas:</span>
                </span>
                <span className="font-mono font-black text-amber-300 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-500/40">
                  {filters.repetidasMax} dezenas
                </span>
              </div>
              <input
                type="range"
                min={filters.repetidasMin}
                max="12"
                value={filters.repetidasMax}
                onChange={(e) => update({ repetidasMax: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Repetidas Mínimo Slider */}
            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Limite Mínimo de Repetidas:</span>
                <span className="font-mono text-slate-200">
                  {filters.repetidasMin} dezenas
                </span>
              </div>
              <input
                type="range"
                min="6"
                max={Math.min(10, filters.repetidasMax)}
                value={filters.repetidasMin}
                onChange={(e) => update({ repetidasMin: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Presets Rápidos de Repetidas */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[10px] text-slate-500 mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => update({ repetidasMin: 8, repetidasMax: 10 })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                  filters.repetidasMin === 8 && filters.repetidasMax === 10
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Padrão 8–10 (80%)
              </button>
              <button
                type="button"
                onClick={() => update({ repetidasMin: 8, repetidasMax: 9 })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                  filters.repetidasMin === 8 && filters.repetidasMax === 9
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Estrito Máx 9 (Média)
              </button>
              <button
                type="button"
                onClick={() => update({ repetidasMin: 7, repetidasMax: 8 })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                  filters.repetidasMin === 7 && filters.repetidasMax === 8
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Alta Renovação (Máx 8)
              </button>
            </div>
          </div>

          {/* Mini-visualizador das 15 dezenas do sorteio anterior */}
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block mb-1">
              Dezenas do Concurso #{latestDraw.concurso} consideradas como repetidas:
            </span>
            <div className="flex flex-wrap gap-1">
              {latestDraw.dezenas.map((n) => (
                <span
                  key={n}
                  className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 font-mono text-[10px] font-bold flex items-center justify-center"
                >
                  {n.toString().padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Faixa de Soma Esperada */}
        <div className="bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 shadow-lg space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Faixa de Soma Esperada (15 Dezenas)</span>
                </h4>
                <span className="text-[11px] text-emerald-300/80 font-mono">
                  Ponto de Equilíbrio Canônico: 195
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Intervalo Ativo</span>
              <strong className="text-base font-black font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/40">
                {filters.somaMin} – {filters.somaMax}
              </strong>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            A soma das 15 dezenas segue uma distribuição normal de Gauss. Em mais de 82% dos
            sorteios oficiais, a soma total fica rigorosamente entre 175 e 220.
          </p>

          {/* Sliders for Min and Max Soma */}
          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Amplitude de Soma:</span>
              <span className="font-mono font-bold text-emerald-400 text-xs">
                {filters.somaMin} até {filters.somaMax} (Delta: {filters.somaMax - filters.somaMin} pts)
              </span>
            </div>

            {/* Soma Mínima Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Soma Mínima Permitida:</span>
                <span className="font-mono font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded">
                  {filters.somaMin}
                </span>
              </div>
              <input
                type="range"
                min="140"
                max={Math.min(205, filters.somaMax - 10)}
                step="5"
                value={filters.somaMin}
                onChange={(e) => update({ somaMin: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Soma Máxima Slider */}
            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-semibold">Soma Máxima Permitida:</span>
                <span className="font-mono font-black text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/40">
                  {filters.somaMax}
                </span>
              </div>
              <input
                type="range"
                min={Math.max(180, filters.somaMin + 10)}
                max="250"
                step="5"
                value={filters.somaMax}
                onChange={(e) => update({ somaMax: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Presets Rápidos de Soma */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <span className="text-[10px] text-slate-500 mr-1">Faixas:</span>
              <button
                type="button"
                onClick={() => update({ somaMin: 175, somaMax: 220 })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                  filters.somaMin === 175 && filters.somaMax === 220
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Canônica 175–220 (82%)
              </button>
              <button
                type="button"
                onClick={() => update({ somaMin: 180, somaMax: 210 })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                  filters.somaMin === 180 && filters.somaMax === 210
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Estrita 180–210 (65%)
              </button>
              <button
                type="button"
                onClick={() => update({ somaMin: 165, somaMax: 225 })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition cursor-pointer ${
                  filters.somaMin === 165 && filters.somaMax === 225
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                Ampla 165–225 (94%)
              </button>
            </div>
          </div>

          {/* Mini barra de Gauss representativa */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
            <span>Baixa (&lt;165)</span>
            <span className="text-emerald-400 font-bold">195 (Pico Médio)</span>
            <span>Alta (&gt;225)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RESTRIÇÕES COMPLEMENTARES: PARES, PRIMOS, MOLDURA, FIBONACCI E SEQUÊNCIA  */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Demais Restrições Canônicas do Motor de Poda
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Pares / Ímpares */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Pares no Bilhete</span>
              <span className="text-emerald-400 font-mono">
                {filters.paresMin} a {filters.paresMax} P
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Mín:</span>
              <input
                type="range"
                min="4"
                max="10"
                value={filters.paresMin}
                onChange={(e) => update({ paresMin: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.paresMin}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Máx:</span>
              <input
                type="range"
                min={filters.paresMin}
                max="11"
                value={filters.paresMax}
                onChange={(e) => update({ paresMax: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.paresMax}</span>
            </div>
            <p className="text-[10px] text-slate-500">
              7P/8I e 8P/7I cobrem 56.8% dos concursos.
            </p>
          </div>

          {/* Números Primos */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Números Primos</span>
              <span className="text-purple-400 font-mono">
                {filters.primosMin} a {filters.primosMax} primos
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Mín:</span>
              <input
                type="range"
                min="3"
                max="8"
                value={filters.primosMin}
                onChange={(e) => update({ primosMin: parseInt(e.target.value, 10) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.primosMin}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Máx:</span>
              <input
                type="range"
                min={filters.primosMin}
                max="8"
                value={filters.primosMax}
                onChange={(e) => update({ primosMax: parseInt(e.target.value, 10) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.primosMax}</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Conjunto: 2, 3, 5, 7, 11, 13, 17, 19, 23 (média 5-6).
            </p>
          </div>

          {/* Moldura */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Dezenas na Moldura</span>
              <span className="text-amber-400 font-mono">
                {filters.molduraMin} a {filters.molduraMax} mold.
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Mín:</span>
              <input
                type="range"
                min="7"
                max="12"
                value={filters.molduraMin}
                onChange={(e) => update({ molduraMin: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.molduraMin}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Máx:</span>
              <input
                type="range"
                min={filters.molduraMin}
                max="13"
                value={filters.molduraMax}
                onChange={(e) => update({ molduraMax: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.molduraMax}</span>
            </div>
            <p className="text-[10px] text-slate-500">
              As 16 dezenas da borda concentram 9 a 10 acertos.
            </p>
          </div>

          {/* Fibonacci */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Série Fibonacci</span>
              <span className="text-cyan-400 font-mono">
                {filters.fibonacciMin} a {filters.fibonacciMax} fibo
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Mín:</span>
              <input
                type="range"
                min="1"
                max="6"
                value={filters.fibonacciMin}
                onChange={(e) => update({ fibonacciMin: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.fibonacciMin}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-8">Máx:</span>
              <input
                type="range"
                min={filters.fibonacciMin}
                max="7"
                value={filters.fibonacciMax}
                onChange={(e) => update({ fibonacciMax: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="w-4 font-mono text-white text-right">{filters.fibonacciMax}</span>
            </div>
            <p className="text-[10px] text-slate-500">
              1, 2, 3, 5, 8, 13, 21 (faixa áurea: 3 a 5).
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Status e Resumo dos Filtros Ativos */}
      <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
            Restrições Ativas:
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono font-bold border border-amber-500/30">
            Repetidas: {filters.repetidasMin} a {filters.repetidasMax} (Máx {filters.repetidasMax})
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono font-bold border border-emerald-500/30">
            Soma: {filters.somaMin}–{filters.somaMax}
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {filters.paresMin}–{filters.paresMax}P
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {filters.primosMin}–{filters.primosMax} Primos
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            {filters.molduraMin}–{filters.molduraMax} Moldura
          </span>
        </div>

        <span className="text-[11px] text-emerald-400 font-medium">
          ✓ Aplicadas automaticamente ao processar a matriz
        </span>
      </div>
    </div>
  );
};
