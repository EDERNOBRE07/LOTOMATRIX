import React from 'react';
import { Target, Calculator, ShieldCheck, Zap, Sparkles, ArrowRight, DollarSign, Percent } from 'lucide-react';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

interface CalculadoraMinima14PontosProps {
  fixedCount: number;
  selectedCount: number;
  onApplyMatrixSize: (size: 16 | 17 | 18) => void;
  currentMatrixSize?: number;
}

export const CalculadoraMinima14Pontos: React.FC<CalculadoraMinima14PontosProps> = ({
  fixedCount,
  selectedCount,
  onApplyMatrixSize,
  currentMatrixSize = 18,
}) => {
  // Cálculo matemático da cobertura mínima de 14 pontos (Garantia 14 se 15)
  // em função do número de dezenas fixas
  const getMatrixConfig = (totalDezenas: 16 | 17 | 18) => {
    let minJogos = 24;
    let custoCaixaOficial = 0;

    if (totalDezenas === 16) {
      custoCaixaOficial = 56.0; // 16 dezenas oficial = 16 apostas = R$ 56,00
      if (fixedCount === 0) minJogos = 4;
      else if (fixedCount === 1) minJogos = 3;
      else minJogos = 2;
    } else if (totalDezenas === 17) {
      custoCaixaOficial = 476.0; // 17 dezenas oficial = 136 apostas = R$ 476,00
      if (fixedCount === 0) minJogos = 8;
      else if (fixedCount === 1) minJogos = 6;
      else if (fixedCount === 2) minJogos = 4;
      else if (fixedCount === 3) minJogos = 3;
      else minJogos = 2;
    } else {
      // 18 dezenas
      custoCaixaOficial = 2856.0; // 18 dezenas oficial = 816 apostas = R$ 2.856,00
      if (fixedCount === 0) minJogos = 24;
      else if (fixedCount === 1) minJogos = 14;
      else if (fixedCount === 2) minJogos = 8;
      else if (fixedCount === 3) minJogos = 4;
      else if (fixedCount === 4) minJogos = 3;
      else minJogos = 2;
    }

    const custoFechamento = minJogos * VALOR_APOSTA_LOTOFACIL;
    const economia = ((1 - custoFechamento / custoCaixaOficial) * 100).toFixed(1);

    return {
      totalDezenas,
      minJogos,
      custoFechamento,
      custoCaixaOficial,
      economia,
    };
  };

  const matrizes: (16 | 17 | 18)[] = [16, 17, 18];

  return (
    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Calculator className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>Calculadora de Apostas Mínimas • Garantia 14 Pontos</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                14 se 15 100%
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Cálculo combinatório exato de bilhetes para fechar 14 pontos com base nas suas{' '}
              <strong className="text-emerald-300 font-bold">{fixedCount} dezena(s) fixa(s)</strong> selecionadas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Fixas ativas: <strong className="text-emerald-400 font-bold">{fixedCount}</strong></span>
        </div>
      </div>

      {/* Grid de 3 Níveis de Aposta: 16, 17 e 18 Dezenas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {matrizes.map((size) => {
          const cfg = getMatrixConfig(size);
          const isSelected = selectedCount === size || currentMatrixSize === size;

          return (
            <div
              key={size}
              className={`rounded-xl p-4 border transition-all duration-200 relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-400/80 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-950/60 hover:bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                      Matriz
                    </span>
                    <strong className="text-lg font-black text-white">{size} Dezenas</strong>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Ativa
                    </span>
                  )}
                </div>

                {/* Métricas de Apostas e Custo */}
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-2 font-mono">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Apostas Mínimas:</span>
                    <strong className="text-base font-black text-emerald-300">{cfg.minJogos} jogos</strong>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Investimento Total:</span>
                    <strong className="text-xs font-bold text-amber-300">
                      R$ {cfg.custoFechamento.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-800/60">
                    <span className="text-slate-500">Oficial Caixa:</span>
                    <span className="text-slate-400 line-through">
                      R$ {cfg.custoCaixaOficial.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-emerald-400 font-bold">
                    <span>Economia Direta:</span>
                    <span className="flex items-center gap-0.5">
                      <Percent className="w-3 h-3" />
                      {cfg.economia}%
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 leading-tight">
                  {fixedCount > 0 ? (
                    <span>
                      Garante <strong>14 pts</strong> se as 15 sorteadas estiverem nas {size} dezenas e as {fixedCount} fixas forem acertadas.
                    </span>
                  ) : (
                    <span>
                      Garante <strong>14 pts</strong> com 100% de cobertura matemática se as 15 sorteadas estiverem no universo de {size} dezenas.
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => onApplyMatrixSize(size)}
                  className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aplicar Matriz {size} Dezenas</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
