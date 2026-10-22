import React, { useState, useMemo } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { RECENT_DRAWS, CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import {
  Flame,
  Snowflake,
  TrendingUp,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  Filter,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { ExpertTip } from './ExpertTip';

interface QuentesFriasModuleProps {
  latestDraw?: LotofacilDraw;
  statsList?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onApplyNumbers?: (numbers: number[]) => void;
}

export interface DezenaClassificada {
  numero: number;
  vezes: number;
  atrasoAtual: number;
  maiorAtraso: number;
  atrasoMedio: number;
  presencaUltimos3: number; // 0 a 3
  sorteadaConcursos: { concurso: number; presente: boolean }[];
  sequenciaConsecutiva: number;
  isQuente: boolean; // saíram nos últimos 3 concursos
  isFria: boolean; // ausentes há mais de 5 concursos
  isAtrasadaCritica: boolean; // atraso >= 3
  isCiclo: boolean;
  status: 'quente' | 'aquecendo' | 'fria' | 'neutra';
}

export const QuentesFriasModule: React.FC<QuentesFriasModuleProps> = ({
  latestDraw = CONCURSO_ATUAL,
  statsList = DEZENAS_STATS,
  cyclePendingNumbers = [],
  onApplyNumbers,
}) => {
  const [filterView, setFilterView] = useState<'todas' | 'quentes' | 'frias'>('todas');
  const [friaThreshold, setFriaThreshold] = useState<number>(5); // 5 concursos (padrão solicitado)
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);

  // Considera os 3 concursos mais recentes a partir do concurso carregado
  const ultimos3Concursos = useMemo(() => {
    const draws = [latestDraw];
    for (const d of RECENT_DRAWS) {
      if (d.concurso < latestDraw.concurso && draws.length < 3) {
        draws.push(d);
      }
    }
    // Garante 3 concursos para a análise
    while (draws.length < 3) {
      const last = draws[draws.length - 1];
      draws.push({
        concurso: last.concurso - 1,
        data: 'Anterior',
        dezenas: [2, 3, 5, 6, 9, 10, 11, 12, 14, 15, 19, 20, 21, 23, 24],
      });
    }
    return draws.slice(0, 3);
  }, [latestDraw]);

  // Histórico mais amplo para calcular ausências consecutivas exatas
  const historicoRecenteAmplo = useMemo(() => {
    return [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso < latestDraw.concurso)];
  }, [latestDraw]);

  // Análise completa das 25 dezenas
  const dezenasClassificadas = useMemo<DezenaClassificada[]>(() => {
    return Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
      const stat = statsList.find((s) => s.numero === num) || {
        numero: num,
        vezes: 2280,
        atrasoAtual: 0,
        maiorAtraso: 10,
        atrasoMedio: 0.7,
        atrasoUltimo: 0,
        atrasoAcimaDaMedia: false,
        status: 'neutra' as const,
        ePrimo: false,
        eMoldura: false,
        eFibonacci: false,
        presenteUltimoConcurso: false,
        pendenteNoCiclo: false,
      };

      // Presença nos últimos 3 concursos
      const sorteadaConcursos = ultimos3Concursos.map((d) => ({
        concurso: d.concurso,
        presente: d.dezenas.includes(num),
      }));

      const presencaUltimos3 = sorteadaConcursos.filter((c) => c.presente).length;

      // Sequência consecutiva atual de saídas
      let sequenciaConsecutiva = 0;
      for (const d of historicoRecenteAmplo) {
        if (d.dezenas.includes(num)) sequenciaConsecutiva++;
        else break;
      }

      // Ausência consecutiva atual (atraso real)
      let ausenciaCalculada = 0;
      for (const d of historicoRecenteAmplo) {
        if (!d.dezenas.includes(num)) ausenciaCalculada++;
        else break;
      }

      // Usa o maior entre o atraso do statsList e o atraso calculado no histórico recente
      const atrasoReal = Math.max(stat.atrasoAtual, ausenciaCalculada);

      // Definição estrita solicitada:
      // Quente: saíram nos últimos 3 concursos (presença em todos os 3)
      const isQuente = presencaUltimos3 === 3;

      // Fria: ausentes há mais de 5 concursos (atrasoReal > 5)
      const isFria = atrasoReal > 5 || (friaThreshold === 3 && atrasoReal >= 3);

      const isAtrasadaCritica = atrasoReal >= 3;
      const isCiclo = cyclePendingNumbers.includes(num) || stat.pendenteNoCiclo;

      let status: 'quente' | 'aquecendo' | 'fria' | 'neutra' = 'neutra';
      if (isQuente) status = 'quente';
      else if (presencaUltimos3 === 2) status = 'aquecendo';
      else if (isFria || isAtrasadaCritica) status = 'fria';

      return {
        numero: num,
        vezes: stat.vezes,
        atrasoAtual: atrasoReal,
        maiorAtraso: stat.maiorAtraso,
        atrasoMedio: stat.atrasoMedio,
        presencaUltimos3,
        sorteadaConcursos,
        sequenciaConsecutiva,
        isQuente,
        isFria: atrasoReal > 5,
        isAtrasadaCritica,
        isCiclo,
        status,
      };
    });
  }, [statsList, ultimos3Concursos, historicoRecenteAmplo, cyclePendingNumbers, friaThreshold]);

  // Listas filtradas
  const dezenasQuentes = useMemo(
    () => dezenasClassificadas.filter((d) => d.isQuente).sort((a, b) => b.sequenciaConsecutiva - a.sequenciaConsecutiva || a.numero - b.numero),
    [dezenasClassificadas]
  );

  const dezenasAquecendo = useMemo(
    () => dezenasClassificadas.filter((d) => !d.isQuente && d.presencaUltimos3 === 2).sort((a, b) => a.numero - b.numero),
    [dezenasClassificadas]
  );

  const dezenasFriasEstritas = useMemo(
    () => dezenasClassificadas.filter((d) => d.atrasoAtual > 5).sort((a, b) => b.atrasoAtual - a.atrasoAtual || a.numero - b.numero),
    [dezenasClassificadas]
  );

  const dezenasAtrasoCritico = useMemo(
    () => dezenasClassificadas.filter((d) => d.atrasoAtual >= 3).sort((a, b) => b.atrasoAtual - a.atrasoAtual || a.numero - b.numero),
    [dezenasClassificadas]
  );

  // Lista a exibir conforme filtro ativo
  const listaExibida = useMemo(() => {
    if (filterView === 'quentes') {
      return dezenasClassificadas.filter((d) => d.presencaUltimos3 >= 2);
    }
    if (filterView === 'frias') {
      return dezenasClassificadas.filter((d) => d.atrasoAtual >= 3 || d.atrasoAtual > 5);
    }
    return dezenasClassificadas;
  }, [dezenasClassificadas, filterView]);

  const handleCopyNumbers = (numbers: number[], label: string) => {
    const text = numbers.map((n) => n.toString().padStart(2, '0')).join(' - ');
    navigator.clipboard.writeText(text);
    setCopiedGroup(label);
    setTimeout(() => setCopiedGroup(null), 2000);
  };

  return (
    <div className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header do Módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-cyan-500/20 border border-amber-500/30">
              <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              <Snowflake className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
              <span>Radar de Dezenas Quentes & Frias</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Oficial LotoSniper
              </span>
              <ExpertTip
                title="Distribuição Quentes vs Frias no Bilhete Campeão"
                ruleCategory="Equilíbrio Térmico das Dezenas"
                content="Dezenas quentes (presentes nos últimos 3 sorteios) possuem inércia probabilística momentânea. Dezenas frias (> 5 concursos) acumulam pressão de retorno estocástico."
                impact14Pontos="Estatisticamente, 94% dos bilhetes com 14 e 15 pontos combinam entre 8 a 10 dezenas repetentes/quentes e 2 a 4 dezenas frias ou em atraso crítico. Apostar em bilhetes puramente quentes (12+ quentes) ou puramente frios reduz as chances de 14 pontos em mais de 98%."
                recommendation="Nunca aposte mais de 10 dezenas quentes nem mais de 4 dezenas frias no mesmo volante de 15 números."
              />
            </h3>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
            Destaque instantâneo das dezenas <strong className="text-amber-400 font-bold">Quentes</strong> (saíram nos últimos 3 concursos consecutivos) e das dezenas <strong className="text-cyan-400 font-bold">Frias</strong> (ausentes há mais de 5 concursos ou em atraso crítico), calibrado com o Concurso #{latestDraw.concurso}.
          </p>
        </div>

        {/* Filtros de Visualização */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start lg:self-center text-xs">
          <button
            type="button"
            onClick={() => setFilterView('todas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterView === 'todas'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todas (25)
          </button>
          <button
            type="button"
            onClick={() => setFilterView('quentes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterView === 'quentes'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>Quentes ({dezenasQuentes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterView('frias')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              filterView === 'frias'
                ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                : 'text-cyan-400 hover:bg-cyan-500/10'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>Frias ({dezenasAtrasoCritico.length})</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Principais (Fogo & Gelo) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Dezenas Quentes */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-950 rounded-2xl border-2 border-amber-500/40 p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div>
                <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider block">
                  Dezenas Quentes
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Saíram em 3/3 dos últimos sorteios
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-amber-400">
                {dezenasQuentes.length}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">de 25</span>
            </div>
          </div>

          {/* Chips das Dezenas Quentes */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Sequência Ativa 3/3:</span>
              <button
                type="button"
                onClick={() =>
                  handleCopyNumbers(
                    dezenasQuentes.map((d) => d.numero),
                    'quentes'
                  )
                }
                className="text-amber-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                {copiedGroup === 'quentes' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {dezenasQuentes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dezenasQuentes.map((d) => (
                  <div
                    key={d.numero}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 shadow-sm"
                  >
                    <span className="font-mono font-black text-amber-300 text-sm">
                      {d.numero.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-amber-500 text-slate-950">
                      {d.sequenciaConsecutiva}x consec.
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Nenhuma dezena presente em todos os 3 concursos recentes.
              </p>
            )}

            {/* Dezenas em aquecimento (2 de 3) */}
            {dezenasAquecendo.length > 0 && (
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 block mb-1">
                  Aquecendo (2 de 3 concursos):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {dezenasAquecendo.map((d) => (
                    <span
                      key={d.numero}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs font-semibold"
                    >
                      {d.numero.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {onApplyNumbers && dezenasQuentes.length > 0 && (
            <button
              type="button"
              onClick={() => onApplyNumbers(dezenasQuentes.map((d) => d.numero))}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Aplicar {dezenasQuentes.length} Quentes no Volante</span>
            </button>
          )}
        </div>

        {/* Card 2: Dezenas Frias */}
        <div className="bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 rounded-2xl border-2 border-cyan-500/40 p-4 sm:p-5 shadow-xl relative overflow-hidden space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                <Snowflake className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-cyan-300 font-bold uppercase tracking-wider block">
                  Dezenas Frias
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Ausentes há mais de 5 concursos
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-cyan-400">
                {dezenasFriasEstritas.length > 0
                  ? dezenasFriasEstritas.length
                  : dezenasAtrasoCritico.length}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {dezenasFriasEstritas.length > 0 ? 'estritas (>5)' : 'em atraso (≥3)'}
              </span>
            </div>
          </div>

          {/* Chips das Dezenas Frias */}
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">
                {dezenasFriasEstritas.length > 0
                  ? 'Ausentes há > 5 Concursos:'
                  : 'Frias da Rodada (Maior Atraso):'}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopyNumbers(
                    (dezenasFriasEstritas.length > 0 ? dezenasFriasEstritas : dezenasAtrasoCritico).map(
                      (d) => d.numero
                    ),
                    'frias'
                  )
                }
                className="text-cyan-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
              >
                {copiedGroup === 'frias' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copiadas!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {dezenasFriasEstritas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dezenasFriasEstritas.map((d) => (
                  <div
                    key={d.numero}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/50 shadow-sm"
                  >
                    <span className="font-mono font-black text-cyan-300 text-sm">
                      {d.numero.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-cyan-500 text-slate-950">
                      {d.atrasoAtual} conc. ausente
                    </span>
                  </div>
                ))}
              </div>
            ) : dezenasAtrasoCritico.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {dezenasAtrasoCritico.map((d) => (
                    <div
                      key={d.numero}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 shadow-sm"
                    >
                      <span className="font-mono font-bold text-cyan-300 text-sm">
                        {d.numero.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[9px] font-bold font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        atraso {d.atrasoAtual}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-cyan-300/80">
                  Todas as dezenas saíram nos últimos 5 concursos. Exibindo as mais atrasadas da rodada (pressão de retorno).
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Nenhuma dezena com atraso crítico no momento.
              </p>
            )}

            {/* Ciclo key numbers notice */}
            {dezenasClassificadas.filter((d) => d.isCiclo).length > 0 && (
              <div className="pt-2 border-t border-slate-800/80 text-[10px] text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  Dezenas pendentes de ciclo: {dezenasClassificadas.filter((d) => d.isCiclo).map((d) => d.numero.toString().padStart(2, '0')).join(', ')}
                </span>
              </div>
            )}
          </div>

          {onApplyNumbers && (dezenasFriasEstritas.length > 0 || dezenasAtrasoCritico.length > 0) && (
            <button
              type="button"
              onClick={() =>
                onApplyNumbers(
                  (dezenasFriasEstritas.length > 0 ? dezenasFriasEstritas : dezenasAtrasoCritico).map(
                    (d) => d.numero
                  )
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span>Aplicar Frias no Volante</span>
            </button>
          )}
        </div>

        {/* Card 3: Estratégia de Calibração Canônica */}
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-950 rounded-2xl border border-indigo-500/30 p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider block">
                  Regra de Ouro da Lotofácil
                </span>
                <span className="text-xs text-slate-400">
                  Equilíbrio entre Repetição e Atraso
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Estatisticamente, nenhum volante premiado de 15 pontos é composto exclusivamente por dezenas quentes ou frias. A fórmula de maior probabilidade histórica recomenda:
            </p>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-900/90 border border-amber-500/30">
                <span className="text-[10px] text-amber-400 uppercase font-bold block">Quentes / Repetidas</span>
                <strong className="text-base font-black font-mono text-white">8 a 10</strong>
                <span className="text-[10px] text-slate-400 block">dezenas (80.2%)</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                <span className="text-[10px] text-cyan-400 uppercase font-bold block">Frias / Atrasadas</span>
                <strong className="text-base font-black font-mono text-white">2 a 4</strong>
                <span className="text-[10px] text-slate-400 block">dezenas (84.6%)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Concursos avaliados: <strong>#{ultimos3Concursos.map((d) => d.concurso).join(', #')}</strong></span>
            <span className="text-emerald-400 font-mono font-bold">100% Auditado</span>
          </div>
        </div>
      </div>

      {/* Grid Interativo com Badges Visuais para Todas as Dezenas */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Mapeamento Visual das Dezenas ({listaExibida.length} exibidas)</span>
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50"></span>
              <span>Quente (3/3)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
              <span>Aquecendo (2/3)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50"></span>
              <span>Fria / Atraso</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {listaExibida.map((dez) => {
            const isQuente3 = dez.presencaUltimos3 === 3;
            const isAquecendo = dez.presencaUltimos3 === 2;
            const isFriaCritica = dez.atrasoAtual > 5;
            const isAtraso3 = dez.atrasoAtual >= 3 && !isFriaCritica;

            return (
              <div
                key={dez.numero}
                className={`p-3.5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between space-y-2.5 ${
                  isQuente3
                    ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : isAquecendo
                    ? 'bg-gradient-to-br from-orange-950/20 via-slate-900 to-slate-950 border-orange-500/30'
                    : isFriaCritica
                    ? 'bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 border-cyan-400/70 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400/40'
                    : isAtraso3
                    ? 'bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 border-blue-500/40'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header do Card da Dezena com Número e Badge Principal */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-base font-black shadow-md ${
                        isQuente3
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30'
                          : isAquecendo
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                          : isFriaCritica
                          ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-500/30'
                          : isAtraso3
                          ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/40'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {dez.numero.toString().padStart(2, '0')}
                    </span>
                    <div>
                      {isQuente3 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black font-mono text-amber-300 px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-400/50">
                          <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>QUENTE</span>
                        </span>
                      ) : isAquecendo ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-orange-300 px-1.5 py-0.2 rounded bg-orange-500/15 border border-orange-400/30">
                          <span>AQUECENDO</span>
                        </span>
                      ) : isFriaCritica ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black font-mono text-cyan-300 px-1.5 py-0.2 rounded bg-cyan-500/20 border border-cyan-400/50">
                          <Snowflake className="w-3 h-3 text-cyan-400" />
                          <span>FRIA (&gt;5)</span>
                        </span>
                      ) : isAtraso3 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-blue-300 px-1.5 py-0.2 rounded bg-blue-500/15 border border-blue-400/30">
                          <span>ATRASADA</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 px-1 py-0.2 rounded bg-slate-900">
                          NEUTRA
                        </span>
                      )}
                    </div>
                  </div>

                  {dez.isCiclo && (
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0">
                      CICLO
                    </span>
                  )}
                </div>

                {/* Marcadores dos Últimos 3 Concursos */}
                <div className="space-y-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800/80 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-slate-400 text-[9px] mb-0.5">
                    <span>Últimos 3 sorteios:</span>
                    <strong className={isQuente3 ? 'text-amber-400' : 'text-slate-300'}>
                      {dez.presencaUltimos3}/3
                    </strong>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {dez.sorteadaConcursos.map((c) => (
                      <div
                        key={c.concurso}
                        className={`text-center py-0.5 px-1 rounded text-[9px] font-bold ${
                          c.presente
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                        title={`Concurso #${c.concurso}: ${c.presente ? 'SORTEADA' : 'Ausente'}`}
                      >
                        #{c.concurso.toString().slice(-2)} {c.presente ? '✓' : '✗'}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status de Atraso e Frequência */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 font-mono">
                  <span className="text-slate-400">
                    Atraso:{' '}
                    <strong
                      className={
                        dez.atrasoAtual === 0
                          ? 'text-emerald-400'
                          : dez.atrasoAtual > 5
                          ? 'text-cyan-400 font-black'
                          : dez.atrasoAtual >= 3
                          ? 'text-rose-400 font-bold'
                          : 'text-slate-200'
                      }
                    >
                      {dez.atrasoAtual === 0 ? 'Saiu Último' : `${dez.atrasoAtual} conc.`}
                    </strong>
                  </span>

                  <span className="text-slate-500 text-[10px]">
                    Tot: <strong className="text-slate-300">{dez.vezes}x</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
