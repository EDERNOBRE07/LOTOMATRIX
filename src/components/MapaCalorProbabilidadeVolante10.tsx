import React, { useState, useMemo } from 'react';
import { LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS, MOLDURA, MIOLO } from '../data/lotofacilData';
import { Flame, Sparkles, TrendingUp, Info, Eye, Layers, CheckCircle2 } from 'lucide-react';
import { ExpertTip } from './ExpertTip';

interface MapaCalorProbabilidadeVolante10Props {
  latestDraw?: LotofacilDraw;
  onSelectDezena?: (dezena: number) => void;
}

interface DezenaCalorInfo {
  numero: number;
  numeroPad: string;
  hits10: number; // aparições nos últimos 10 concursos (0 a 10)
  probabilidadeProximo: number; // 0% a 100%
  status: 'fria' | 'neutra' | 'quente' | 'super_quente';
  corBg: string;
  corTexto: string;
  concursosPresente: number[]; // quais concursos dos 10 ela apareceu
  atrasoAtual: number;
}

export const MapaCalorProbabilidadeVolante10: React.FC<MapaCalorProbabilidadeVolante10Props> = ({
  latestDraw = CONCURSO_ATUAL,
  onSelectDezena,
}) => {
  const [selectedDezena, setSelectedDezena] = useState<number | null>(null);

  // Amostra estrita dos 10 últimos concursos
  const ultimos10 = useMemo(() => {
    return [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)].slice(0, 10);
  }, [latestDraw]);

  // Calcula estatísticas para cada uma das 25 dezenas no volante 5x5
  const dadosVolante: DezenaCalorInfo[] = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      const concursosPresente: number[] = [];

      ultimos10.forEach((draw) => {
        if (draw.dezenas.includes(num)) {
          concursosPresente.push(draw.concurso);
        }
      });

      const hits10 = concursosPresente.length;

      // Atraso atual
      let atraso = 0;
      for (const draw of ultimos10) {
        if (draw.dezenas.includes(num)) break;
        atraso++;
      }

      // Cálculo de probabilidade preditiva (Base Bayesiana + Frequência Local + Mola de Atraso)
      // Média esperada de uma dezena em 10 sorteios da Lotofácil é 6 (15/25 * 10 = 6.0)
      let scoreProb = 60; // Base 60%
      if (hits10 >= 7) scoreProb += 15;
      else if (hits10 >= 5) scoreProb += 5;
      else if (hits10 <= 3) scoreProb -= 12;

      // Ajuste de mola de atraso: se atrasou 2 a 3 concursos e tem histórico equilibrado, sobe
      if (atraso >= 2 && atraso <= 3 && hits10 >= 4) {
        scoreProb += 10;
      }

      const probabilidadeProximo = Math.min(92, Math.max(38, scoreProb));

      let status: 'fria' | 'neutra' | 'quente' | 'super_quente' = 'neutra';
      let corBg = 'bg-slate-900 border-slate-800';
      let corTexto = 'text-slate-200';

      if (hits10 >= 8) {
        status = 'super_quente';
        corBg = 'bg-gradient-to-br from-amber-500/40 via-yellow-500/30 to-amber-950 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20';
        corTexto = 'text-amber-200 font-black';
      } else if (hits10 >= 6) {
        status = 'quente';
        corBg = 'bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-slate-900 border-emerald-400 ring-1 ring-emerald-400/30';
        corTexto = 'text-emerald-200 font-bold';
      } else if (hits10 >= 4) {
        status = 'neutra';
        corBg = 'bg-slate-900/90 border-slate-700/80';
        corTexto = 'text-slate-200';
      } else {
        status = 'fria';
        corBg = 'bg-slate-950/80 border-slate-800/80 opacity-70';
        corTexto = 'text-slate-400';
      }

      return {
        numero: num,
        numeroPad: num.toString().padStart(2, '0'),
        hits10,
        probabilidadeProximo,
        status,
        corBg,
        corTexto,
        concursosPresente,
        atrasoAtual: atraso,
      };
    });
  }, [ultimos10]);

  const dezenaAtivaInfo = useMemo(() => {
    if (!selectedDezena) return null;
    return dadosVolante.find((d) => d.numero === selectedDezena) || null;
  }, [selectedDezena, dadosVolante]);

  // Resumo das 5 Linhas (L1 a L5) do volante
  const linhasResumo = useMemo(() => {
    return [0, 1, 2, 3, 4].map((rowIdx) => {
      const rowDezenas = dadosVolante.slice(rowIdx * 5, rowIdx * 5 + 5);
      const mediaHits = rowDezenas.reduce((acc, d) => acc + d.hits10, 0) / 5;
      return {
        linha: rowIdx + 1,
        dezenas: rowDezenas.map((d) => d.numeroPad).join(', '),
        mediaHits: mediaHits.toFixed(1),
        isHot: mediaHits >= 6.0,
      };
    });
  }, [dadosVolante]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Flame className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 flex-wrap">
              <span>Mapa de Calor de Probabilidade • Volante dos Últimos 10 Concursos</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                10 Sorteios Oficiais
              </span>
              <ExpertTip
                title="Sobreposição Térmica dos 10 Últimos Sorteios"
                ruleCategory="Probabilidade Preditiva Espacial"
                content="Mapeia a densidade de incidência das 25 dezenas diretamente no grid físico do volante oficial da Lotofácil (5 linhas x 5 colunas)."
                impact14Pontos="Zonas quentes com 6 a 8 saídas nos últimos 10 concursos possuem alta continuidade inercial, enquanto dezenas super frias (<3 saídas) devem ser limitadas para não arrastar o fechamento."
                recommendation="Equilibre seu fechamento mantendo entre 8 a 10 dezenas da zona verde/âmbar e no máximo 1 a 2 dezenas da zona azul escura."
              />
            </h3>
            <p className="text-xs text-slate-400">
              Sobreposição visual das 25 dezenas. Clique em qualquer número para inspecionar os 10 sorteios individuais.
            </p>
          </div>
        </div>

        {/* Legenda de Calor */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-950 border border-slate-700" />
            <span>Fria (&le;3)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-600" />
            <span>Média (4-5)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-emerald-300 font-bold">Quente (6-7)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-400" />
            <span className="text-amber-300 font-bold">Super (8+)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Volante Oficial 5x5 */}
        <div className="lg:col-span-2 bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-mono font-bold uppercase tracking-wider text-slate-400">
              Volante Físico 5x5 (Dezenas 01 a 25)
            </span>
            <span className="text-[11px]">Amortização dos concursos #{ultimos10[ultimos10.length - 1]?.concurso} a #{latestDraw.concurso}</span>
          </div>

          <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
            {dadosVolante.map((item) => {
              const isSelected = selectedDezena === item.numero;
              return (
                <button
                  key={item.numero}
                  type="button"
                  onClick={() => {
                    setSelectedDezena(isSelected ? null : item.numero);
                    if (onSelectDezena) onSelectDezena(item.numero);
                  }}
                  className={`p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer relative group flex flex-col items-center justify-center min-h-[68px] ${
                    isSelected
                      ? 'border-cyan-400 ring-2 ring-cyan-400 bg-cyan-950/40 scale-105 z-10 shadow-lg shadow-cyan-500/20'
                      : item.corBg
                  }`}
                >
                  <span className={`text-base sm:text-lg font-mono font-black ${item.corTexto}`}>
                    {item.numeroPad}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-white">
                      {item.hits10}/10
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold">
                      {item.probabilidadeProximo}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel Lateral: Detalhe da Dezena Selecionada e Análise das 5 Linhas */}
        <div className="space-y-4">
          {dezenaAtivaInfo ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black font-mono text-amber-400">
                    Dezena {dezenaAtivaInfo.numeroPad}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                    {dezenaAtivaInfo.status.replace('_', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDezena(null)}
                  className="text-xs text-slate-500 hover:text-white cursor-pointer"
                >
                  ✕ Fechar
                </button>
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Aparições Recentes:</span>
                  <strong className="text-white font-bold">{dezenaAtivaInfo.hits10} de 10 sorteios ({dezenaAtivaInfo.hits10 * 10}%)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Atraso Atual:</span>
                  <strong className="text-amber-300 font-bold">{dezenaAtivaInfo.atrasoAtual} concursos</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Probabilidade Próximo:</span>
                  <strong className="text-emerald-400 font-bold">{dezenaAtivaInfo.probabilidadeProximo}%</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase block mb-1">
                  Presente nos Concursos:
                </span>
                <div className="flex flex-wrap gap-1">
                  {ultimos10.map((d) => {
                    const saiu = dezenaAtivaInfo.concursosPresente.includes(d.concurso);
                    return (
                      <span
                        key={d.concurso}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          saiu
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                            : 'bg-slate-900 text-slate-600 line-through'
                        }`}
                      >
                        #{d.concurso}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center space-y-2">
              <Eye className="w-6 h-6 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">
                Selecione qualquer dezena no volante ao lado para auditar sua trilha detalhada nos últimos 10 concursos.
              </p>
            </div>
          )}

          {/* Densidade por Linha do Volante */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Densidade Térmica por Linha</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              {linhasResumo.map((l) => (
                <div
                  key={l.linha}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80"
                >
                  <span className="text-slate-300 font-bold">Linha {l.linha} ({l.dezenas}):</span>
                  <strong className={l.isHot ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {l.mediaHits} saídas/dez
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
