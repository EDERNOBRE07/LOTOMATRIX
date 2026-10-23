import React, { useState, useMemo, useEffect } from 'react';
import {
  calculateCurvaAbc,
  CurvaAbcItem,
  CurvaAbcSummary,
  getCurvaAbcFilterConfig,
  saveCurvaAbcFilterConfig,
  CurvaAbcFilterConfig,
} from '../services/curvaAbcService';
import { DezenaStats, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { soundService } from '../services/soundAlert';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Award,
  Sparkles,
  ShieldCheck,
  Check,
  ArrowRight,
  TrendingUp,
  Info,
  Filter,
  Layers,
  BarChart2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface CurvaAbcDezenasComponentProps {
  statsList?: DezenaStats[];
  latestDraw?: LotofacilDraw;
  onApplyNumbers?: (numbers: number[]) => void;
  onApplyFilterCurvaAbc?: (config: CurvaAbcFilterConfig) => void;
}

export const CurvaAbcDezenasComponent: React.FC<CurvaAbcDezenasComponentProps> = ({
  statsList = DEZENAS_STATS,
  latestDraw = CONCURSO_ATUAL,
  onApplyNumbers,
  onApplyFilterCurvaAbc,
}) => {
  const summary: CurvaAbcSummary = useMemo(() => {
    return calculateCurvaAbc(statsList);
  }, [statsList]);

  const [filterConfig, setFilterConfig] = useState<CurvaAbcFilterConfig>(() => {
    return getCurvaAbcFilterConfig();
  });

  const [selectedClasseFilter, setSelectedClasseFilter] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Chart data format
  const chartData = useMemo(() => {
    return summary.items.map((item) => ({
      numeroLabel: item.numero.toString().padStart(2, '0'),
      numero: item.numero,
      vezes: item.vezes,
      cumulativeShare: item.cumulativeShare,
      sharePercentual: item.sharePercentual,
      classe: item.classe,
    }));
  }, [summary]);

  const handleToggleFilter = () => {
    const updated: CurvaAbcFilterConfig = {
      ...filterConfig,
      ativo: !filterConfig.ativo,
    };
    setFilterConfig(updated);
    saveCurvaAbcFilterConfig(updated);
    if (onApplyFilterCurvaAbc) onApplyFilterCurvaAbc(updated);

    if (updated.ativo) {
      soundService.playGoldenZoneSuccessChime();
      setNotificationMsg(
        `✓ Filtro de Curva ABC ATIVADO para fechamentos futuros: Mínimo de ${updated.minClasseA} dezenas da Classe A por bilhete.`
      );
    } else {
      setNotificationMsg('Filtro de Curva ABC desativado para novos fechamentos.');
    }
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleChangeMinClasseA = (newMin: number) => {
    const updated: CurvaAbcFilterConfig = {
      ...filterConfig,
      minClasseA: newMin,
      ativo: true,
    };
    setFilterConfig(updated);
    saveCurvaAbcFilterConfig(updated);
    if (onApplyFilterCurvaAbc) onApplyFilterCurvaAbc(updated);

    soundService.playGoldenZoneSuccessChime();
    setNotificationMsg(
      `✓ Calibração salva: Mínimo de ${newMin} dezenas da Classe A por bilhete em futuros fechamentos.`
    );
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleApplyFullClasseA = () => {
    if (onApplyNumbers) {
      onApplyNumbers(summary.classeANumeros);
    }
    soundService.playGoldenZoneSuccessChime();
    setNotificationMsg(
      `✓ As ${summary.classeANumeros.length} dezenas da Classe A (80% de Frequência Histórica) foram aplicadas no volante!`
    );
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleApplyTop18ClasseA = () => {
    const top18 = summary.classeA.slice(0, 18).map((it) => it.numero).sort((a, b) => a - b);
    if (onApplyNumbers) {
      onApplyNumbers(top18);
    }
    soundService.playGoldenZoneSuccessChime();
    setNotificationMsg('✓ As Top 18 dezenas de elite da Classe A foram aplicadas no Fechamento!');
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const filteredItems = useMemo(() => {
    if (selectedClasseFilter === 'TODAS') return summary.items;
    return summary.items.filter((it) => it.classe === selectedClasseFilter);
  }, [summary, selectedClasseFilter]);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 rounded-2xl border border-amber-500/30 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-bold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>PRINCÍPIO DE PARETO (80/20)</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold">
                CONCURSO #{latestDraw.concurso}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Análise de Curva ABC para as Dezenas</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Estratificação estatística das 25 dezenas com base em 57.000 bolas extraídas nos 3.800+
              concursos oficiais. A <strong className="text-amber-400">Classe A</strong> reúne as dezenas que respondem
              por <strong className="text-amber-400">80% da frequência histórica acumulada</strong> e
              compõem a espinha dorsal de qualquer fechamento com alta probabilidade de premiação.
            </p>
          </div>

          {/* Quick Apply Buttons in Hero */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={handleApplyFullClasseA}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Aplicar Classe A no Fechamento</span>
            </button>
            <button
              onClick={handleApplyTop18ClasseA}
              className="px-4 py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Aplicar Top 18 da Classe A</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{notificationMsg}</span>
          </div>
          <button
            onClick={() => setNotificationMsg(null)}
            className="text-emerald-400/70 hover:text-emerald-200 text-xs font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 3 Summary Cards (Classes A, B, C) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Classe A - DESTAQUE VISUAL TOTAL */}
        <div className="relative rounded-2xl p-5 bg-gradient-to-b from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-xl shadow-amber-500/10 overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/30 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>CLASSE A • DOMINÂNCIA 80%</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
              {summary.classeANumeros.length} Dezenas
            </span>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Volume Acumulado:</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                {summary.pctVolumeClasseA}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Média por Sorteio:</span>
              <span className="text-xs font-bold text-white font-mono">
                ~{summary.mediaPresencaClasseA} dezenas / concurso
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400">Presentes no #{latestDraw.concurso}:</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {summary.presencaClasseAUltimoConcurso} de 15 dezenas (80.0%)
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-500/30">
            <div className="text-[11px] font-semibold text-slate-300 mb-2">Dezenas da Classe A:</div>
            <div className="flex flex-wrap gap-1.5">
              {summary.classeANumeros.map((num) => {
                const wasInLatest = latestDraw.dezenas.includes(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-mono font-black ${
                      wasInLatest
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 shadow-sm shadow-amber-500/40 ring-1 ring-amber-300'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                    title={`Dezena ${num} ${wasInLatest ? '(Saiu no concurso atual)' : ''}`}
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card Classe B */}
        <div className="rounded-2xl p-5 bg-slate-900/90 border border-cyan-500/30 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>CLASSE B • TRANSIÇÃO (15%)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                {summary.classeBNumeros.length} Dezenas
              </span>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Volume Acumulado:</span>
                <span className="text-lg font-black text-cyan-300 font-mono">
                  {summary.pctVolumeClasseB}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Média por Sorteio:</span>
                <span className="text-xs font-bold text-white font-mono">~2.3 dezenas / concurso</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Presentes no #{latestDraw.concurso}:</span>
                <span className="text-xs font-bold text-cyan-400 font-mono">
                  {summary.classeB.filter((it) => it.presenteUltimoConcurso).length} de 15 dezenas
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-300 mb-2">Dezenas da Classe B:</div>
            <div className="flex flex-wrap gap-1.5">
              {summary.classeBNumeros.map((num) => {
                const wasInLatest = latestDraw.dezenas.includes(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-mono font-bold ${
                      wasInLatest
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card Classe C */}
        <div className="rounded-2xl p-5 bg-slate-900/90 border border-purple-500/30 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>CLASSE C • PERIFÉRICA (&lt;5%)</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                {summary.classeCNumeros.length} Dezena
              </span>
            </div>

            <div className="space-y-2 mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Volume Acumulado:</span>
                <span className="text-lg font-black text-purple-300 font-mono">
                  {summary.pctVolumeClasseC}%
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Média por Sorteio:</span>
                <span className="text-xs font-bold text-white font-mono">~0.6 dezena / concurso</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Presentes no #{latestDraw.concurso}:</span>
                <span className="text-xs font-bold text-purple-400 font-mono">
                  {summary.classeC.filter((it) => it.presenteUltimoConcurso).length} de 15 dezenas
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-300 mb-2">Dezenas da Classe C:</div>
            <div className="flex flex-wrap gap-1.5">
              {summary.classeCNumeros.map((num) => {
                const wasInLatest = latestDraw.dezenas.includes(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-mono font-bold ${
                      wasInLatest
                        ? 'bg-purple-500 text-white font-black'
                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {num.toString().padStart(2, '0')}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Controle de Filtro para Fechamentos Futuros */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">
                  Filtro Canônico da Curva ABC para Fechamentos Futuros
                </h3>
                <span
                  className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                    filterConfig.ativo
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {filterConfig.ativo ? '✓ FILTRO ATIVO' : 'DESATIVADO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Garanta que 100% dos jogos gerados contenham o contingente ideal de dezenas da Classe A,
                evitando apostas contaminadas com dezenas frias e periféricas.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleFilter}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
              filterConfig.ativo
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {filterConfig.ativo ? (
              <>
                <Check className="w-4 h-4" />
                <span>Filtro Ativo</span>
              </>
            ) : (
              <>
                <Filter className="w-4 h-4" />
                <span>Ativar nos Fechamentos</span>
              </>
            )}
          </button>
        </div>

        {/* Seletor de Rigor do Filtro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            {
              min: 10,
              label: 'Moderado (Mín. 10)',
              desc: 'Cobre ~94% dos concursos oficiais da Lotofácil',
            },
            {
              min: 11,
              label: 'Recomendado (Mín. 11)',
              desc: 'Zona de Ouro equilibrada (cobre ~85% dos resultados)',
            },
            {
              min: 12,
              label: 'Rigoroso (Mín. 12)',
              desc: 'Concentração máxima na elite histórica (cobre ~65%)',
            },
            {
              min: 13,
              label: 'Ultra Focado (Mín. 13)',
              desc: 'Fechamentos altamente concentrados nas dezenas dominantes',
            },
          ].map((opt) => {
            const isSelected = filterConfig.minClasseA === opt.min && filterConfig.ativo;
            return (
              <button
                key={opt.min}
                type="button"
                onClick={() => handleChangeMinClasseA(opt.min)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-400/40 text-white'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gráfico ComposedChart Pareto (Ocorrências + Linha Acumulada da Curva ABC) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-amber-400" />
              <span>Diagrama de Pareto & Curva ABC Acumulada</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Barras indicam a frequência individual de cada dezena; a linha contínua traça a
              porcentagem acumulada com corte de 80%.
            </p>
          </div>

          {/* Legenda Cromática */}
          <div className="flex items-center gap-3 text-xs flex-wrap font-mono">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" />
              <span>Classe A (Até 80%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded-sm bg-cyan-400 inline-block" />
              <span>Classe B (80-95%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />
              <span>Classe C (&gt;95%)</span>
            </span>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 30, left: -10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis
                dataKey="numeroLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                label={{ value: 'Dezena', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#94a3b8"
                fontSize={11}
                domain={[2100, 2420]}
                tickLine={false}
                label={{ value: 'Frequência (Vezes)', angle: -90, position: 'insideLeft', offset: 15, fill: '#64748b', fontSize: 11 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#38bdf8"
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-amber-500 text-slate-950 inline-flex items-center justify-center font-black">
                            {data.numeroLabel}
                          </span>
                          <span>Dezena {data.numeroLabel}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              data.classe === 'A'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : data.classe === 'B'
                                ? 'bg-cyan-500 text-slate-950'
                                : 'bg-purple-500 text-white'
                            }`}
                          >
                            Classe {data.classe}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Ocorrências: <strong className="text-white">{data.vezes}</strong> vezes
                        </div>
                        <div className="text-slate-300">
                          Share Individual: <strong className="text-amber-300">{data.sharePercentual}%</strong>
                        </div>
                        <div className="text-slate-300">
                          Curva ABC Acumulada: <strong className="text-sky-300">{data.cumulativeShare}%</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
              />

              {/* Linha de corte nos 80% de Pareto */}
              <ReferenceLine
                yAxisId="right"
                y={80}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: 'Limite 80% (Classe A)',
                  position: 'insideTopLeft',
                  fill: '#f59e0b',
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              />

              <Bar yAxisId="left" dataKey="vezes" name="Ocorrências Históricas" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  let fillColor = '#f59e0b'; // Classe A
                  if (entry.classe === 'B') fillColor = '#06b6d4';
                  if (entry.classe === 'C') fillColor = '#a855f7';
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeShare"
                name="% Curva ABC Acumulada"
                stroke="#38bdf8"
                strokeWidth={3}
                dot={{ r: 3, fill: '#38bdf8' }}
                activeDot={{ r: 6, fill: '#f59e0b' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Interativa de Dezenas & Classes */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Detalhamento dos Grupos da Curva ABC</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ranking ordenado do maior volume para o menor, com status no sorteio atual.
            </p>
          </div>

          {/* Filtro de Classe */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {(['TODAS', 'A', 'B', 'C'] as const).map((cl) => (
              <button
                key={cl}
                onClick={() => setSelectedClasseFilter(cl)}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedClasseFilter === cl
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cl === 'TODAS' ? 'Todas (25)' : `Classe ${cl}`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Dezena</th>
                <th className="py-2.5 px-3 text-center">Classe</th>
                <th className="py-2.5 px-3 text-center">Ocorrências</th>
                <th className="py-2.5 px-3 text-center">% Presença Concursos</th>
                <th className="py-2.5 px-3 text-center">Share Individual</th>
                <th className="py-2.5 px-3 text-center">% Acumulado</th>
                <th className="py-2.5 px-3 text-center">No Concurso #{latestDraw.concurso}</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredItems.map((item) => {
                const isClassA = item.classe === 'A';
                const wasInCurrent = latestDraw.dezenas.includes(item.numero);

                return (
                  <tr
                    key={item.numero}
                    className={`hover:bg-slate-800/40 transition ${
                      isClassA ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-400 font-bold">#{item.rank}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-7 h-7 rounded-lg inline-flex items-center justify-center font-bold text-xs ${
                            isClassA
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                              : item.classe === 'B'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          {item.numero.toString().padStart(2, '0')}
                        </span>
                        {item.ePrimo && (
                          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-sans">
                            Primo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isClassA
                            ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                            : item.classe === 'B'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        }`}
                      >
                        Classe {item.classe}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-200 font-bold">
                      {item.vezes.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-300 font-bold">
                      {item.frequenciaPercentual}%
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400">
                      {item.sharePercentual}%
                    </td>
                    <td className="py-2 px-3 text-center text-sky-400 font-bold">
                      {item.cumulativeShare}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      {wasInCurrent ? (
                        <span className="text-emerald-400 text-xs font-bold font-sans">
                          ✓ Sorteada
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-sans">Ausente</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {onApplyNumbers && (
                        <button
                          onClick={() => onApplyNumbers([item.numero])}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold font-sans transition cursor-pointer"
                        >
                          Marcar
                        </button>
                      )}
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
