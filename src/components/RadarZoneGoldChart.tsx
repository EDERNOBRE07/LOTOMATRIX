import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, PRIMOS, MOLDURA, FIBONACCI } from '../data/lotofacilData';
import { ShieldCheck, Compass, Sparkles, CheckCircle2 } from 'lucide-react';
import { ExpertTip } from './ExpertTip';

interface RadarZoneGoldChartProps {
  latestDraw?: LotofacilDraw;
  initialNumbers?: number[];
}

export const RadarZoneGoldChart: React.FC<RadarZoneGoldChartProps> = ({
  latestDraw = CONCURSO_ATUAL,
  initialNumbers,
}) => {
  // User game being inspected
  const [testGame, setTestGame] = useState<number[]>(
    initialNumbers || [1, 2, 3, 5, 7, 8, 10, 11, 13, 14, 15, 18, 20, 22, 25]
  );

  // Compute profile
  const profile = useMemo(() => {
    const soma = testGame.reduce((a, b) => a + b, 0);
    const pares = testGame.filter((n) => n % 2 === 0).length;
    const primos = testGame.filter((n) => PRIMOS.includes(n)).length;
    const moldura = testGame.filter((n) => MOLDURA.includes(n)).length;
    const repetidas = testGame.filter((n) => latestDraw.dezenas.includes(n)).length;
    const fibo = testGame.filter((n) => FIBONACCI.includes(n)).length;

    // Adherence scores normalized to 0-100:
    // Soma: 190-210 -> 100%, 175-220 -> 80%
    const somaAdherence =
      soma >= 190 && soma <= 210
        ? 100
        : soma >= 175 && soma <= 220
        ? 80
        : Math.max(20, 100 - Math.abs(200 - soma) * 2);

    // Pares: 7 or 8 -> 100%, 6 or 9 -> 75%
    const paresAdherence =
      pares === 7 || pares === 8
        ? 100
        : pares === 6 || pares === 9
        ? 75
        : Math.max(20, 100 - Math.abs(7.5 - pares) * 30);

    // Primos: 5 or 6 -> 100%, 4 or 7 -> 80%
    const primosAdherence =
      primos >= 5 && primos <= 6
        ? 100
        : primos >= 4 && primos <= 7
        ? 80
        : Math.max(20, 100 - Math.abs(5.5 - primos) * 25);

    // Moldura: 9 or 10 -> 100%, 8 or 11 -> 80%
    const molduraAdherence =
      moldura >= 9 && moldura <= 10
        ? 100
        : moldura >= 8 && moldura <= 11
        ? 80
        : Math.max(20, 100 - Math.abs(9.5 - moldura) * 25);

    // Repetidas: 9 -> 100%, 8 or 10 -> 85%
    const repetidasAdherence =
      repetidas === 9
        ? 100
        : repetidas >= 8 && repetidas <= 10
        ? 85
        : Math.max(20, 100 - Math.abs(9 - repetidas) * 20);

    // Overall adherence 0-100%
    const globalScore = Math.round(
      (somaAdherence * 0.25 +
        paresAdherence * 0.25 +
        primosAdherence * 0.2 +
        molduraAdherence * 0.15 +
        repetidasAdherence * 0.15)
    );

    return {
      soma,
      pares,
      primos,
      moldura,
      repetidas,
      fibo,
      somaAdherence,
      paresAdherence,
      primosAdherence,
      molduraAdherence,
      repetidasAdherence,
      globalScore,
    };
  }, [testGame, latestDraw.dezenas]);

  // Data for Radar Chart comparing User Profile vs Ideal Golden Zone (100)
  const radarData = [
    { metric: 'Faixa de Soma', jogoUsuario: profile.somaAdherence, zonaDeOuro: 100 },
    { metric: 'Pares / Ímpares', jogoUsuario: profile.paresAdherence, zonaDeOuro: 100 },
    { metric: 'Números Primos', jogoUsuario: profile.primosAdherence, zonaDeOuro: 100 },
    { metric: 'Moldura Externa', jogoUsuario: profile.molduraAdherence, zonaDeOuro: 100 },
    { metric: 'Repetidas Concurso', jogoUsuario: profile.repetidasAdherence, zonaDeOuro: 100 },
  ];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-300">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>Gráfico de Radar: Perfil Estatístico vs Zona de Ouro</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 uppercase">
                Aderência 0–100%
              </span>
              <ExpertTip
                title="Conformidade Pentagonal com a Zona de Ouro"
                ruleCategory="Diagnóstico Multidimensional de Volante"
                content="Avalia 5 pilares estruturais simultaneamente: Faixa de Soma (190–210), Paridade (7 a 8 Pares), Moldura Externa (9 a 11), Primos (4 a 6) e Repetidas do Concurso Anterior (8 a 10)."
                impact14Pontos="Bilhetes com aderência inferior a 70% no radar descartam as maiores probabilidades da distribuição combinatória. Bilhetes na Zona de Ouro (aderência ≥ 90%) aumentam em até 4,7x o retorno sobre o investimento em apostas múltiplas."
                recommendation="Ajuste qualquer dezena com discrepância no radar até atingir um índice de aderência global superior a 85% antes de registrar o bilhete."
              />
            </h3>
            <p className="text-xs text-slate-400">
              Mede a consonância matemática do jogo em análise contra o padrão ideal da Lotofácil.
            </p>
          </div>
        </div>

        {/* Global Score Gauge */}
        <div className="bg-slate-950 p-2.5 px-4 rounded-xl border border-slate-800 flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pontuação de Aderência</span>
            <strong
              className={`font-mono text-base font-black ${
                profile.globalScore >= 85
                  ? 'text-emerald-400'
                  : profile.globalScore >= 70
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {profile.globalScore}% de Aderência
            </strong>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/40 flex items-center justify-center font-mono font-black text-xs text-emerald-300 bg-emerald-950/40">
            {profile.globalScore}%
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
        <div className="h-64 w-full bg-slate-950/70 p-2 rounded-2xl border border-slate-800/80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={{ fill: '#64748b', fontSize: 9 }} />
              <Radar name="Zona de Ouro (Ideal)" dataKey="zonaDeOuro" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} />
              <Radar name="Jogo em Análise" dataKey="jogoUsuario" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown Card */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
          <span className="font-bold text-white block uppercase tracking-wider text-[11px] font-mono">
            Diagnóstico dos Critérios
          </span>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Soma Total: {profile.soma}</span>
              <span className="text-emerald-400 font-bold">{profile.somaAdherence}% Aderência</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Paridade: {profile.pares}P / {15 - profile.pares}I</span>
              <span className="text-emerald-400 font-bold">{profile.paresAdherence}% Aderência</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Primos: {profile.primos} números</span>
              <span className="text-emerald-400 font-bold">{profile.primosAdherence}% Aderência</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Moldura: {profile.moldura} dezenas</span>
              <span className="text-emerald-400 font-bold">{profile.molduraAdherence}% Aderência</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Repetidas #{latestDraw.concurso}: {profile.repetidas}</span>
              <span className="text-emerald-400 font-bold">{profile.repetidasAdherence}% Aderência</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
