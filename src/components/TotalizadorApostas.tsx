import React, { useState } from 'react';
import {
  Calculator,
  DollarSign,
  TrendingDown,
  Users,
  Repeat,
  ShieldCheck,
  Award,
  Sparkles,
  Info,
} from 'lucide-react';
import { FechamentoPreset, FechamentoMode } from '../types/lotofacil';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

interface TotalizadorApostasProps {
  preset: FechamentoPreset;
  mode: FechamentoMode;
  targetCount: number;
  totalJogos: number;
}

export const TotalizadorApostas: React.FC<TotalizadorApostasProps> = ({
  preset,
  mode,
  targetCount,
  totalJogos,
}) => {
  const [teimosinhaConcursos, setTeimosinhaConcursos] = useState<number>(1);
  const [numCotistas, setNumCotistas] = useState<number>(5);
  const [showBolaoCalc, setShowBolaoCalc] = useState<boolean>(false);

  // Official Caixa bet price
  const valorUnitario = VALOR_APOSTA_LOTOFACIL; // R$ 3,50
  const custoPorConcurso = totalJogos * valorUnitario;
  const custoTotalTeimosinha = custoPorConcurso * teimosinhaConcursos;

  // Caixa multiple bets raw cost calculation
  // C(n, 15) combinations
  const rawPermutations =
    targetCount === 15
      ? 1
      : targetCount === 16
      ? 16
      : targetCount === 17
      ? 136
      : targetCount === 18
      ? 816
      : targetCount === 19
      ? 3876
      : targetCount === 20
      ? 15504
      : targetCount === 21
      ? 54264
      : 1;

  const custoCaixaJogoUnico = rawPermutations * valorUnitario;
  const economiaReais = Math.max(0, custoCaixaJogoUnico - custoPorConcurso);

  // Break-even analysis: how many hits pay the game?
  // Caixa official fixed prizes for R$ 3.50 bet:
  // 11 points = R$ 7.00
  // 12 points = R$ 14.00
  // 13 points = R$ 35.00
  const bilhetes11ParaPagar = Math.ceil(custoPorConcurso / 7.0);
  const bilhetes12ParaPagar = Math.ceil(custoPorConcurso / 14.0);
  const bilhetes13ParaPagar = Math.ceil(custoPorConcurso / 35.0);

  // Bolão calculations
  const valorPorCota = custoTotalTeimosinha / Math.max(1, numCotistas);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 rounded-2xl border border-emerald-500/30 p-5 shadow-2xl space-y-4">
      {/* Header Totalizador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">
                Totalizador Financeiro de Apostas
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Aposta Oficial Caixa: R$ 3,50
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cálculo exato de investimento, economia real e projeção de retorno do fechamento
            </p>
          </div>
        </div>

        {/* Big Investment Badge */}
        <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-emerald-500/40 text-right self-start sm:self-center shadow-lg shadow-emerald-500/5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
            Investimento Total:
          </span>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-xs font-bold text-emerald-400">R$</span>
            <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
              {custoTotalTeimosinha.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {teimosinhaConcursos > 1 && (
            <span className="text-[10px] text-slate-400 font-mono block">
              ({teimosinhaConcursos} conc. × R${' '}
              {custoPorConcurso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Breakdown & Teimosinha */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Dezenas Marcadas</span>
          <strong className="text-white font-mono text-base font-bold flex items-center gap-1.5 mt-0.5">
            <span>{targetCount} Dezenas</span>
          </strong>
          <span className="text-[10px] text-slate-500">Universo do volante</span>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Total de Jogos</span>
          <strong className="text-emerald-400 font-mono text-base font-bold flex items-center gap-1.5 mt-0.5">
            <span>{totalJogos} bilhetes</span>
          </strong>
          <span className="text-[10px] text-slate-500">De 15 dezenas cada</span>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Preço por Jogo</span>
          <strong className="text-slate-200 font-mono text-base font-bold mt-0.5 block">
            R$ 3,50
          </strong>
          <span className="text-[10px] text-slate-500">Tabela Oficial da Caixa</span>
        </div>

        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] text-slate-400 block">Custo por Concurso</span>
          <strong className="text-amber-400 font-mono text-base font-bold mt-0.5 block">
            R$ {custoPorConcurso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </strong>
          <span className="text-[10px] text-slate-500">1 sorteio da Lotofácil</span>
        </div>
      </div>

      {/* Teimosinha Selector */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold text-white block">Multiplicador de Teimosinha:</span>
            <span className="text-[11px] text-slate-400">
              Concorra aos mesmos jogos por vários concursos seguidos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { conc: 1, label: '1 Concurso' },
            { conc: 3, label: '3 Concursos' },
            { conc: 6, label: '6 Concursos' },
            { conc: 12, label: '12 Concursos' },
            { conc: 24, label: '24 (1 Mês)' },
          ].map((item) => (
            <button
              key={item.conc}
              type="button"
              onClick={() => setTeimosinhaConcursos(item.conc)}
              className={`px-2.5 py-1.5 rounded-lg font-mono text-xs font-semibold transition cursor-pointer ${
                teimosinhaConcursos === item.conc
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Economia vs Aposta Múltipla Caixa Banner */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-900 p-4 rounded-xl border border-emerald-500/20 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <span className="text-[11px] text-slate-400 block font-medium">
            Aposta Direta na Caixa ({targetCount} dezenas no volante):
          </span>
          <div className="text-slate-300 font-mono text-sm mt-0.5 line-through">
            R$ {custoCaixaJogoUnico.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">
            {rawPermutations} apostas simples de R$ 3,50
          </span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block font-medium">
            Fechamento LotoSniper ({targetCount} dezenas em {totalJogos} jogos):
          </span>
          <div className="text-emerald-400 font-mono text-base font-black mt-0.5">
            R$ {custoPorConcurso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-400/80 font-medium">
            Garantia matemática de {preset.garantia}
          </span>
        </div>

        <div className="md:border-l md:border-slate-800 md:pl-4">
          <span className="text-[11px] text-amber-300 block font-bold flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            Economia no seu Bolso:
          </span>
          <div className="text-amber-400 font-mono text-base font-black mt-0.5">
            R$ {economiaReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">
            Você economiza <strong className="text-amber-300 font-mono">{preset.reducaoPercentual}%</strong> do capital!
          </span>
        </div>
      </div>

      {/* Ponto de Equilíbrio (Break-Even) & Premiações Caixa */}
      <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ponto de Equilíbrio (Como recuperar 100% do valor da aposta):</span>
          </span>
          <button
            type="button"
            onClick={() => setShowBolaoCalc(!showBolaoCalc)}
            className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{showBolaoCalc ? 'Ocultar Bolão' : 'Calcular Divisão de Bolão'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">11 Acertos (Paga R$ 7,00)</span>
              <span className="text-slate-200 font-semibold">
                Bastam <strong className="text-emerald-400 font-mono">{bilhetes11ParaPagar}</strong> bilhete(s)
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {bilhetes11ParaPagar} × R$ 7 = R$ {(bilhetes11ParaPagar * 7).toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">12 Acertos (Paga R$ 14,00)</span>
              <span className="text-slate-200 font-semibold">
                Bastam <strong className="text-teal-400 font-mono">{bilhetes12ParaPagar}</strong> bilhete(s)
              </span>
            </div>
            <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
              {bilhetes12ParaPagar} × R$ 14 = R$ {(bilhetes12ParaPagar * 14).toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block">13 Acertos (Paga R$ 35,00)</span>
              <span className="text-slate-200 font-semibold">
                Basta <strong className="text-amber-400 font-mono">{bilhetes13ParaPagar}</strong> bilhete
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              1 × R$ 35 = Lucro Imediato!
            </span>
          </div>
        </div>

        {/* Divisor de Bolão (Opcional) */}
        {showBolaoCalc && (
          <div className="mt-3 p-3 rounded-lg bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">Divisão de Cotas do Bolão:</span>
                <span className="text-[11px] text-slate-400">
                  Ideal para jogar em grupo com amigos ou família
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300">Cotistas:</span>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={numCotistas}
                  onChange={(e) => setNumCotistas(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1 rounded bg-slate-800 text-white font-mono text-xs border border-slate-700 text-center"
                />
              </div>

              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-emerald-500/40 text-right">
                <span className="text-[10px] text-slate-400 block">Valor por cota:</span>
                <span className="text-sm font-black text-emerald-400 font-mono">
                  R$ {valorPorCota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
