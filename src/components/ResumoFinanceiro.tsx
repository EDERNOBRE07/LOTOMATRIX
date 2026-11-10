import React, { useState, useMemo } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface ResumoFinanceiroProps {
  savedTickets?: GameTicket[];
  draws?: LotofacilDraw[];
  unitBetCost?: number;
  className?: string;
}

// Bilhetes canônicos de exemplo caso o usuário ainda não tenha salvo bilhetes
const SAMPLE_TICKETS: GameTicket[] = [
  { id: 'sample-1', index: 1, dezenas: [1, 2, 3, 5, 8, 9, 10, 11, 13, 15, 17, 19, 21, 22, 25], pares: 6, impares: 9, primos: 6, soma: 198, moldura: 10, miolo: 5, fibonacci: 4, repetidas: 9, maxConsecutivas: 3, scoreIA: 92 },
  { id: 'sample-2', index: 2, dezenas: [1, 3, 4, 6, 7, 10, 11, 12, 14, 16, 18, 20, 22, 23, 24], pares: 9, impares: 6, primos: 4, soma: 201, moldura: 11, miolo: 4, fibonacci: 3, repetidas: 8, maxConsecutivas: 3, scoreIA: 89 },
  { id: 'sample-3', index: 3, dezenas: [2, 4, 5, 7, 8, 9, 12, 13, 15, 17, 18, 20, 21, 24, 25], pares: 8, impares: 7, primos: 5, soma: 200, moldura: 10, miolo: 5, fibonacci: 4, repetidas: 9, maxConsecutivas: 2, scoreIA: 94 },
  { id: 'sample-4', index: 4, dezenas: [1, 2, 4, 6, 7, 8, 10, 13, 14, 15, 16, 19, 21, 23, 25], pares: 7, impares: 8, primos: 5, soma: 194, moldura: 10, miolo: 5, fibonacci: 4, repetidas: 9, maxConsecutivas: 3, scoreIA: 91 },
  { id: 'sample-5', index: 5, dezenas: [2, 3, 5, 7, 8, 10, 11, 12, 14, 16, 17, 19, 22, 23, 24], pares: 8, impares: 7, primos: 6, soma: 193, moldura: 9, miolo: 6, fibonacci: 4, repetidas: 8, maxConsecutivas: 3, scoreIA: 95 },
  { id: 'sample-6', index: 6, dezenas: [1, 3, 5, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 24, 25], pares: 7, impares: 8, primos: 5, soma: 196, moldura: 10, miolo: 5, fibonacci: 4, repetidas: 9, maxConsecutivas: 2, scoreIA: 90 },
];

export const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({
  savedTickets = [],
  draws = RECENT_DRAWS,
  unitBetCost = VALOR_APOSTA_LOTOFACIL,
  className = '',
}) => {
  const [sampleWindow, setSampleWindow] = useState<'10' | '25' | '50' | 'all'>('50');
  const [usingSampleFallback, setUsingSampleFallback] = useState(false);

  // Seleciona os bilhetes ativos para o cálculo financeiro
  const activeTickets = useMemo(() => {
    if (savedTickets && savedTickets.length > 0) {
      setUsingSampleFallback(false);
      return savedTickets;
    }
    setUsingSampleFallback(true);
    return SAMPLE_TICKETS;
  }, [savedTickets]);

  // Filtra concursos conforme a amostragem
  const selectedDraws = useMemo(() => {
    const sorted = [...draws].sort((a, b) => b.concurso - a.concurso);
    if (sampleWindow === '10') return sorted.slice(0, 10);
    if (sampleWindow === '25') return sorted.slice(0, 25);
    if (sampleWindow === '50') return sorted.slice(0, 50);
    return sorted;
  }, [draws, sampleWindow]);

  // Motor de cálculo de backtesting financeiro e curva de capital
  const auditResults = useMemo(() => {
    const totalCartoes = activeTickets.length;
    const custoPorConcurso = totalCartoes * unitBetCost;
    const numConcursos = selectedDraws.length;
    const custoTotalGasto = custoPorConcurso * numConcursos;

    let arrecadacaoTotal = 0;
    const contagemAcertos = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0, abaixo11: 0 };
    let concursosComRetorno = 0;

    let saldoAcumulado = 0;
    let picoCapital = 0;
    let maxDrawdown = 0;

    const detalhesPorConcurso = selectedDraws.map((sorteio) => {
      const dezenasSet = new Set(sorteio.dezenas);
      let retornoConcurso = 0;
      let ac11 = 0;
      let ac12 = 0;
      let ac13 = 0;
      let ac14 = 0;
      let ac15 = 0;

      // Payouts canônicos da Caixa para a Lotofácil
      const val11 = sorteio.premiacoes?.faixa11?.valor ?? 7.0;
      const val12 = sorteio.premiacoes?.faixa12?.valor ?? 14.0;
      const val13 = sorteio.premiacoes?.faixa13?.valor ?? 35.0;
      const val14 = sorteio.premiacoes?.faixa14?.valor ?? 1890.5;
      const val15 = sorteio.premiacoes?.faixa15?.valor ?? 2000000.0;

      for (let j = 0; j < totalCartoes; j++) {
        const ticket = activeTickets[j];
        let acertos = 0;
        for (let d = 0; d < ticket.dezenas.length; d++) {
          if (dezenasSet.has(ticket.dezenas[d])) {
            acertos++;
          }
        }

        if (acertos === 15) {
          ac15++;
          contagemAcertos[15]++;
          retornoConcurso += val15;
        } else if (acertos === 14) {
          ac14++;
          contagemAcertos[14]++;
          retornoConcurso += val14;
        } else if (acertos === 13) {
          ac13++;
          contagemAcertos[13]++;
          retornoConcurso += val13;
        } else if (acertos === 12) {
          ac12++;
          contagemAcertos[12]++;
          retornoConcurso += val12;
        } else if (acertos === 11) {
          ac11++;
          contagemAcertos[11]++;
          retornoConcurso += val11;
        } else {
          contagemAcertos.abaixo11++;
        }
      }

      arrecadacaoTotal += retornoConcurso;
      const lucroLiquidoConcurso = retornoConcurso - custoPorConcurso;
      saldoAcumulado += lucroLiquidoConcurso;

      if (retornoConcurso > 0) concursosComRetorno++;

      if (saldoAcumulado > picoCapital) picoCapital = saldoAcumulado;
      const drawdownInstantaneo = picoCapital - saldoAcumulado;
      if (drawdownInstantaneo > maxDrawdown) maxDrawdown = drawdownInstantaneo;

      return {
        concurso: sorteio.concurso,
        data: sorteio.data,
        custo: custoPorConcurso,
        retorno: retornoConcurso,
        lucroLiquido: lucroLiquidoConcurso,
        saldoAcumulado,
        faixas: {
          ac11,
          ac12,
          ac13,
          ac14,
          ac15,
          totalPremiados: ac11 + ac12 + ac13 + ac14 + ac15,
        },
      };
    });

    const saldoLiquidoFinal = arrecadacaoTotal - custoTotalGasto;
    const roiPercentual = custoTotalGasto > 0 ? (saldoLiquidoFinal / custoTotalGasto) * 100 : 0;
    const taxaSucesso = numConcursos > 0 ? (concursosComRetorno / numConcursos) * 100 : 0;

    const perdasTotais = detalhesPorConcurso
      .filter((p) => p.lucroLiquido < 0)
      .reduce((acc, p) => acc + Math.abs(p.lucroLiquido), 0);
    const ganhosTotais = detalhesPorConcurso
      .filter((p) => p.lucroLiquido > 0)
      .reduce((acc, p) => acc + p.lucroLiquido, 0);
    const fatorLucro = perdasTotais > 0 ? ganhosTotais / perdasTotais : ganhosTotais > 0 ? 99.0 : 0.0;

    return {
      numConcursos,
      totalCartoes,
      custoTotalGasto,
      custoPorConcurso,
      arrecadacaoTotal,
      saldoLiquidoFinal,
      roiPercentual,
      maxDrawdown,
      taxaSucesso,
      fatorLucro,
      contagemAcertos,
      detalhesPorConcurso,
    };
  }, [activeTickets, selectedDraws, unitBetCost]);

  const isPositivo = auditResults.saldoLiquidoFinal >= 0;

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 ${className}`}>
      {/* Top Header & Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>Resumo Financeiro & Auditoria de ROI</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {auditResults.totalCartoes} {auditResults.totalCartoes === 1 ? 'Jogo' : 'Jogos'} × R${' '}
                  {unitBetCost.toFixed(2).replace('.', ',')}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Retorno sobre investimento calculado com base nos fechamentos salvos vs histórico real de premiações Caixa
              </p>
            </div>
          </div>
        </div>

        {/* Seletor de Janela Amostral */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 font-medium">Amostragem:</span>
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-mono">
            {(['10', '25', '50', 'all'] as const).map((win) => (
              <button
                key={win}
                type="button"
                onClick={() => setSampleWindow(win)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  sampleWindow === win
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {win === 'all' ? 'Todos' : `${win} Concursos`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta caso esteja usando bilhetes de demonstração */}
      {usingSampleFallback && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Modo Demonstração:</strong> Nenhum bilhete salvo detectado. Exibindo auditoria com a matriz canônica padrão ({auditResults.totalCartoes} volantes). Gere e salve seus jogos na aba <strong>Fechamento</strong> para auditar sua carteira real.
            </span>
          </div>
        </div>
      )}

      {/* Grid de KPIs Quantitativos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-5">
        {/* KPI 1: Resultado Líquido */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="font-medium">Resultado Líquido</span>
            {isPositivo ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-2xl font-black font-mono tracking-tight ${
              isPositivo ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositivo ? '+' : ''}R${' '}
            {auditResults.saldoLiquidoFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isPositivo
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              ROI: {auditResults.roiPercentual.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Bruto: R$ {auditResults.arrecadacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* KPI 2: Capital Investido */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-medium block mb-1">Capital Investido</span>
          <div className="text-2xl font-black font-mono text-slate-100">
            R${' '}
            {auditResults.custoTotalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1.5 flex items-center justify-between">
            <span>R$ {auditResults.custoPorConcurso.toFixed(2).replace('.', ',')} / sorteio</span>
            <span>{auditResults.numConcursos} concursos</span>
          </div>
        </div>

        {/* KPI 3: Max Drawdown */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-medium block mb-1">Max Drawdown</span>
          <div className="text-2xl font-black font-mono text-rose-400">
            -R${' '}
            {auditResults.maxDrawdown.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-rose-400/80 font-mono mt-1.5 block">
            Rebaixamento Máximo do Topo
          </span>
        </div>

        {/* KPI 4: Concursos com Retorno */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-xs font-medium block mb-1">Taxa de Concursos com Retorno</span>
          <div className="text-2xl font-black font-mono text-sky-400">
            {auditResults.taxaSucesso.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
            Fator de Lucro:{' '}
            <strong className="text-white font-bold">{auditResults.fatorLucro.toFixed(2)}x</strong>
          </span>
        </div>
      </div>

      {/* Faixas de Acertos Totais */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mb-5">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Distribuição Consolidada de Prêmios nos {auditResults.numConcursos} Concursos</span>
          <span className="text-[10px] text-slate-500 font-mono font-normal">
            Total de {auditResults.totalCartoes * auditResults.numConcursos} bilhetes conferidos
          </span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-2.5 text-center">
            <span className="text-[10px] text-amber-400 font-bold block">15 Pontos</span>
            <div className="text-lg font-black text-white font-mono">{auditResults.contagemAcertos[15]}</div>
            <span className="text-[9px] text-slate-400 font-mono">Jackpot</span>
          </div>
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2.5 text-center">
            <span className="text-[10px] text-emerald-400 font-bold block">14 Pontos</span>
            <div className="text-lg font-black text-white font-mono">{auditResults.contagemAcertos[14]}</div>
            <span className="text-[9px] text-slate-400 font-mono">~R$ 1.890,50</span>
          </div>
          <div className="bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 text-center">
            <span className="text-[10px] text-cyan-400 font-bold block">13 Pontos</span>
            <div className="text-lg font-black text-white font-mono">{auditResults.contagemAcertos[13]}</div>
            <span className="text-[9px] text-slate-400 font-mono">R$ 35,00 cada</span>
          </div>
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-lg p-2.5 text-center">
            <span className="text-[10px] text-indigo-400 font-bold block">12 Pontos</span>
            <div className="text-lg font-black text-white font-mono">{auditResults.contagemAcertos[12]}</div>
            <span className="text-[9px] text-slate-400 font-mono">R$ 14,00 cada</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-center">
            <span className="text-[10px] text-slate-300 font-bold block">11 Pontos</span>
            <div className="text-lg font-black text-white font-mono">{auditResults.contagemAcertos[11]}</div>
            <span className="text-[9px] text-slate-400 font-mono">R$ 7,00 cada</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-center">
            <span className="text-[10px] text-slate-500 font-bold block">&lt; 11 Pontos</span>
            <div className="text-lg font-black text-slate-400 font-mono">{auditResults.contagemAcertos.abaixo11}</div>
            <span className="text-[9px] text-slate-500 font-mono">Sem premiação</span>
          </div>
        </div>
      </div>

      {/* Tabela de Detalhamento por Concurso */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Detalhamento de Caixa por Concurso
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">
            Exibindo últimos {Math.min(auditResults.detalhesPorConcurso.length, 15)} sorteios
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Concurso</th>
                <th className="py-2.5 px-3">Investimento</th>
                <th className="py-2.5 px-3 text-center">11-12 Acertos</th>
                <th className="py-2.5 px-3 text-center">13 Acertos</th>
                <th className="py-2.5 px-3 text-center">14-15 Acertos</th>
                <th className="py-2.5 px-3">Retorno Bruto</th>
                <th className="py-2.5 px-3 text-right">Saldo do Concurso</th>
                <th className="py-2.5 px-3 text-right">Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {auditResults.detalhesPorConcurso.slice(0, 15).map((item) => {
                const positivo = item.lucroLiquido >= 0;
                const saldoAcumuladoPositivo = item.saldoAcumulado >= 0;

                return (
                  <tr key={item.concurso} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      #{item.concurso} <span className="text-[10px] text-slate-500 font-normal ml-1">({item.data})</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      R$ {item.custo.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300">
                      {item.faixas.ac11 + item.faixas.ac12}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-cyan-400">
                      {item.faixas.ac13 > 0 ? item.faixas.ac13 : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                      {item.faixas.ac14 + item.faixas.ac15 > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ★ {item.faixas.ac14 + item.faixas.ac15}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      R$ {item.retorno.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        positivo ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {positivo ? '+' : ''}R$ {item.lucroLiquido.toFixed(2).replace('.', ',')}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-black ${
                        saldoAcumuladoPositivo ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {saldoAcumuladoPositivo ? '+' : ''}R$ {item.saldoAcumulado.toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
