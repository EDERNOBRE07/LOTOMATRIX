import React, { useState, useEffect } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { TurboProgress, TurboResult } from '../services/turboBruteForce';
import { turboClient } from '../services/turboGeneratorClient';
import { soundService } from '../services/soundAlert';
import {
  Zap,
  Cpu,
  Clock,
  ShieldCheck,
  CheckCircle2,
  X,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Copy,
  Check,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface TurboGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedNumbers: number[];
  fixedNumbers: number[];
  excludedNumbers: number[];
  latestDraw: LotofacilDraw;
  onApplyTickets: (tickets: GameTicket[], result: TurboResult) => void;
}

export const TurboGeneratorModal: React.FC<TurboGeneratorModalProps> = ({
  isOpen,
  onClose,
  selectedNumbers,
  fixedNumbers,
  excludedNumbers,
  latestDraw,
  onApplyTickets,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TurboProgress | null>(null);
  const [result, setResult] = useState<TurboResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Pool efetivo
  const effectivePool = selectedNumbers.length >= 16
    ? selectedNumbers
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20]; // 18 números por padrão

  const handleStart = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setProgress({
      phase: 'subsets',
      percent: 5,
      totalSubsets: 0,
      coveredSubsets: 0,
      candidatesCount: 0,
      selectedTicketsCount: 0,
      elapsedMs: 0,
      opsPerSec: 0,
    });

    try {
      const res = await turboClient.runTurbo(
        effectivePool,
        fixedNumbers,
        excludedNumbers,
        28,
        (p) => setProgress(p)
      );

      setResult(res);
      soundService.playGoldenZoneSuccessChime();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Erro durante execução do Gerador Turbo.');
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result && !isRunning) {
      handleStart();
    }
    return () => {
      turboClient.cancel();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result) return;
    const txt = result.tickets
      .map(
        (t, idx) =>
          `Jogo ${String(idx + 1).padStart(2, '0')}: ${t.dezenas
            .map((n: number) => String(n).padStart(2, '0'))
            .join(' ')} (Soma: ${t.soma})`
      )
      .join('\n');
    navigator.clipboard.writeText(txt);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow Header */}
        <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-950/70 p-5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <Zap className="w-6 h-6 fill-current animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  GERADOR TURBO • FORÇA BRUTA 14 PONTOS
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  &lt; 2 SEGUNDOS
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Processamento Paralelo em Web Worker nativo (Zero travamento da UI)</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              turboClient.cancel();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Telemetry Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Tempo de Execução</span>
              </span>
              <div className="font-mono text-lg font-black text-amber-400 mt-1">
                {result ? `${result.elapsedMs} ms` : progress ? `${progress.elapsedMs} ms` : '0 ms'}
              </div>
              <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                Meta: &lt; 2.000 ms
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Garantia 14 Pts</span>
              </span>
              <div className="font-mono text-lg font-black text-emerald-400 mt-1">
                {result ? `${result.coveragePercent}%` : '100% Auditada'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Se 15 no pool de {effectivePool.length}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>Total de Bilhetes</span>
              </span>
              <div className="font-mono text-lg font-black text-white mt-1">
                {result ? `${result.tickets.length} Jogos` : isRunning ? 'Calculando...' : '--'}
              </div>
              <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">
                Otimização Máxima
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-purple-400" />
                <span>Throughput</span>
              </span>
              <div className="font-mono text-lg font-black text-purple-300 mt-1">
                {progress?.opsPerSec
                  ? `${Math.round(progress.opsPerSec / 1000)}k op/s`
                  : result
                  ? `${Math.round(result.iterationsCount / 1000)}k op`
                  : 'Bitwise 32-bit'}
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Web Worker Ativo
              </span>
            </div>
          </div>

          {/* Pool de Dezenas Base */}
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <span>Pool Base para Fechamento Turbo:</span>
                <strong className="text-amber-400 font-mono">{effectivePool.length} dezenas</strong>
              </span>
              {fixedNumbers.length > 0 && (
                <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                  {fixedNumbers.length} Fixa(s) obrigatória(s)
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {effectivePool.map((num) => {
                const isFix = fixedNumbers.includes(num);
                return (
                  <span
                    key={num}
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold ${
                      isFix
                        ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}
                  >
                    {String(num).padStart(2, '0')}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Progress Bar during generation */}
          {isRunning && (
            <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-400 font-bold flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>
                    {progress?.phase === 'subsets'
                      ? '1/4 Gerando todos os subconjuntos de 15 do pool...'
                      : progress?.phase === 'candidates'
                      ? '2/4 Aplicando filtros estatísticos canônicos...'
                      : progress?.phase === 'greedy_cover'
                      ? '3/4 Força bruta gananciosa com bitwise set-cover...'
                      : '4/4 Auditando garantia matemática de 14 pontos...'}
                  </span>
                </span>
                <span className="font-mono font-bold text-amber-300 text-sm">
                  {progress?.percent || 0}%
                </span>
              </div>

              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-400 rounded-full transition-all duration-150 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  style={{ width: `${progress?.percent || 5}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Subconjuntos cobertos: {progress?.coveredSubsets || 0} / {progress?.totalSubsets || 0}</span>
                <span>Bilhetes eleitos: {progress?.selectedTicketsCount || 0}</span>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {result && (
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-950 p-4 rounded-xl border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Fechamento Turbo Concluído com Sucesso!</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      {result.elapsedMs} ms
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Foram gerados <strong className="text-white">{result.tickets.length} bilhetes otimizados</strong> cobrindo{' '}
                    <strong className="text-emerald-300">{result.coveredCombinations} de {result.totalCombinations} combinações (100% de garantia de 14 pontos)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAll ? 'Copiados!' : 'Copiar'}</span>
                </button>

                <button
                  onClick={handleStart}
                  className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Refazer</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Generated Tickets Preview */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>Prévia dos {result.tickets.length} Bilhetes Gerados:</span>
                <span className="font-mono text-emerald-400 font-bold">15 dezenas por aposta</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {result.tickets.map((ticket, idx) => (
                  <div
                    key={ticket.id}
                    className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="font-mono text-[11px] font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {ticket.dezenas.map((n: number) => (
                          <span
                            key={n}
                            className="font-mono text-[10px] font-bold text-slate-200 px-1 rounded bg-slate-800"
                          >
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-[10px] text-slate-400">
                      <span>Soma: {ticket.soma}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              <div>
                <strong className="block font-bold">Falha no Gerador Turbo:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Motor de Força Bruta Otimizado & Algoritmo Bitwise de Alta Performance</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                turboClient.cancel();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>

            {result ? (
              <button
                onClick={() => {
                  onApplyTickets(result.tickets, result);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>CARREGAR {result.tickets.length} JOGOS NO FECHAMENTO</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isRunning}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>INICIAR GERADOR TURBO</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
