import React, { useState, useMemo } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import {
  EPOCAS_FESTIVAS,
  MESES_DO_ANO,
  ESTACOES_DO_ANO,
  PeriodoSazonalMeta,
  DezenaSazonal,
} from '../data/sazonalidadeData';
import { ExpertTip } from './ExpertTip';
import {
  Calendar,
  Sparkles,
  Flame,
  Snowflake,
  TrendingUp,
  Award,
  Layers,
  ArrowRight,
  Filter,
  Check,
  CheckCircle2,
  BarChart3,
  HelpCircle,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';

interface SazonalidadeDezenasModuleProps {
  latestDraw: LotofacilDraw;
  onApplyNumbers?: (numbers: number[]) => void;
}

export const SazonalidadeDezenasModule: React.FC<SazonalidadeDezenasModuleProps> = ({
  latestDraw,
  onApplyNumbers,
}) => {
  const [category, setCategory] = useState<'festiva' | 'mes' | 'estacao'>('festiva');
  const [selectedKey, setSelectedKey] = useState<string>('independencia');
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'numero' | 'percentual_desc' | 'desvio_desc'>('percentual_desc');

  // Obtém o conjunto de dados atual
  const activeDataset = useMemo(() => {
    if (category === 'festiva') {
      const item = EPOCAS_FESTIVAS[selectedKey] || EPOCAS_FESTIVAS.independencia;
      return item;
    } else if (category === 'mes') {
      const monthNum = parseInt(selectedKey, 10) || 9;
      const item = MESES_DO_ANO[monthNum] || MESES_DO_ANO[9];
      return item;
    } else {
      const item = ESTACOES_DO_ANO[selectedKey] || ESTACOES_DO_ANO.primavera;
      return item;
    }
  }, [category, selectedKey]);

  // Lista ordenada de dezenas para a tabela
  const sortedDezenas = useMemo(() => {
    const list = [...activeDataset.dezenas];
    if (sortBy === 'numero') {
      list.sort((a, b) => a.numero - b.numero);
    } else if (sortBy === 'percentual_desc') {
      list.sort((a, b) => b.percentual - a.percentual);
    } else if (sortBy === 'desvio_desc') {
      list.sort((a, b) => b.desvioPercentual - a.desvioPercentual);
    }
    return list;
  }, [activeDataset, sortBy]);

  // Top 15 e Top 18 sazonais do período
  const top15Sazonais = useMemo(() => {
    return [...activeDataset.dezenas]
      .sort((a, b) => b.percentual - a.percentual)
      .slice(0, 15)
      .map((d) => d.numero)
      .sort((a, b) => a - b);
  }, [activeDataset]);

  const top18Sazonais = useMemo(() => {
    return [...activeDataset.dezenas]
      .sort((a, b) => b.percentual - a.percentual)
      .slice(0, 18)
      .map((d) => d.numero)
      .sort((a, b) => a - b);
  }, [activeDataset]);

  const handleApply = (nums: number[], label: string) => {
    if (onApplyNumbers) {
      onApplyNumbers(nums);
      setAppliedFeedback(`✓ ${label} aplicadas no fechamento!`);
      setTimeout(() => setAppliedFeedback(null), 4000);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header com badge de 10 Anos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                <span>SAZONALIDADE HISTÓRICA DE DEZENAS</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  BASE 10 ANOS
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comportamento das 25 dezenas em épocas festivas, meses do ano e estações climáticas (amostra de mais de 3.000 sorteios).
              </p>
            </div>
          </div>
        </div>

        {/* Categoria Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setCategory('festiva');
              setSelectedKey('independencia');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              category === 'festiva'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎪 Épocas Festivas
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('mes');
              setSelectedKey('9'); // Setembro por padrão
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              category === 'mes'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📅 12 Meses
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('estacao');
              setSelectedKey('primavera');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              category === 'estacao'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🍂 4 Estações
          </button>
        </div>
      </div>

      {/* Seletor do Sub-período */}
      <div className="flex flex-wrap gap-2">
        {category === 'festiva' && (
          <>
            {Object.keys(EPOCAS_FESTIVAS).map((key) => {
              const item = EPOCAS_FESTIVAS[key];
              const isSelected = selectedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-1 ring-purple-400'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                  <span>{item.meta.nome}</span>
                </button>
              );
            })}
          </>
        )}

        {category === 'mes' && (
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5 w-full">
            {Object.keys(MESES_DO_ANO).map((monthStr) => {
              const monthNum = parseInt(monthStr, 10);
              const item = MESES_DO_ANO[monthNum];
              const isSelected = selectedKey === monthStr;
              const nomesCurtos = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return (
                <button
                  key={monthStr}
                  type="button"
                  onClick={() => setSelectedKey(monthStr)}
                  className={`p-2 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-300'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="block font-mono text-[10px] text-slate-400">Mês {monthNum}</span>
                  <span className="block font-bold">{nomesCurtos[monthNum - 1]}</span>
                </button>
              );
            })}
          </div>
        )}

        {category === 'estacao' && (
          <>
            {Object.keys(ESTACOES_DO_ANO).map((key) => {
              const item = ESTACOES_DO_ANO[key];
              const isSelected = selectedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedKey(key)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-1 ring-purple-400'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.meta.nome}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* Card Informativo do Período */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-950 to-indigo-950/30 border border-purple-500/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider block">
              Período Selecionado • Amostra 10 Anos
            </span>
            <h4 className="text-base sm:text-lg font-black text-white mt-0.5">
              {activeDataset.meta.nome}
            </h4>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {activeDataset.meta.descricao} ({activeDataset.meta.totalConcursos} concursos auditados na janela histórica).
            </p>
          </div>

          {/* Quick Action Buttons: Aplicar Top Sazonais */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleApply(top15Sazonais, `Top 15 Sazonais (${activeDataset.meta.nome})`)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Aplicar Top 15 Sazonais</span>
            </button>

            <button
              type="button"
              onClick={() => handleApply(top18Sazonais, `Top 18 Sazonais (${activeDataset.meta.nome})`)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer shadow-md shadow-purple-600/20 flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Aplicar Top 18 no Fechamento</span>
            </button>
          </div>
        </div>

        {appliedFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedFeedback}</span>
          </div>
        )}

        {/* Destaques Quentes vs Frias */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Top 5 Quentes */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Flame className="w-4 h-4 fill-current" />
              </span>
              <div>
                <span className="text-[11px] font-bold text-white block">Top 5 Dezenas Mais Quentes</span>
                <span className="text-[10px] text-amber-400/80 font-mono">Maior incidência no período</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {activeDataset.meta.dezenasDestaque.map((num) => (
                <span
                  key={num}
                  className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 font-mono text-xs font-black flex items-center justify-center shadow-sm"
                >
                  {String(num).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>

          {/* Top 5 Frias */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-cyan-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Snowflake className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[11px] font-bold text-white block">Top 5 Dezenas Mais Frias</span>
                <span className="text-[10px] text-cyan-400/80 font-mono">Menor presença histórica</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {activeDataset.meta.dezenasFrias.map((num) => (
                <span
                  key={num}
                  className="w-6 h-6 rounded-md bg-slate-800 text-cyan-300 border border-cyan-500/40 font-mono text-xs font-bold flex items-center justify-center shadow-sm"
                >
                  {String(num).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Curiosidade */}
        <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-850 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-purple-300">Curiosidade Estatística:</strong>{' '}
            {activeDataset.meta.curiosidade}
          </span>
        </div>
      </div>

      {/* Gráfico de Sazonalidade (Recharts) */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Taxa de Incidência Sazonal (%) por Dezena (01 a 25)</span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Linha pontilhada em 60.0% representa a média matemática da Lotofácil (15 dezenas sorteadas de 25).
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
              <span>Super-Sazonal (&gt;64%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
              <span>Frio Sazonal (&lt;56.5%)</span>
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeDataset.dezenas}
              margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="numero"
                tickFormatter={(val) => String(val).padStart(2, '0')}
                stroke="#64748b"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
              />
              <YAxis
                domain={[35, 90]}
                stroke="#64748b"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DezenaSazonal;
                    return (
                      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                          <span className="font-bold text-white text-sm">
                            Dezena {String(data.numero).padStart(2, '0')}
                          </span>
                          <span
                            className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              data.status === 'super_sazonal'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : data.status === 'frio_sazonal'
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {data.status === 'super_sazonal'
                              ? '🔥 SUPER-SAZONAL'
                              : data.status === 'forte'
                              ? '✨ FORTE'
                              : data.status === 'frio_sazonal'
                              ? '❄️ FRIA NO PERÍODO'
                              : '⚖️ NEUTRA'}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Frequência Sazonal:{' '}
                          <strong className="text-white font-mono">{data.percentual}%</strong>
                        </div>
                        <div className="text-slate-300">
                          Total no Período:{' '}
                          <strong className="text-white font-mono">
                            {data.ocorrencias} de {data.totalConcursosPeriodo} sorteios
                          </strong>
                        </div>
                        <div className="text-slate-300">
                          Desvio da Média Geral (60%):{' '}
                          <strong
                            className={`font-mono ${
                              data.desvioPercentual >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {data.desvioPercentual >= 0 ? `+${data.desvioPercentual}%` : `${data.desvioPercentual}%`}
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={60}
                stroke="#a855f7"
                strokeDasharray="4 4"
                label={{
                  value: 'Média Esperada 60%',
                  fill: '#c084fc',
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
              <Bar dataKey="percentual" radius={[4, 4, 0, 0]}>
                {activeDataset.dezenas.map((entry) => {
                  let fill = '#3b82f6';
                  if (entry.status === 'super_sazonal') fill = '#f59e0b';
                  else if (entry.status === 'forte') fill = '#10b981';
                  else if (entry.status === 'frio_sazonal') fill = '#06b6d4';
                  else fill = '#6366f1';
                  return <Cell key={`cell-${entry.numero}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de Ranking Sazonal das 25 Dezenas */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>Tabela Auditada de Comportamento Sazonal (25 Dezenas)</span>
          </h4>

          {/* Ordenação */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-semibold focus:outline-none focus:border-purple-500"
            >
              <option value="percentual_desc">Maior Incidência Sazonal (%)</option>
              <option value="desvio_desc">Maior Desvio Positivo</option>
              <option value="numero">Número (01 a 25)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Dezena</th>
                <th className="py-2.5 px-3">Presença no Período</th>
                <th className="py-2.5 px-3">Incidência (%)</th>
                <th className="py-2.5 px-3">Desvio vs 60%</th>
                <th className="py-2.5 px-3">Classificação Sazonal</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sortedDezenas.map((item, idx) => (
                <tr key={item.numero} className="hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs shadow-sm ${
                        item.status === 'super_sazonal'
                          ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                          : item.status === 'forte'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : item.status === 'frio_sazonal'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {String(item.numero).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-white font-bold">{item.ocorrencias}</span>
                    <span className="text-slate-500 text-[11px]"> / {item.totalConcursosPeriodo} sorteios</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white min-w-[45px]">{item.percentual}%</span>
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.status === 'super_sazonal'
                              ? 'bg-amber-400'
                              : item.status === 'forte'
                              ? 'bg-emerald-400'
                              : item.status === 'frio_sazonal'
                              ? 'bg-cyan-400'
                              : 'bg-indigo-400'
                          }`}
                          style={{ width: `${Math.min(100, (item.percentual / 85) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`font-bold ${
                        item.desvioPercentual > 0
                          ? 'text-emerald-400'
                          : item.desvioPercentual < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.desvioPercentual > 0
                        ? `+${item.desvioPercentual}%`
                        : `${item.desvioPercentual}%`}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans">
                    {item.status === 'super_sazonal' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Flame className="w-3 h-3 fill-current" />
                        <span>Super-Sazonal</span>
                      </span>
                    ) : item.status === 'forte' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <Sparkles className="w-3 h-3" />
                        <span>Forte</span>
                      </span>
                    ) : item.status === 'frio_sazonal' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        <Snowflake className="w-3 h-3" />
                        <span>Fria no Período</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400">
                        <span>Neutra</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleApply([item.numero], `Dezena ${String(item.numero).padStart(2, '0')}`)}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-purple-600 text-slate-300 hover:text-white font-sans text-[11px] font-bold transition cursor-pointer"
                    >
                      Fixar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dica do Especialista em Sazonalidade */}
      <ExpertTip
        tipNumber="14"
        title="O Fenômeno da Sazonalidade e Concursos Especiais da Caixa"
        content="Mesmo com sorteios fisicamente aleatórios, períodos comissionados de apostas em massa (como a Lotofácil da Independência ou o final de ano) acumulam dinâmicas únicas de bilhetes e volume. Em 10 anos de histórico, dezenas como 03, 10, 20, 22 e 25 mantêm desvios de frequência superiores a 65% em setembro e dezembro. Incorporar ao menos 3 a 5 dezenas com viés super-sazonal positivo em seus fechamentos reforça o alinhamento probabilístico contra anomalias sazonais."
      />
    </div>
  );
};
