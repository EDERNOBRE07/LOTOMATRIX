import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { LotofacilDraw, GameTicket } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  SavedFechamentoPrognostico,
  getSavedFechamentos,
} from '../services/savedFechamentosStorage';
import { countMatches } from '../services/combinatorics';
import {
  TrendingUp,
  DollarSign,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Filter,
  BarChart2,
  Percent,
  RefreshCw,
  Info,
} from 'lucide-react';

interface HistoricoROISavedGamesChartProps {
  latestDraw?: LotofacilDraw;
}

interface DrawRoiData {
  concurso: number;
  concursoLabel: string;
  data: string;
  dezenasSorteadas: number[];
  custo: number;
  retorno: number;
  lucroLiquido: number;
  roiPercent: number;
  hits11: number;
  hits12: number;
  hits13: number;
  hits14: number;
  hits15: number;
  totalPremiados: number;
}

export const HistoricoROISavedGamesChart: React.FC<HistoricoROISavedGamesChartProps> = ({
  latestDraw = CONCURSO_ATUAL,
}) => {
  // Lista de fechamentos salvos
  const [savedFechamentos, setSavedFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );

  // Fechamento selecionado para cálculo ('all' para carteira consolidada ou ID específico)
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(() => {
    const list = getSavedFechamentos();
    return list.length > 0 ? list[0].id : 'default_fallback';
  });

  // Métrica ativa do gráfico de barras: 'roi' (Percentual %) | 'lucro' (Líquido R$) | 'comparativo' (Retorno vs Custo)
  const [viewMetric, setViewMetric] = useState<'roi' | 'lucro' | 'comparativo'>('roi');

  // Atualiza fechamentos salvos caso haja alteração recente
  const handleRefresh = () => {
    const fresh = getSavedFechamentos();
    setSavedFechamentos(fresh);
    if (fresh.length > 0 && !fresh.some((f) => f.id === selectedStrategyId) && selectedStrategyId !== 'all') {
      setSelectedStrategyId(fresh[0].id);
    }
  };

  // Os últimos 20 concursos históricos ordenados cronologicamente (do mais antigo para o mais recente)
  const last20DrawsChronological: LotofacilDraw[] = useMemo(() => {
    // Pega os 20 mais recentes de RECENT_DRAWS
    const slice20 = RECENT_DRAWS.slice(0, 20);
    // Ordena do menor concurso para o maior (ordem cronológica para o eixo X)
    return [...slice20].sort((a, b) => a.concurso - b.concurso);
  }, []);

  // Bilhetes da estratégia selecionada
  const activeTickets: GameTicket[] = useMemo(() => {
    if (savedFechamentos.length === 0) {
      // Fallback padrão se ainda não houver nenhum jogo salvo no LocalStorage
      return Array.from({ length: 24 }, (_, i) => ({
        id: `fallback-ticket-${i + 1}`,
        index: i + 1,
        dezenas: [1, 2, 3, 5, 6, 8, 9, 10, 11, 13, 15, 18, 20, 22, 25],
        pares: 7,
        impares: 8,
        primos: 6,
        soma: 198,
        moldura: 10,
        miolo: 5,
        fibonacci: 4,
        repetidas: 9,
        maxConsecutivas: 3,
        scoreIA: 92,
      }));
    }

    if (selectedStrategyId === 'all') {
      // Combina os bilhetes de todas as estratégias salvas
      return savedFechamentos.flatMap((f) => f.tickets);
    }

    const found = savedFechamentos.find((f) => f.id === selectedStrategyId);
    if (found && found.tickets.length > 0) return found.tickets;

    // Se não encontrar, retorna o primeiro fechamento ou fallback
    return savedFechamentos[0]?.tickets || [];
  }, [savedFechamentos, selectedStrategyId]);

  // Nome da estratégia ativa
  const currentStrategyTitle = useMemo(() => {
    if (selectedStrategyId === 'all') {
      return `Carteira Consolidada (${savedFechamentos.length} Fechamentos • ${activeTickets.length} Jogos)`;
    }
    const found = savedFechamentos.find((f) => f.id === selectedStrategyId);
    if (found) {
      return `${found.tipoFechamento} (${found.totalJogos} Jogos • R$ ${found.custoTotal.toFixed(2)})`;
    }
    return `Fechamento Padrão (${activeTickets.length} Jogos)`;
  }, [savedFechamentos, selectedStrategyId, activeTickets.length]);

  // Cálculo detalhado de ROI e premiações para cada um dos 20 concursos históricos
  const roiData: DrawRoiData[] = useMemo(() => {
    if (activeTickets.length === 0) return [];

    const costPerDraw = activeTickets.reduce((acc, t) => {
      const len = t.dezenas.length;
      if (len === 16) return acc + 56.0;
      if (len === 17) return acc + 476.0;
      return acc + 3.5;
    }, 0);

    return last20DrawsChronological.map((draw) => {
      let hits11 = 0;
      let hits12 = 0;
      let hits13 = 0;
      let hits14 = 0;
      let hits15 = 0;
      let drawPrizeTotal = 0;

      const premio15 = draw.premiacoes?.faixa15?.valor || 1750000;
      const premio14 = draw.premiacoes?.faixa14?.valor || 1540;
      const premio13 = 35.0;
      const premio12 = 14.0;
      const premio11 = 7.0;

      for (const ticket of activeTickets) {
        const matches = countMatches(ticket.dezenas, draw.dezenas);
        if (matches === 15) {
          hits15++;
          drawPrizeTotal += premio15;
        } else if (matches === 14) {
          hits14++;
          drawPrizeTotal += premio14;
        } else if (matches === 13) {
          hits13++;
          drawPrizeTotal += premio13;
        } else if (matches === 12) {
          hits12++;
          drawPrizeTotal += premio12;
        } else if (matches === 11) {
          hits11++;
          drawPrizeTotal += premio11;
        }
      }

      const totalPremiados = hits11 + hits12 + hits13 + hits14 + hits15;
      const lucroLiquido = drawPrizeTotal - costPerDraw;
      const roiPercent = costPerDraw > 0 ? (lucroLiquido / costPerDraw) * 100 : 0;

      return {
        concurso: draw.concurso,
        concursoLabel: `#${draw.concurso}`,
        data: draw.data,
        dezenasSorteadas: draw.dezenas,
        custo: Number(costPerDraw.toFixed(2)),
        retorno: Number(drawPrizeTotal.toFixed(2)),
        lucroLiquido: Number(lucroLiquido.toFixed(2)),
        roiPercent: Number(roiPercent.toFixed(1)),
        hits11,
        hits12,
        hits13,
        hits14,
        hits15,
        totalPremiados,
      };
    });
  }, [last20DrawsChronological, activeTickets]);

  // Métricas agregadas dos 20 concursos
  const summaryMetrics = useMemo(() => {
    const totalInvestido = roiData.reduce((acc, d) => acc + d.custo, 0);
    const totalRetorno = roiData.reduce((acc, d) => acc + d.retorno, 0);
    const saldoLiquidoConsolidado = totalRetorno - totalInvestido;
    const roiConsolidado = totalInvestido > 0 ? (saldoLiquidoConsolidado / totalInvestido) * 100 : 0;

    const concursosComLucro = roiData.filter((d) => d.lucroLiquido > 0).length;
    const concursosComPremio = roiData.filter((d) => d.retorno > 0).length;

    const total11 = roiData.reduce((acc, d) => acc + d.hits11, 0);
    const total12 = roiData.reduce((acc, d) => acc + d.hits12, 0);
    const total13 = roiData.reduce((acc, d) => acc + d.hits13, 0);
    const total14 = roiData.reduce((acc, d) => acc + d.hits14, 0);
    const total15 = roiData.reduce((acc, d) => acc + d.hits15, 0);

    const melhorConcurso = roiData.reduce(
      (best, curr) => (curr.retorno > best.retorno ? curr : best),
      roiData[0] || { concurso: 0, retorno: 0, roiPercent: 0 }
    );

    return {
      totalInvestido,
      totalRetorno,
      saldoLiquidoConsolidado,
      roiConsolidado,
      concursosComLucro,
      concursosComPremio,
      total11,
      total12,
      total13,
      total14,
      total15,
      melhorConcurso,
    };
  }, [roiData]);

  // Tooltip customizado com informações da Caixa e retorno do fechamento
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: DrawRoiData = payload[0].payload;

    return (
      <div className="bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2.5 max-w-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-black text-amber-400 font-mono text-sm">
            Concurso {data.concursoLabel}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{data.data}</span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Investimento (Custo):</span>
            <span className="font-mono font-bold text-slate-200">R$ {data.custo.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Retorno em Prêmios:</span>
            <span className="font-mono font-bold text-emerald-400">R$ {data.retorno.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Resultado Líquido:</span>
            <span
              className={`font-mono font-black ${
                data.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {data.lucroLiquido >= 0 ? '+' : ''}R$ {data.lucroLiquido.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="font-bold text-white">ROI do Concurso:</span>
            <span
              className={`font-mono font-black px-2 py-0.5 rounded-lg text-xs ${
                data.roiPercent >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {data.roiPercent >= 0 ? '+' : ''}
              {data.roiPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Faixas premiadas */}
        <div className="bg-slate-950/80 rounded-xl p-2.5 border border-slate-800 text-[11px] space-y-1">
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">
            Acertos Neste Concurso ({data.totalPremiados} premiados):
          </span>
          <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
            <span className="text-slate-300">11 pts: <strong className="text-emerald-400">{data.hits11}</strong></span>
            <span className="text-slate-300">12 pts: <strong className="text-emerald-400">{data.hits12}</strong></span>
            <span className="text-slate-300">13 pts: <strong className="text-amber-400">{data.hits13}</strong></span>
          </div>
          {(data.hits14 > 0 || data.hits15 > 0) && (
            <div className="pt-1 border-t border-slate-800/80 flex items-center gap-3 font-mono text-[10px]">
              {data.hits14 > 0 && <span className="text-purple-300 font-bold">14 pts: {data.hits14}</span>}
              {data.hits15 > 0 && <span className="text-yellow-300 font-bold animate-pulse">15 PONTOS: {data.hits15}</span>}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Card */}
      <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 shrink-0">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Histórico de Retorno sobre Investimento (ROI) • Últimos 20 Concursos
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  20 Concursos Oficiais Caixa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Auditoria de rentabilidade real com base nas premiações oficiais da Caixa Econômica Federal (11 a 15 acertos) confrontadas com o custo de aposta dos fechamentos salvos.
              </p>
            </div>
          </div>

          {/* Botão de atualização */}
          <button
            type="button"
            onClick={handleRefresh}
            className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700 active:scale-95"
            title="Recarregar jogos salvos e atualizar auditoria de ROI"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>Atualizar Dados</span>
          </button>
        </div>

        {/* Seletor de Estratégia e Alternador de Métricas */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Dropdown de Fechamentos Salvos */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-xs font-bold text-slate-400 shrink-0">Estratégia Analisada:</span>
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-emerald-500 max-w-md truncate"
            >
              {savedFechamentos.length > 1 && (
                <option value="all">
                  ⚡ Todas as Estratégias Salvas (Consolidado - {savedFechamentos.length} Fechamentos)
                </option>
              )}
              {savedFechamentos.map((f, idx) => (
                <option key={f.id} value={f.id}>
                  #{idx + 1} {f.tipoFechamento} ({f.totalJogos} Jogos - R$ {f.custoTotal.toFixed(2)})
                </option>
              ))}
              {savedFechamentos.length === 0 && (
                <option value="default_fallback">
                  Fechamento Padrão da Matriz (18 Dezenas • 24 Jogos)
                </option>
              )}
            </select>
          </div>

          {/* Alternador de Métrica Visualizada */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMetric('roi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMetric === 'roi'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ROI (%)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('lucro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMetric === 'lucro'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Retorno Líquido (R$)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('comparativo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMetric === 'comparativo'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Prêmios vs Custo
            </button>
          </div>
        </div>
      </div>

      {/* Cartões de Indicadores Chave de ROI (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Investido */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Investimento Total</span>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            R$ {summaryMetrics.totalInvestido.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">
            20 concursos × {activeTickets.length} jogos
          </span>
        </div>

        {/* Retorno Bruto Acumulado */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Prêmios Acumulados</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            R$ {summaryMetrics.totalRetorno.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-500 font-mono mt-1 block">
            {summaryMetrics.concursosComPremio} de 20 concursos premiados
          </span>
        </div>

        {/* ROI Consolidado (%) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">ROI Consolidado</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              summaryMetrics.roiConsolidado >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {summaryMetrics.roiConsolidado >= 0 ? '+' : ''}
            {summaryMetrics.roiConsolidado.toFixed(1)}%
          </div>
          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
            Saldo: {summaryMetrics.saldoLiquidoConsolidado >= 0 ? '+' : ''}R${' '}
            {summaryMetrics.saldoLiquidoConsolidado.toFixed(2)}
          </span>
        </div>

        {/* Melhor Concurso */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Melhor Concurso</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-300 font-mono">
            #{summaryMetrics.melhorConcurso.concurso || '-'}
          </div>
          <span className="text-[10px] text-purple-400 font-mono mt-1 block truncate">
            Prêmio: R$ {summaryMetrics.melhorConcurso.retorno?.toFixed(2)} ({summaryMetrics.melhorConcurso.roiPercent > 0 ? '+' : ''}{summaryMetrics.melhorConcurso.roiPercent?.toFixed(0)}% ROI)
          </span>
        </div>
      </div>

      {/* Gráfico de Barras Principal (Recharts) */}
      <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>
                {viewMetric === 'roi'
                  ? 'Retorno sobre Investimento (%) por Concurso Histórico'
                  : viewMetric === 'lucro'
                  ? 'Retorno Líquido (R$) por Concurso Histórico'
                  : 'Comparativo Financeiro: Premiação Obtida vs Custo da Aposta (R$)'}
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Estratégia: <strong className="text-slate-200">{currentStrategyTitle}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
              <span className="text-slate-300">Lucro Positivo (&gt; 0%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500 shrink-0" />
              <span className="text-slate-300">Premiação Parcial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
              <span className="text-slate-300">Sem Retorno</span>
            </div>
          </div>
        </div>

        {/* Container do Gráfico Recharts */}
        <div className="w-full h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={roiData}
              margin={{ top: 15, right: 15, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
              <XAxis
                dataKey="concursoLabel"
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                interval={0}
                angle={-35}
                textAnchor="end"
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                unit={viewMetric === 'roi' ? '%' : ' R$'}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={0}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                label={{
                  value: 'Break-even (0%)',
                  fill: '#94a3b8',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />

              {viewMetric === 'roi' && (
                <Bar dataKey="roiPercent" name="ROI (%)" radius={[4, 4, 0, 0]}>
                  {roiData.map((entry, index) => {
                    const color =
                      entry.roiPercent >= 0
                        ? '#10b981' // emerald-500
                        : entry.roiPercent >= -60
                        ? '#f59e0b' // amber-500
                        : '#ef4444'; // rose-500
                    return <Cell key={`cell-roi-${index}`} fill={color} />;
                  })}
                </Bar>
              )}

              {viewMetric === 'lucro' && (
                <Bar dataKey="lucroLiquido" name="Saldo Líquido (R$)" radius={[4, 4, 0, 0]}>
                  {roiData.map((entry, index) => {
                    const color =
                      entry.lucroLiquido >= 0
                        ? '#10b981'
                        : entry.lucroLiquido >= -(entry.custo * 0.6)
                        ? '#f59e0b'
                        : '#ef4444';
                    return <Cell key={`cell-lucro-${index}`} fill={color} />;
                  })}
                </Bar>
              )}

              {viewMetric === 'comparativo' && (
                <>
                  <Legend
                    wrapperStyle={{ paddingTop: 10, fontSize: 11 }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="retorno"
                    name="Prêmios Ganhos (R$)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="custo"
                    name="Custo da Aposta (R$)"
                    fill="#64748b"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Resumo de Faixas Premiadas (11 a 15 Pontos) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Distribuição Total de Bilhetes Premiados nos Últimos 20 Concursos</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Taxa de Sucesso: {((summaryMetrics.concursosComPremio / 20) * 100).toFixed(0)}% dos concursos premiados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">11 Pontos</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{summaryMetrics.total11}</span>
              <span className="text-[9px] text-slate-500 block">R$ 7,00 fixo</span>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">12 Pontos</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{summaryMetrics.total12}</span>
              <span className="text-[9px] text-slate-500 block">R$ 14,00 fixo</span>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">13 Pontos</span>
              <span className="text-lg font-black text-amber-400 font-mono">{summaryMetrics.total13}</span>
              <span className="text-[9px] text-slate-500 block">R$ 35,00 fixo</span>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">14 Pontos</span>
              <span className="text-lg font-black text-purple-400 font-mono">{summaryMetrics.total14}</span>
              <span className="text-[9px] text-slate-500 block">~R$ 1.540,00</span>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">15 Pontos</span>
              <span className="text-lg font-black text-yellow-400 font-mono">{summaryMetrics.total15}</span>
              <span className="text-[9px] text-slate-500 block">Prêmio Principal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
