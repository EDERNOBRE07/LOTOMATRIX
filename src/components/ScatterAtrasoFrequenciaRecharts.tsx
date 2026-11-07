import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  ReferenceArea,
} from 'recharts';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, RECENT_DRAWS } from '../data/lotofacilData';
import { getHistoricalNDraws } from '../services/historical100Draws';
import {
  FiltroIntervaloTempoEstatisticas,
  TimeRangeInterval,
  TIME_RANGE_OPTIONS,
} from './FiltroIntervaloTempoEstatisticas';
import { Target, Sparkles, TrendingUp, AlertTriangle, Flame, Info, CheckCircle2 } from 'lucide-react';
import { ExpertTip } from './ExpertTip';

interface ScatterAtrasoFrequenciaProps {
  latestDraw?: LotofacilDraw;
  customStats?: DezenaStats[];
  onSelectDezena?: (dezena: number) => void;
  initialTimeRange?: TimeRangeInterval;
  onTimeRangeChange?: (range: TimeRangeInterval) => void;
}

interface ScatterDezenaPoint {
  dezena: number;
  dezenaPad: string;
  frequencia: number;
  atrasoAtual: number;
  quadrante: 'oportunidade' | 'quente' | 'risco' | 'neutro';
  quadranteLabel: string;
  quadranteCor: string;
  sugerida: boolean;
  percentualPresenca: number;
}

export const ScatterAtrasoFrequenciaRecharts: React.FC<ScatterAtrasoFrequenciaProps> = ({
  latestDraw = CONCURSO_ATUAL,
  customStats,
  onSelectDezena,
  initialTimeRange = '6_meses',
  onTimeRangeChange,
}) => {
  const [filterZone, setFilterZone] = useState<'todas' | 'oportunidade' | 'risco' | 'quente'>('todas');
  const [timeRange, setTimeRange] = useState<TimeRangeInterval>(initialTimeRange);

  React.useEffect(() => {
    if (initialTimeRange && initialTimeRange !== timeRange) {
      setTimeRange(initialTimeRange);
    }
  }, [initialTimeRange]);

  const handleTimeRangeChange = (newRange: TimeRangeInterval) => {
    setTimeRange(newRange);
    if (onTimeRangeChange) {
      onTimeRangeChange(newRange);
    }
  };

  const activeTimeOption = TIME_RANGE_OPTIONS.find((o) => o.id === timeRange) || TIME_RANGE_OPTIONS[2];

  // Sorteios filtrados de acordo com o intervalo temporal selecionado
  const drawsInInterval = useMemo(() => {
    return getHistoricalNDraws(activeTimeOption.drawCount, latestDraw);
  }, [activeTimeOption.drawCount, latestDraw]);

  // Recalcula atraso atual e frequência de cada dezena estritamente no intervalo selecionado
  const dataPoints: ScatterDezenaPoint[] = useMemo(() => {
    const totalDraws = drawsInInterval.length;
    // Média matemática de saídas esperada por dezena no período
    const avgFreq = (totalDraws * 15) / 25;

    return Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
      // Frequência real de saídas da dezena dentro dos concursos deste período
      let freqInInterval = 0;
      for (const d of drawsInInterval) {
        if (d.dezenas.includes(num)) {
          freqInInterval++;
        }
      }

      // Atraso atual (quantos sorteios consecutivos sem sair a partir do mais recente)
      let delay = 0;
      for (const d of drawsInInterval) {
        if (d.dezenas.includes(num)) {
          break;
        }
        delay++;
      }

      let quadrante: 'oportunidade' | 'quente' | 'risco' | 'neutro' = 'neutro';
      let quadranteLabel = 'Zona Regular';
      let quadranteCor = '#94a3b8'; // Slate
      let sugerida = false;

      if (freqInInterval >= avgFreq && delay >= 2) {
        quadrante = 'oportunidade';
        quadranteLabel = '🎯 Mola Estatística (Oportunidade)';
        quadranteCor = '#10b981'; // Emerald
        sugerida = true;
      } else if (freqInInterval >= avgFreq && delay < 2) {
        quadrante = 'quente';
        quadranteLabel = '🔥 Zona Quente Ativa';
        quadranteCor = '#f59e0b'; // Amber
      } else if (freqInInterval < avgFreq && delay >= 2) {
        quadrante = 'risco';
        quadranteLabel = '⚠️ Zona de Risco (Fria no Período)';
        quadranteCor = '#f43f5e'; // Rose
      } else {
        quadrante = 'neutro';
        quadranteLabel = '⚖️ Zona Neutra';
        quadranteCor = '#38bdf8'; // Sky
      }

      return {
        dezena: num,
        dezenaPad: num.toString().padStart(2, '0'),
        frequencia: freqInInterval,
        atrasoAtual: delay,
        quadrante,
        quadranteLabel,
        quadranteCor,
        sugerida,
        percentualPresenca: totalDraws > 0 ? (freqInInterval / totalDraws) * 100 : 0,
      };
    });
  }, [drawsInInterval]);

  const filteredPoints = useMemo(() => {
    if (filterZone === 'todas') return dataPoints;
    return dataPoints.filter((p) => p.quadrante === filterZone);
  }, [dataPoints, filterZone]);

  const minFreq = useMemo(
    () => Math.max(0, Math.min(...dataPoints.map((d) => d.frequencia)) - 2),
    [dataPoints]
  );
  const maxFreq = useMemo(
    () => Math.max(...dataPoints.map((d) => d.frequencia)) + 2,
    [dataPoints]
  );
  const maxAtraso = useMemo(
    () => Math.max(...dataPoints.map((d) => d.atrasoAtual), 4) + 1,
    [dataPoints]
  );

  const oportunidades = dataPoints.filter((p) => p.quadrante === 'oportunidade');
  const riscos = dataPoints.filter((p) => p.quadrante === 'risco');

  return (
    <div className="space-y-4">
      {/* Seletor de Intervalo de Tempo Específico para o Gráfico de Dispersão */}
      <FiltroIntervaloTempoEstatisticas
        value={timeRange}
        onChange={handleTimeRangeChange}
        latestDraw={latestDraw}
      />

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
                <span>Dispersão de Dezenas: Atraso Atual vs Frequência • {activeTimeOption.label}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  {drawsInInterval.length} Concursos
                </span>
                <ExpertTip
                  title="Matriz de Dispersão Atraso x Frequência"
                  ruleCategory="Análise Estatística Avançada"
                  content={`Cruza o volume de saídas nos ${drawsInInterval.length} sorteios (${activeTimeOption.label}) com o atraso consecutivo atual.`}
                  impact14Pontos="Dezenas com alta frequência no intervalo e atraso elevado formam a 'Mola Estatística' (Zona de Oportunidade), possuindo forte pressão matemática de retorno no próximo concurso."
                  recommendation="Priorize dezenas da Zona de Oportunidade como fixas ou âncoras na sua matriz de 18 dezenas e evite dezenas na Zona de Risco."
                />
              </h3>
              <p className="text-xs text-slate-400">
                Identifique visualmente as dezenas em ponto de retorno (Mola Estatística) versus dezenas frias crônicas nos últimos {drawsInInterval.length} sorteios.
              </p>
            </div>
          </div>

          {/* Filtros rápidos de quadrante */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterZone('todas')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                filterZone === 'todas'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas (25)
            </button>
            <button
              type="button"
              onClick={() => setFilterZone('oportunidade')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                filterZone === 'oportunidade'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Oportunidade ({oportunidades.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterZone('risco')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                filterZone === 'risco'
                  ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Risco ({riscos.length})</span>
            </button>
          </div>
        </div>

        {/* Gráfico Scatter Recharts */}
        <div className="w-full h-80 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 25, bottom: 20, left: 15 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="frequencia"
                name="Frequência"
                domain={[minFreq, maxFreq]}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#334155' }}
                label={{
                  value: `Frequência de Saídas • ${activeTimeOption.label} (${drawsInInterval.length} Sorteios)`,
                  position: 'insideBottom',
                  offset: -10,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="atrasoAtual"
                name="Atraso Atual"
                domain={[0, maxAtraso]}
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                tickLine={{ stroke: '#334155' }}
                label={{
                  value: 'Atraso Atual (Concursos)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 5,
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <ZAxis type="number" range={[180, 260]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: '#475569' }}
                content={({ payload }) => {
                  if (!payload || payload.length === 0) return null;
                  const data = payload[0].payload as ScatterDezenaPoint;
                  return (
                    <div className="bg-slate-950 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 font-mono">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                        <strong className="text-sm font-black text-amber-400">
                          Dezena {data.dezenaPad}
                        </strong>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${data.quadranteCor}25`, color: data.quadranteCor }}
                        >
                          {data.quadranteLabel}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        Frequência no Intervalo:{' '}
                        <strong className="text-white">
                          {data.frequencia} de {drawsInInterval.length} sorteios (
                          {data.percentualPresenca.toFixed(1)}%)
                        </strong>
                      </div>
                      <div className="text-slate-300">
                        Atraso Atual:{' '}
                        <strong className="text-amber-300">{data.atrasoAtual} concursos consecutivos</strong>
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={1.67}
                stroke="#475569"
                strokeDasharray="4 4"
                label={{ value: 'Atraso Médio (1.67)', fill: '#64748b', fontSize: 10 }}
              />
              <ReferenceLine
                x={(drawsInInterval.length * 15) / 25}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{
                  value: `Média Período (${((drawsInInterval.length * 15) / 25).toFixed(1)}x)`,
                  fill: '#38bdf8',
                  fontSize: 10,
                }}
              />
              <Scatter name="Dezenas" data={filteredPoints}>
              {filteredPoints.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.quadranteCor}
                  stroke="#0f172a"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Destaque das Dezenas da Zona de Oportunidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-emerald-950/20 border border-emerald-500/30 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold">
            <Sparkles className="w-4 h-4" />
            <span>🎯 Zona de Oportunidade / Mola Estatística ({oportunidades.length} dezenas)</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Dezenas historicamente muito sorteadas que estão atrasadas há 2 ou mais concursos:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {oportunidades.map((o) => (
              <span
                key={o.dezena}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40"
              >
                {o.dezenaPad} ({o.atrasoAtual} atr)
              </span>
            ))}
          </div>
        </div>

        <div className="bg-rose-950/20 border border-rose-500/30 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>⚠️ Zona de Risco / Frias Crônicas ({riscos.length} dezenas)</span>
          </div>
          <p className="text-[11px] text-slate-300">
            Dezenas abaixo da média de frequência com longo atraso (baixo retorno estatístico):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {riscos.map((r) => (
              <span
                key={r.dezena}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs border border-rose-500/40"
              >
                {r.dezenaPad} ({r.atrasoAtual} atr)
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

