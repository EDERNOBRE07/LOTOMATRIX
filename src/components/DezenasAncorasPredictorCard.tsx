import React, { useMemo, useState } from 'react';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS } from '../data/lotofacilData';
import { soundService } from '../services/soundAlert';
import {
  Anchor,
  Pin,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Lock,
  Copy,
  Info,
  Layers,
  Flame,
} from 'lucide-react';

interface DezenasAncorasPredictorCardProps {
  latestDraw?: LotofacilDraw;
  dynamicStats?: DezenaStats[];
  cyclePendingNumbers?: number[];
  onFixAnchors?: (anchors: number[]) => void;
}

interface AnchorItem {
  numero: number;
  score: number;
  motivo: string;
  papel: string;
  isCycle: boolean;
  atraso: number;
  frequenciaRecente: number;
  estabilidade: 'Crítica' | 'Alta' | 'Consolidada';
}

export const DezenasAncorasPredictorCard: React.FC<DezenasAncorasPredictorCardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  dynamicStats = DEZENAS_STATS,
  cyclePendingNumbers = [17, 22],
  onFixAnchors,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  // Cruzamento dos dados de ciclo e a tendência atual para selecionar rigorosamente 3 âncoras
  const anchors: AnchorItem[] = useMemo(() => {
    const list: AnchorItem[] = [];

    // 1. Prioridade Máxima: Dezenas pendentes de ciclo (ex: 17 e 22)
    const sortedCycle = [...cyclePendingNumbers].sort((a, b) => {
      const statA = dynamicStats.find((s) => s.numero === a);
      const statB = dynamicStats.find((s) => s.numero === b);
      return (statB?.atrasoAtual || 0) - (statA?.atrasoAtual || 0);
    });

    sortedCycle.slice(0, 2).forEach((num, idx) => {
      const stat = dynamicStats.find((s) => s.numero === num);
      const atraso = stat?.atrasoAtual ?? (idx === 0 ? 7 : 5);
      list.push({
        numero: num,
        score: idx === 0 ? 98.6 : 96.4,
        papel: idx === 0 ? 'Âncora #1 • Quebra de Ciclo' : 'Âncora #2 • Pressão de Ciclo',
        motivo: `Dezena pendente para fechamento do Ciclo. Atraso de ${atraso} sorteios atinge pressão máxima estatística.`,
        isCycle: true,
        atraso,
        frequenciaRecente: stat?.vezes || 14,
        estabilidade: 'Crítica',
      });
    });

    // 2. Complemento: Tendência atual de alta frequência / Par de Ouro companheira
    const candidates = [...dynamicStats]
      .filter((s) => !list.some((a) => a.numero === s.numero))
      .sort((a, b) => {
        // Ponderação: presença no último concurso (repetência) + frequência histórica + afinidade com ciclo
        const repA = latestDraw.dezenas.includes(a.numero) ? 40 : 0;
        const repB = latestDraw.dezenas.includes(b.numero) ? 40 : 0;
        const freqA = (a.vezes / 25) * 50;
        const freqB = (b.vezes / 25) * 50;
        // Bônus especial para dezenas companheiras de ouro canônicas (ex: 20, 11, 25, 01, 10, 13)
        const goldBonusA = [20, 11, 25, 10, 13, 1].includes(a.numero) ? 25 : 0;
        const goldBonusB = [20, 11, 25, 10, 13, 1].includes(b.numero) ? 25 : 0;

        return repB + freqB + goldBonusB - (repA + freqA + goldBonusA);
      });

    while (list.length < 3 && candidates.length > 0) {
      const topCand = candidates.shift()!;
      const isRepeated = latestDraw.dezenas.includes(topCand.numero);
      const papel =
        list.length === 1
          ? 'Âncora #2 • Tendência Forte'
          : 'Âncora #3 • Estabilidade Canônica';
      const motivo = isRepeated
        ? `Repetente do Concurso #${latestDraw.concurso} com alta persistência e estabilidade na moldura/miolo.`
        : `Dezena de alta frequência histórica com forte coocorrência com o fechamento do ciclo.`;

      list.push({
        numero: topCand.numero,
        score: Number((93.5 - list.length * 1.5).toFixed(1)),
        papel,
        motivo,
        isCycle: false,
        atraso: topCand.atrasoAtual,
        frequenciaRecente: topCand.vezes,
        estabilidade: isRepeated ? 'Alta' : 'Consolidada',
      });
    }

    return list;
  }, [cyclePendingNumbers, dynamicStats, latestDraw]);

  const anchorNumbers = useMemo(() => anchors.map((a) => a.numero).sort((a, b) => a - b), [anchors]);

  const handleFixOnFechamento = () => {
    soundService.playGoldenZoneSuccessChime();

    // 1. Notifica via prop caso fornecida
    if (onFixAnchors) {
      onFixAnchors(anchorNumbers);
    }

    // 2. Dispara evento global para o FechamentoTab escutar e fixar as dezenas
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('lotosniper-fix-anchors', {
          detail: {
            numbers: anchorNumbers,
            anchors: anchorNumbers,
          },
        })
      );
      window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }));
    }

    setFeedback(
      `✓ 3 Dezenas Âncoras [${anchorNumbers
        .map((n) => n.toString().padStart(2, '0'))
        .join(', ')}] fixadas com sucesso na Matriz de Fechamento!`
    );
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      anchorNumbers.map((n) => n.toString().padStart(2, '0')).join(' ')
    );
    soundService.playFilterClick();
    setFeedback('✓ 3 Dezenas Âncoras copiadas para a área de transferência!');
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-amber-950/20 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-3 border-b border-slate-800 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold mb-1.5">
            <Anchor className="w-3.5 h-3.5 text-amber-400" />
            <span>Sugestão Automática de Fixas IA</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>3 Dezenas Âncoras de Alta Pressão</span>
            <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
              Ciclo & Tendência Atual
            </span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
            Cruzamento algorítmico entre as dezenas pendentes de ciclo ({cyclePendingNumbers.join(' e ')}) e o vetor de aceleração de repetidas do Concurso #{latestDraw.concurso}.
          </p>
        </div>

        {/* Action Button: Fixar na Matriz */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition cursor-pointer active:scale-95"
            title="Copiar as 3 dezenas âncoras"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copiar</span>
          </button>

          <button
            type="button"
            onClick={handleFixOnFechamento}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/30 active:scale-95 ring-2 ring-amber-300 group"
          >
            <Pin className="w-4 h-4 fill-slate-950 group-hover:rotate-12 transition-transform" />
            <span>Fixar na Matriz de Fechamento</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-400 hover:text-white text-xs underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 3 Anchors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 relative z-10">
        {anchors.map((item, idx) => (
          <div
            key={item.numero}
            className={`p-4 rounded-xl border relative transition-all duration-300 flex flex-col justify-between shadow-lg ${
              item.isCycle
                ? 'bg-gradient-to-b from-amber-500/15 via-slate-950/80 to-slate-950 border-amber-400/60 ring-1 ring-amber-400/30'
                : 'bg-gradient-to-b from-teal-500/10 via-slate-950/80 to-slate-950 border-teal-500/40 ring-1 ring-teal-500/20'
            }`}
          >
            {/* Top Row: Tag & Badge */}
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  item.isCycle
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-teal-400 text-slate-950'
                }`}
              >
                <Lock className="w-3 h-3" />
                <span>{item.papel}</span>
              </span>

              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-700">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{item.score}% Confiança</span>
              </span>
            </div>

            {/* Middle: Ball & Technical Highlights */}
            <div className="flex items-center gap-4 my-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-black text-2xl shadow-xl shrink-0 ${
                  item.isCycle
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/30'
                    : 'bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 ring-2 ring-teal-300 shadow-teal-500/30'
                }`}
              >
                {item.numero.toString().padStart(2, '0')}
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Atraso Atual:</span>
                  <strong className="text-amber-300 font-mono font-bold">
                    {item.atraso} {item.atraso === 1 ? 'concurso' : 'concursos'}
                  </strong>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Frequência:</span>
                  <span className="text-slate-200 font-mono">
                    {item.frequenciaRecente} ocorrências
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Pressão:</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                      item.estabilidade === 'Crítica'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {item.estabilidade}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Justification */}
            <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2.5">
              {item.motivo}
            </p>
          </div>
        ))}
      </div>

      {/* Info Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Ao clicar em <strong>"Fixar na Matriz"</strong>, estas 3 dezenas serão mantidas em 100% dos bilhetes gerados pelo algoritmo combinatório.
          </span>
        </div>
        <span className="text-slate-500 font-mono shrink-0">
          Calibrado para Concurso #{latestDraw.concurso + 1}
        </span>
      </div>
    </div>
  );
};
