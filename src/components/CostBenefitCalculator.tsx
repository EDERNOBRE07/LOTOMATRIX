import React, { useState } from 'react';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Award,
  ShieldCheck,
  Zap,
  Info,
  Download,
  ArrowRight,
} from 'lucide-react';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

interface BetTierInfo {
  dezenas: number;
  combinacoes: number;
  custoCaixa: number;
  custoLotoSniper: number;
  jogosLotoSniper: number;
  economiaReais: number;
  economiaPct: number;
  premioMedio15: number;
  premioMedio14: number;
  premioMedio13: number;
  premioMedio12: number;
  premioMedio11: number;
}

export const CostBenefitCalculator: React.FC = () => {
  const [selectedDezenas, setSelectedDezenas] = useState<number>(18);
  const [hitScenario, setHitScenario] = useState<15 | 14 | 13>(15);

  const betTiers: BetTierInfo[] = [
    {
      dezenas: 15,
      combinacoes: 1,
      custoCaixa: 3.5,
      custoLotoSniper: 3.5,
      jogosLotoSniper: 1,
      economiaReais: 0,
      economiaPct: 0,
      premioMedio15: 1750000,
      premioMedio14: 1500,
      premioMedio13: 35,
      premioMedio12: 14,
      premioMedio11: 7,
    },
    {
      dezenas: 16,
      combinacoes: 16,
      custoCaixa: 56.0,
      custoLotoSniper: 14.0,
      jogosLotoSniper: 4,
      economiaReais: 42.0,
      economiaPct: 75.0,
      premioMedio15: 1750000 + 15 * 1500,
      premioMedio14: 2 * 1500 + 14 * 35,
      premioMedio13: 3 * 35 + 13 * 14,
      premioMedio12: 4 * 14 + 12 * 7,
      premioMedio11: 5 * 7,
    },
    {
      dezenas: 17,
      combinacoes: 136,
      custoCaixa: 476.0,
      custoLotoSniper: 35.0,
      jogosLotoSniper: 10,
      economiaReais: 441.0,
      economiaPct: 92.6,
      premioMedio15: 1750000 + 30 * 1500,
      premioMedio14: 3 * 1500 + 42 * 35,
      premioMedio13: 6 * 35 + 52 * 14,
      premioMedio12: 10 * 14 + 60 * 7,
      premioMedio11: 15 * 7,
    },
    {
      dezenas: 18,
      combinacoes: 816,
      custoCaixa: 2856.0,
      custoLotoSniper: 84.0,
      jogosLotoSniper: 24,
      economiaReais: 2772.0,
      economiaPct: 97.1,
      premioMedio15: 1750000 + 45 * 1500 + 315 * 35,
      premioMedio14: 4 * 1500 + 84 * 35 + 280 * 14,
      premioMedio13: 10 * 35 + 120 * 14 + 210 * 7,
      premioMedio12: 20 * 14 + 150 * 7,
      premioMedio11: 35 * 7,
    },
    {
      dezenas: 19,
      combinacoes: 3876,
      custoCaixa: 13566.0,
      custoLotoSniper: 168.0,
      jogosLotoSniper: 48,
      economiaReais: 13398.0,
      economiaPct: 98.8,
      premioMedio15: 1750000 + 60 * 1500 + 855 * 35,
      premioMedio14: 5 * 1500 + 140 * 35 + 700 * 14,
      premioMedio13: 15 * 35 + 225 * 14 + 525 * 7,
      premioMedio12: 35 * 14 + 315 * 7,
      premioMedio11: 70 * 7,
    },
    {
      dezenas: 20,
      combinacoes: 15504,
      custoCaixa: 54264.0,
      custoLotoSniper: 224.0,
      jogosLotoSniper: 64,
      economiaReais: 54040.0,
      economiaPct: 99.6,
      premioMedio15: 1750000 + 75 * 1500 + 1750 * 35,
      premioMedio14: 6 * 1500 + 210 * 35 + 1400 * 14,
      premioMedio13: 21 * 35 + 378 * 14 + 1134 * 7,
      premioMedio12: 56 * 14 + 560 * 7,
      premioMedio11: 126 * 7,
    },
    {
      dezenas: 21,
      combinacoes: 54264,
      custoCaixa: 189924.0,
      custoLotoSniper: 112.0,
      jogosLotoSniper: 32,
      economiaReais: 189812.0,
      economiaPct: 99.9,
      premioMedio15: 1750000 + 90 * 1500 + 3060 * 35,
      premioMedio14: 7 * 1500 + 294 * 35 + 2450 * 14,
      premioMedio13: 28 * 35 + 588 * 14 + 2156 * 7,
      premioMedio12: 84 * 14 + 924 * 7,
      premioMedio11: 210 * 7,
    },
  ];

  const currentTier = betTiers.find((t) => t.dezenas === selectedDezenas) || betTiers[3];

  const retornoEstimado =
    hitScenario === 15
      ? currentTier.premioMedio15
      : hitScenario === 14
      ? currentTier.premioMedio14
      : currentTier.premioMedio13;

  const roiCaixa = Math.round(((retornoEstimado - currentTier.custoCaixa) / currentTier.custoCaixa) * 100);
  const roiLotoSniper = Math.round(
    ((retornoEstimado - currentTier.custoLotoSniper) / currentTier.custoLotoSniper) * 100
  );

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Calculadora de Custo-Benefício & Retorno Financeiro</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase font-bold">
                15 a 21 Dezenas
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simule o investimento e compare a Aposta Múltipla Direta da Caixa com o Fechamento Otimizado do LotoSniper.
            </p>
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tier Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-semibold block">Nível de Aposta (Dezenas Marcadas no Volante):</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {betTiers.map((t) => (
              <button
                key={t.dezenas}
                type="button"
                onClick={() => setSelectedDezenas(t.dezenas)}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  selectedDezenas === t.dezenas
                    ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="block text-sm font-mono">{t.dezenas}</span>
                <span className="block text-[9px] opacity-80">números</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hit Scenario Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-semibold block">Cenário de Acertos dentro das {selectedDezenas} Dezenas:</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setHitScenario(15)}
              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                hitScenario === 15
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="block font-bold text-xs">15 Acertos</span>
              <span className="block text-[10px] opacity-80">Prêmio Máximo</span>
            </button>

            <button
              type="button"
              onClick={() => setHitScenario(14)}
              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                hitScenario === 14
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="block font-bold text-xs">14 Acertos</span>
              <span className="block text-[10px] opacity-80">Garantia Matriz</span>
            </button>

            <button
              type="button"
              onClick={() => setHitScenario(13)}
              className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                hitScenario === 13
                  ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span className="block font-bold text-xs">13 Acertos</span>
              <span className="block text-[10px] opacity-80">Retorno Parcial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Cards: Caixa vs LotoSniper */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Aposta Caixa Direta */}
        <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-850">
            <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Aposta Múltipla Caixa Direta</span>
            <span className="font-mono text-xs text-slate-500">{currentTier.combinacoes} apostas</span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Investimento Exigido:</span>
            <strong className="text-xl sm:text-2xl font-mono font-black text-rose-400">
              R$ {currentTier.custoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="text-xs space-y-1 text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>Retorno Estimado ({hitScenario} pts):</span>
              <span className="text-white font-bold">R$ {retornoEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span>ROI Estimado:</span>
              <span className={`font-bold ${roiCaixa > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {roiCaixa > 0 ? `+${roiCaixa}%` : `${roiCaixa}%`}
              </span>
            </div>
          </div>
        </div>

        {/* LotoSniper Matriz Pro */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400 fill-current" />
              <span className="font-bold text-emerald-300 text-xs uppercase tracking-wider">Matriz Otimizada LotoSniper</span>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
              {currentTier.jogosLotoSniper} bilhetes
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Investimento no Fechamento:</span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl sm:text-2xl font-mono font-black text-emerald-400">
                R$ {currentTier.custoLotoSniper.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>
              <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                Economia de {currentTier.economiaPct}%
              </span>
            </div>
          </div>
          <div className="text-xs space-y-1 text-slate-300 font-mono">
            <div className="flex justify-between">
              <span>Economia Direta em Dinheiro:</span>
              <span className="text-amber-300 font-black">
                R$ {currentTier.economiaReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>ROI Otimizado no LotoSniper:</span>
              <span className="text-emerald-400 font-black">
                +{roiLotoSniper.toLocaleString('pt-BR')}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shortcut bar to Gerenciar & Conferir */}
      <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-emerald-500/20">
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Deseja conferir e exportar os jogos gerados da sua matriz atual?</span>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'jogos' }))}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
          title="Navegar para Meus Jogos & Conferidor"
        >
          <Download className="w-3.5 h-3.5 text-slate-950" />
          <span>Gerenciar & Conferir</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
        </button>
      </div>
    </div>
  );
};
