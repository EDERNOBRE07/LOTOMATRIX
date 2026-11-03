import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { EvolucaoCustoRetornoAreaChart } from './EvolucaoCustoRetornoAreaChart';

interface AnaliseROISavedGamesProps {
  tickets?: GameTicket[];
  latestDraw?: LotofacilDraw;
}

type ConcursosInterval = 1 | 5 | 10 | 20;

export const AnaliseROISavedGames: React.FC<AnaliseROISavedGamesProps> = ({
  tickets = [],
  latestDraw = CONCURSO_ATUAL,
}) => {
  // 1. Valor da Aposta Mínima (personalizável pelo usuário, default R$ 3,50)
  const [apostaMinima, setApostaMinima] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_roi_aposta_minima');
      return saved ? parseFloat(saved) : 3.5;
    } catch {
      return 3.5;
    }
  });

  // 2. Intervalo de Concursos para Análise
  const [intervaloConcursos, setIntervaloConcursos] = useState<ConcursosInterval>(5);

  // 3. Exibir detalhamento por concurso
  const [isDetailsExpanded, setIsDetailsExpanded] = useState<boolean>(false);

  // Salva preferência da aposta mínima
  const handleApostaMinimaChange = (valor: number) => {
    const safeVal = Math.max(0.5, isNaN(valor) ? 3.5 : valor);
    setApostaMinima(safeVal);
    try {
      localStorage.setItem('lotosniper_roi_aposta_minima', safeVal.toString());
    } catch {}
  };

  // Coleta todos os jogos salvos para análise (tickets atuais ou fechamentos arquivados)
  const allSavedTickets = useMemo(() => {
    if (tickets && tickets.length > 0) {
      return tickets;
    }
    const saved = getSavedFechamentos();
    const flat = saved.flatMap((f) => f.tickets);
    return flat.length > 0 ? flat : [];
  }, [tickets]);

  // Lista dos concursos do histórico para o intervalo selecionado
  const drawsToEvaluate = useMemo(() => {
    const historical = getHistorical100Draws(latestDraw);
    return historical.slice(0, intervaloConcursos);
  }, [latestDraw, intervaloConcursos]);

  // Cálculo detalhado de ROI e premiações
  const roiSummary = useMemo(() => {
    if (allSavedTickets.length === 0) {
      return {
        totalJogos: 0,
        custoPorConcurso: 0,
        custoTotal: 0,
        premioTotal: 0,
        lucroLiquido: 0,
        roiPercentual: 0,
        faixas: { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 },
        faixasValores: { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 },
        concursosDetalhados: [],
        taxaAcerto: 0,
      };
    }

    // Calcula o custo unitário ponderado por bilhete (caso haja 16 ou 17 dezenas)
    const custoPorConcurso = allSavedTickets.reduce((acc, t) => {
      const dezenasCount = t.dezenas.length;
      if (dezenasCount === 16) return acc + apostaMinima * 16;
      if (dezenasCount === 17) return acc + apostaMinima * 136;
      return acc + apostaMinima;
    }, 0);

    const custoTotal = custoPorConcurso * drawsToEvaluate.length;

    let premioTotal = 0;
    const faixas = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };
    const faixasValores = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };
    let totalBilhetesPremiados = 0;

    const concursosDetalhados = drawsToEvaluate.map((draw) => {
      let concursoPremio = 0;
      let c15 = 0;
      let c14 = 0;
      let c13 = 0;
      let c12 = 0;
      let c11 = 0;

      const p15 = draw.premiacoes?.faixa15?.valor || 1800000;
      const p14 = draw.premiacoes?.faixa14?.valor || 1500;
      const p13 = draw.premiacoes?.faixa13?.valor || 35.0;
      const p12 = draw.premiacoes?.faixa12?.valor || 14.0;
      const p11 = draw.premiacoes?.faixa11?.valor || 7.0;

      allSavedTickets.forEach((ticket) => {
        const hits = countMatches(ticket.dezenas, draw.dezenas);
        if (hits === 15) {
          c15++;
          faixas[15]++;
          faixasValores[15] += p15;
          concursoPremio += p15;
          totalBilhetesPremiados++;
        } else if (hits === 14) {
          c14++;
          faixas[14]++;
          faixasValores[14] += p14;
          concursoPremio += p14;
          totalBilhetesPremiados++;
        } else if (hits === 13) {
          c13++;
          faixas[13]++;
          faixasValores[13] += p13;
          concursoPremio += p13;
          totalBilhetesPremiados++;
        } else if (hits === 12) {
          c12++;
          faixas[12]++;
          faixasValores[12] += p12;
          concursoPremio += p12;
          totalBilhetesPremiados++;
        } else if (hits === 11) {
          c11++;
          faixas[11]++;
          faixasValores[11] += p11;
          concursoPremio += p11;
          totalBilhetesPremiados++;
        }
      });

      premioTotal += concursoPremio;
      const saldoConcurso = concursoPremio - custoPorConcurso;

      return {
        concurso: draw.concurso,
        data: draw.data,
        dezenas: draw.dezenas,
        custo: custoPorConcurso,
        premio: concursoPremio,
        saldo: saldoConcurso,
        premiadosTotal: c15 + c14 + c13 + c12 + c11,
        hits: { 15: c15, 14: c14, 13: c13, 12: c12, 11: c11 },
      };
    });

    const lucroLiquido = premioTotal - custoTotal;
    const roiPercentual = custoTotal > 0 ? (lucroLiquido / custoTotal) * 100 : 0;
    const totalApostasAvaliadas = allSavedTickets.length * drawsToEvaluate.length;
    const taxaAcerto = totalApostasAvaliadas > 0 ? (totalBilhetesPremiados / totalApostasAvaliadas) * 100 : 0;

    return {
      totalJogos: allSavedTickets.length,
      custoPorConcurso,
      custoTotal,
      premioTotal,
      lucroLiquido,
      roiPercentual,
      faixas,
      faixasValores,
      concursosDetalhados,
      taxaAcerto,
      totalBilhetesPremiados,
    };
  }, [allSavedTickets, apostaMinima, drawsToEvaluate]);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isPositive = roiSummary.lucroLiquido > 0;
  const isNeutral = Math.abs(roiSummary.lucroLiquido) < 0.01;

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900 to-emerald-950/20 rounded-3xl border-2 border-emerald-500/40 p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                Análise de ROI & Retorno Financeiro dos Jogos Salvos
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                AUDITORIA DE LUCRO LÍQUIDO
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Defina o valor da aposta mínima para auditar automaticamente o custo total dos seus {roiSummary.totalJogos} jogos salvos, total faturado em prêmios e o lucro líquido real obtido nos últimos concursos.
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="self-start md:self-center shrink-0">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-md ${
              isPositive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/15'
                : isNeutral
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/15'
            }`}
          >
            {isPositive ? (
              <>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Lucro Operacional Positivo (+{roiSummary.roiPercentual.toFixed(1)}%)</span>
              </>
            ) : isNeutral ? (
              <>
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Ponto de Equilíbrio (0.0%)</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Ajuste de Saldo ({roiSummary.roiPercentual.toFixed(1)}%)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Controles Interativos: Valor da Aposta Mínima & Intervalo de Concursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
        {/* Controle 1: Valor da Aposta Mínima */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Valor da Aposta Mínima:</span>
            </span>
            <span className="font-mono text-emerald-400 font-black">{formatBRL(apostaMinima)}</span>
          </label>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">
                R$
              </span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="50"
                value={apostaMinima}
                onChange={(e) => handleApostaMinimaChange(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            {/* Quick buttons */}
            <div className="flex gap-1.5">
              {[3.0, 3.5, 4.0, 5.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleApostaMinimaChange(val)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer border ${
                    Math.abs(apostaMinima - val) < 0.05
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-black'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {val.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-500 block">
            Padrão Caixa Econômica Federal para 15 dezenas: <strong>R$ 3,50</strong>
          </span>
        </div>

        {/* Controle 2: Intervalo de Concursos */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Intervalo de Concursos Auditados:</span>
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              #{drawsToEvaluate[drawsToEvaluate.length - 1]?.concurso} até #{drawsToEvaluate[0]?.concurso}
            </span>
          </label>

          <div className="grid grid-cols-4 gap-1.5">
            {([1, 5, 10, 20] as ConcursosInterval[]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setIntervaloConcursos(val)}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
                  intervaloConcursos === val
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 border-emerald-400 shadow-md font-black'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {val === 1 ? 'Último' : `${val} Sorteios`}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 block">
            Audita o desempenho real dos jogos contra sorteios apurados
          </span>
        </div>
      </div>

      {/* 4 Cards Principais de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Custo Total Investido */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-1 relative overflow-hidden">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Custo Total dos Jogos
          </span>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatBRL(roiSummary.custoTotal)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>
              {roiSummary.totalJogos} jogos × {drawsToEvaluate.length} concurso(s)
            </span>
            <span className="font-mono text-slate-300">
              {formatBRL(roiSummary.custoPorConcurso)}/conc
            </span>
          </div>
        </div>

        {/* Card 2: Retorno Bruto em Prêmios */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-1 relative overflow-hidden">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Retorno Bruto Obtido
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatBRL(roiSummary.premioTotal)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>{roiSummary.totalBilhetesPremiados || 0} bilhetes premiados</span>
            <span className="text-emerald-400 font-mono font-bold">
              {roiSummary.taxaAcerto.toFixed(1)}% taxa
            </span>
          </div>
        </div>

        {/* Card 3: Lucro Líquido */}
        <div
          className={`rounded-2xl border p-4 space-y-1 relative overflow-hidden ${
            isPositive
              ? 'bg-emerald-950/40 border-emerald-500/50'
              : isNeutral
              ? 'bg-slate-950/80 border-slate-800'
              : 'bg-rose-950/30 border-rose-500/40'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Lucro Líquido Real
          </span>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              isPositive ? 'text-emerald-300' : isNeutral ? 'text-slate-200' : 'text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {formatBRL(roiSummary.lucroLiquido)}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>Prêmios − Custo Total</span>
            <span
              className={`font-bold font-mono ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? 'Superávit' : isNeutral ? 'Neutro' : 'Déficit'}
            </span>
          </div>
        </div>

        {/* Card 4: ROI (%) */}
        <div
          className={`rounded-2xl border p-4 space-y-1 relative overflow-hidden ${
            isPositive
              ? 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border-emerald-500/40'
              : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            ROI (Return on Investment)
          </span>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              isPositive ? 'text-emerald-300' : isNeutral ? 'text-slate-300' : 'text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {roiSummary.roiPercentual.toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
            <span>Eficiência do Capital</span>
            <span className="text-slate-300 font-bold">
              {roiSummary.custoTotal > 0
                ? `${(roiSummary.premioTotal / roiSummary.custoTotal).toFixed(2)}x retorno`
                : '0x'}
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de Área Recharts: Evolução Histórica Custo vs Retorno (ROI) */}
      <EvolucaoCustoRetornoAreaChart
        tickets={allSavedTickets}
        latestDraw={latestDraw}
        apostaMinima={apostaMinima}
      />

      {/* Detalhamento por Faixa de Premiação (11 a 15 Acertos) */}
      <div className="bg-slate-950/90 rounded-2xl border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Distribuição de Premiações por Faixa de Acertos ({drawsToEvaluate.length} Concursos)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Total Premiado: <strong className="text-emerald-400">{formatBRL(roiSummary.premioTotal)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { faixa: 15, label: '15 Pontos', bg: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/40', text: 'text-amber-300' },
            { faixa: 14, label: '14 Pontos', bg: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/40', text: 'text-emerald-300' },
            { faixa: 13, label: '13 Pontos', bg: 'from-blue-500/20 to-cyan-500/10', border: 'border-blue-500/40', text: 'text-blue-300' },
            { faixa: 12, label: '12 Pontos', bg: 'from-purple-500/20 to-indigo-500/10', border: 'border-purple-500/40', text: 'text-purple-300' },
            { faixa: 11, label: '11 Pontos', bg: 'from-slate-800 to-slate-900', border: 'border-slate-700', text: 'text-slate-300' },
          ].map((item) => {
            const count = (roiSummary.faixas as any)[item.faixa] || 0;
            const valor = (roiSummary.faixasValores as any)[item.faixa] || 0;
            return (
              <div
                key={item.faixa}
                className={`p-3 rounded-xl border bg-gradient-to-br ${item.bg} ${item.border} space-y-1 text-center`}
              >
                <span className={`text-[11px] font-black uppercase block ${item.text}`}>
                  {item.label}
                </span>
                <div className="text-lg font-black text-white font-mono">
                  {count} <span className="text-[10px] text-slate-400 font-normal">bilhete(s)</span>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 font-bold">
                  {formatBRL(valor)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toggle para Abrir Detalhamento Concurso a Concurso */}
      <div>
        <button
          type="button"
          onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 font-bold flex items-center justify-between transition cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Detalhamento Financeiro Concurso a Concurso ({drawsToEvaluate.length} concursos)</span>
          </span>
          {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isDetailsExpanded && (
          <div className="mt-3 bg-slate-950/95 rounded-2xl border border-slate-800 p-4 space-y-2.5 animate-fadeIn">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Concurso</th>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Dezenas Sorteadas</th>
                    <th className="py-2 px-3 text-center">Premiados</th>
                    <th className="py-2 px-3 text-right">Custo</th>
                    <th className="py-2 px-3 text-right">Prêmios</th>
                    <th className="py-2 px-3 text-right">Saldo Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {roiSummary.concursosDetalhados.map((item: any) => (
                    <tr key={item.concurso} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-white">#{item.concurso}</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.data}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                        {item.dezenas.slice(0, 8).map((n: number) => n.toString().padStart(2, '0')).join(' ')}...
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          item.premiadosTotal > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {item.premiadosTotal} jogos
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {formatBRL(item.custo)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatBRL(item.premio)}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          item.saldo > 0
                            ? 'text-emerald-300'
                            : item.saldo === 0
                            ? 'text-slate-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.saldo > 0 ? '+' : ''}
                        {formatBRL(item.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
