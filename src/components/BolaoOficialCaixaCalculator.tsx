import React, { useState, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  TrendingUp,
  Info,
  DollarSign,
  Calculator,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Layers,
  Award,
} from 'lucide-react';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';

interface BolaoOficialCaixaCalculatorProps {
  totalJogos: number;
  custoTotal?: number;
  isModo16Dezenas?: boolean;
  dezenasPorJogo?: number;
}

// Tabela Oficial de Premiação Múltipla da Caixa Econômica Federal ao acertar 14 pontos
export const TABELA_MULTIPLAS_CAIXA_14_PTS: Record<
  number,
  {
    dezenas: number;
    precoAposta: number;
    premios14: number;
    premios13: number;
    descricao: string;
  }
> = {
  15: { dezenas: 15, precoAposta: 3.50, premios14: 1, premios13: 0, descricao: 'Aposta simples padrão (1x prêmio de 14 pts)' },
  16: { dezenas: 16, precoAposta: 56.00, premios14: 2, premios13: 14, descricao: 'Paga 2 vezes 14 pontos + 14 vezes 13 pontos' },
  17: { dezenas: 17, precoAposta: 476.00, premios14: 3, premios13: 42, descricao: 'Paga 3 vezes 14 pontos + 42 vezes 13 pontos' },
  18: { dezenas: 18, precoAposta: 2856.00, premios14: 4, premios13: 84, descricao: 'Paga 4 vezes 14 pontos + 84 vezes 13 pontos' },
  19: { dezenas: 19, precoAposta: 13566.00, premios14: 5, premios13: 140, descricao: 'Paga 5 vezes 14 pontos + 140 vezes 13 pontos' },
  20: { dezenas: 20, precoAposta: 54264.00, premios14: 6, premios13: 210, descricao: 'Paga 6 vezes 14 pontos + 210 vezes 13 pontos' },
};

export const BolaoOficialCaixaCalculator: React.FC<BolaoOficialCaixaCalculatorProps> = ({
  totalJogos,
  custoTotal: propCustoTotal,
  isModo16Dezenas = false,
  dezenasPorJogo: initialDezenas = 15,
}) => {
  // Modalidade de aposta no bolão (15 a 20 dezenas)
  const [selectedDezenasTipo, setSelectedDezenasTipo] = useState<number>(() => {
    if (isModo16Dezenas) return 16;
    if (initialDezenas >= 16 && initialDezenas <= 20) return initialDezenas;
    return 15;
  });

  const multiplaConfig = TABELA_MULTIPLAS_CAIXA_14_PTS[selectedDezenasTipo] || TABELA_MULTIPLAS_CAIXA_14_PTS[15];

  // Custo base: se for fechamento de 15 dezenas simples, usa totalJogos * 3.50. Se selecionou aposta múltipla unitária, usa precoAposta
  const custoTotalCalculado = useMemo(() => {
    if (selectedDezenasTipo > 15) {
      return multiplaConfig.precoAposta * Math.max(1, totalJogos > 50 ? 1 : Math.min(totalJogos, 4));
    }
    return propCustoTotal ?? totalJogos * VALOR_APOSTA_LOTOFACIL;
  }, [selectedDezenasTipo, multiplaConfig, propCustoTotal, totalJogos]);

  // Regras Oficiais Caixa Econômica Federal:
  // - Valor mínimo por bolão: R$ 12,00
  // - Valor mínimo por cota: R$ 4,00
  // - Quantidade de cotas: 2 a 100
  const maxCotasPermitidas = Math.max(2, Math.min(100, Math.floor(custoTotalCalculado / 4.0)));

  // Sugestão de Cotas Inteligente (Equilíbrio entre R$ 7 e R$ 25 por cota)
  const cotasSugeridas = useMemo(() => {
    const list: { label: string; cotas: number; descricao: string; destaque?: boolean }[] = [];

    // Cota Recomendada Caixa: divide em parcelas de R$ 7 a R$ 15
    const ideal = Math.max(2, Math.min(maxCotasPermitidas, Math.round(custoTotalCalculado / 10.0)));
    list.push({
      label: 'Cota Recomendada',
      cotas: ideal,
      descricao: `R$ ${(custoTotalCalculado / ideal).toFixed(2)}/cota (ideal para rateio)`,
      destaque: true,
    });

    if (maxCotasPermitidas >= 5 && ideal !== 5) {
      list.push({
        label: '5 Cotas',
        cotas: 5,
        descricao: `R$ ${(custoTotalCalculado / 5).toFixed(2)}/cota (amigos/família)`,
      });
    }

    if (maxCotasPermitidas >= 10 && ideal !== 10) {
      list.push({
        label: '10 Cotas',
        cotas: 10,
        descricao: `R$ ${(custoTotalCalculado / 10).toFixed(2)}/cota (grupo médio)`,
      });
    }

    if (maxCotasPermitidas >= 20 && ideal !== 20) {
      list.push({
        label: '20 Cotas',
        cotas: 20,
        descricao: `R$ ${(custoTotalCalculado / 20).toFixed(2)}/cota (bolão comercial)`,
      });
    }

    // Cota Mínima Caixa (máximo de participantes pagando R$ 4,00)
    if (maxCotasPermitidas > 2 && maxCotasPermitidas !== ideal) {
      list.push({
        label: `${maxCotasPermitidas} Cotas (Máx)`,
        cotas: maxCotasPermitidas,
        descricao: `R$ ${(custoTotalCalculado / maxCotasPermitidas).toFixed(2)}/cota (piso R$ 4,00)`,
      });
    }

    return list;
  }, [custoTotalCalculado, maxCotasPermitidas]);

  const [cotas, setCotas] = useState<number>(() => {
    const defaultIdeal = Math.max(2, Math.min(maxCotasPermitidas, Math.round(custoTotalCalculado / 10.0)));
    return defaultIdeal;
  });

  const safeCotas = Math.min(maxCotasPermitidas, Math.max(2, cotas));
  const valorPorCota = custoTotalCalculado / safeCotas;
  const bolaoAbaixoDoMinimo = custoTotalCalculado < 12.0;

  // Premiação Oficial Média Caixa para 14 pontos (R$ 2.150,40) e 13 pontos (R$ 35,00)
  const premioBase14 = 2150.40;
  const premioBase13 = 35.00;

  // Cálculo cumulativo oficial para apostas múltiplas
  const premio14EstimadoBruto =
    multiplaConfig.premios14 * premioBase14 + multiplaConfig.premios13 * premioBase13;

  const retornoBrutoPorCota = premio14EstimadoBruto / safeCotas;
  const lucroLiquidoPorCota = (premio14EstimadoBruto - custoTotalCalculado) / safeCotas;
  const roiCota = valorPorCota > 0 ? (lucroLiquidoPorCota / valorPorCota) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl backdrop-blur-md space-y-5">
      {/* Cabeçalho Oficial */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Calculadora de Bolão Oficial (Normas Caixa)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                CEF OFICIAL
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulador de cotas sugeridas, rateio por participante e prêmios de 14 pontos em apostas múltiplas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Regra Caixa: Mín. R$ 12,00 / bolão • Mín. R$ 4,00 / cota</span>
        </div>
      </div>

      {/* Alerta de Investimento Abaixo do Mínimo CEF */}
      {bolaoAbaixoDoMinimo && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">Aviso de Regra Lotérica da Caixa:</span> O valor total atual deste fechamento (R$ {custoTotalCalculado.toFixed(2)}) é inferior ao piso obrigatório de R$ 12,00 para registro de bolão oficial. Adicione ao menos 4 apostas simples para emitir cotas.
          </div>
        </div>
      )}

      {/* Seletor de Tipo de Aposta (Aposta Simples vs Apostas Múltiplas Caixa) */}
      <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Tipo de Aposta no Bolão (Tabela Oficial Multi-Apostas Caixa):
          </label>
          <span className="text-[11px] text-emerald-300 font-mono">
            {multiplaConfig.descricao}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {[15, 16, 17, 18, 19, 20].map((dz) => {
            const isSelected = selectedDezenasTipo === dz;
            const cfg = TABELA_MULTIPLAS_CAIXA_14_PTS[dz];
            return (
              <button
                key={dz}
                type="button"
                onClick={() => setSelectedDezenasTipo(dz)}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400'
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{dz} Dezenas</span>
                  {dz > 15 && (
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-300">
                      Multi
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  R$ {cfg.precoAposta.toFixed(2)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seletor de Cotas Sugeridas Rápidas */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Número de Cotas Sugeridas:
        </span>
        <div className="flex flex-wrap gap-2">
          {cotasSugeridas.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCotas(item.cotas)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                safeCotas === item.cotas
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                  : item.destaque
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <span>{item.label}</span>
              <span className="text-[10px] font-mono opacity-80">({item.cotas} cotas)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Principal de 3 Colunas: Cotas, Custo por Participante, Retorno Estimado 14 pts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Controle de Cotas */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Quantidade de Cotas
            </span>
            <span className="text-[11px] text-slate-400 font-mono">2 a {maxCotasPermitidas}</span>
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
            <span className="text-base font-black text-white px-3 py-1 bg-slate-750 rounded border border-slate-600 min-w-[50px] text-center font-mono">
              {safeCotas}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-2 flex justify-between">
            <span>Investimento Total do Bolão:</span>
            <span className="font-bold text-slate-200 font-mono">
              R$ {custoTotalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 2. Custo por Participante */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Custo por Participante
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                valorPorCota >= 4.0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {valorPorCota >= 4.0 ? '✓ Válido CEF' : 'Abaixo R$ 4,00'}
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-emerald-400 tracking-tight font-mono">
              R$ {valorPorCota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              investimento individual por cota ({safeCotas} participantes)
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-2 flex justify-between">
            <span>Volume apostas por cota:</span>
            <span className="font-semibold text-slate-200">
              {(totalJogos / safeCotas).toFixed(1)} jogos / participante
            </span>
          </div>
        </div>

        {/* 3. Retorno Estimado para 14 Pontos em Apostas Múltiplas */}
        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Retorno Estimado (14 Pontos)
            </span>
            <span className="text-xs font-black text-amber-400 font-mono">
              +{roiCota.toFixed(0)}% ROI
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-amber-300 tracking-tight font-mono">
              R$ {lucroLiquidoPorCota.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              lucro líquido por cota após amortizar aposta
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-700/60 pt-2 flex justify-between">
            <span>Prêmio total Caixa ({selectedDezenasTipo}D):</span>
            <span className="font-bold text-emerald-400 font-mono">
              R$ {premio14EstimadoBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Dossiê Técnico das Apostas Múltiplas */}
      <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>
            <strong>Premiação Multiplicada Caixa ({selectedDezenasTipo} Dezenas):</strong> Acertando 14 pontos, a Caixa paga{' '}
            <strong className="text-amber-300">{multiplaConfig.premios14}x o prêmio de 14 pontos</strong>
            {multiplaConfig.premios13 > 0 && (
              <>
                {' '}e <strong className="text-sky-300">{multiplaConfig.premios13}x o prêmio de 13 pontos</strong>
              </>
            )}.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          Resgate Bruto: R$ {retornoBrutoPorCota.toFixed(2)} / cota
        </span>
      </div>
    </div>
  );
};
