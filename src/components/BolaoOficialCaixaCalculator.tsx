import React, { useState } from 'react';
import { Users, ShieldCheck, TrendingUp, Info, DollarSign, Calculator } from 'lucide-react';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

interface BolaoOficialCaixaCalculatorProps {
  totalJogos: number;
  custoTotal?: number;
  isModo16Dezenas?: boolean;
}

export const BolaoOficialCaixaCalculator: React.FC<BolaoOficialCaixaCalculatorProps> = ({
  totalJogos,
  custoTotal: propCustoTotal,
  isModo16Dezenas = false,
}) => {
  const custoTotal = propCustoTotal ?? totalJogos * VALOR_APOSTA_LOTOFACIL;

  // Regras Oficiais Caixa Econômica Federal:
  // - Valor mínimo de bolão: R$ 12,00
  // - Valor mínimo por cota: R$ 4,00
  // - Quantidade de cotas: 2 a 100
  const maxCotasPermitidas = Math.max(2, Math.min(100, Math.floor(custoTotal / 4.0)));
  const [cotas, setCotas] = useState<number>(() => Math.min(10, Math.max(2, maxCotasPermitidas)));

  const safeCotas = Math.min(maxCotasPermitidas, Math.max(2, cotas));
  const valorPorCota = custoTotal / safeCotas;
  const bolaoAbaixoDoMinimo = custoTotal < 12.0;

  // Estimativa oficial de 14 pontos (prêmio médio Caixa R$ 2.150,40)
  const premioMedio14Pontos = 2150.40;
  // Se for aposta múltipla de 16 dezenas, a Caixa paga 2 vezes 14 pontos + 14 vezes 13 pontos (R$ 35 cada)
  const premio14ComMultiplas = isModo16Dezenas
    ? (premioMedio14Pontos * 2) + (14 * 35.0)
    : premioMedio14Pontos;

  const retornoBrutoPorCota = premio14ComMultiplas / safeCotas;
  const lucroLiquidoPorCota = (premio14ComMultiplas - custoTotal) / safeCotas;
  const roiCota = valorPorCota > 0 ? (lucroLiquidoPorCota / valorPorCota) * 100 : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Divisão de Bolão Oficial Caixa
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                Norma CEF
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulador financeiro de cotas, despesas e rateio líquido para 14 e 15 pontos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Mín: R$ 12,00 / bolão • R$ 4,00 / cota</span>
        </div>
      </div>

      {bolaoAbaixoDoMinimo && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-xs text-amber-300">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Aviso de Regra Caixa:</span> O investimento atual deste fechamento (R$ {custoTotal.toFixed(2)}) é inferior ao piso mínimo oficial de R$ 12,00 para registro de bolão na lotérica (mínimo de 4 apostas simples).
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Controle de Cotas */}
        <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              Número de Cotas
            </label>
            <span className="text-xs text-slate-400">Permitido: 2 a {maxCotasPermitidas}</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min={2}
              max={Math.max(2, maxCotasPermitidas)}
              value={safeCotas}
              onChange={(e) => setCotas(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-base font-bold text-white px-3 py-1 bg-slate-700 rounded border border-slate-600 min-w-[50px] text-center">
              {safeCotas}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2">
            <span>Investimento Total:</span>
            <span className="font-bold text-slate-200">R$ {custoTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Custo por Cota */}
        <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Valor por Participante
            </span>
            <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${valorPorCota >= 4.0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
              {valorPorCota >= 4.0 ? 'Válido CEF' : 'Abaixo R$ 4,00'}
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              R$ {valorPorCota.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400">
              custo por cota ({safeCotas} participantes)
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-1.5 flex justify-between">
            <span>Apostas por cota:</span>
            <span className="font-medium text-slate-200">{(totalJogos / safeCotas).toFixed(1)} jogos/cota</span>
          </div>
        </div>

        {/* Retorno Estimado 14 Pontos */}
        <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Retorno Líquido (14 pts)
            </span>
            <span className="text-[11px] font-bold text-amber-400">
              +{roiCota.toFixed(0)}%
            </span>
          </div>

          <div className="my-1.5">
            <div className="text-2xl font-black text-amber-300 tracking-tight">
              R$ {lucroLiquidoPorCota.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400">
              lucro limpo por cota (prêmio Caixa R$ {premio14ComMultiplas.toFixed(2)})
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-1.5 flex justify-between">
            <span>Resgate bruto:</span>
            <span className="font-medium text-emerald-300">R$ {retornoBrutoPorCota.toFixed(2)} / cota</span>
          </div>
        </div>
      </div>

      {isModo16Dezenas && (
        <div className="mt-3 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300 flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Multi-Aposta de 16 Dezenas Detectada:</strong> A Caixa paga em dobro (2x prêmio de 14 pontos + 14x prêmio de 13 pontos) ao acertar 14 números no bilhete de 16 dezenas.
          </span>
        </div>
      )}
    </div>
  );
};
