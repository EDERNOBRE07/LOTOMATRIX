import React, { useState } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches } from '../services/combinatorics';
import { ModuloConferenciaJogos } from './ModuloConferenciaJogos';
import {
  Download,
  Copy,
  Printer,
  FileText,
  CheckCircle2,
  Trash2,
  Search,
  Check,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface GamesManagerTabProps {
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  onClearTickets: () => void;
  onGoToGenerator: () => void;
}

export const GamesManagerTab: React.FC<GamesManagerTabProps> = ({
  tickets,
  latestDraw = CONCURSO_ATUAL,
  onClearTickets,
  onGoToGenerator,
}) => {
  const [conferirDezenas, setConferirDezenas] = useState<number[]>(latestDraw.dezenas);
  const [selectedConcurso, setSelectedConcurso] = useState<number>(latestDraw.concurso);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Update when latestDraw changes
  React.useEffect(() => {
    setConferirDezenas(latestDraw.dezenas);
    setSelectedConcurso(latestDraw.concurso);
  }, [latestDraw.concurso, latestDraw.dezenas]);

  const allDraws = [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)];

  const handleSelectConcurso = (concursoNum: number) => {
    setSelectedConcurso(concursoNum);
    const draw = allDraws.find((d) => d.concurso === concursoNum);
    if (draw) {
      setConferirDezenas(draw.dezenas);
    }
  };

  // Export TXT
  const handleExportTXT = () => {
    if (tickets.length === 0) return;
    const content =
      `# LOTOSNIPER - MATRIZ DE FECHAMENTO LOTOFÁCIL (ALVO 15)\n` +
      `# Total de Bilhetes: ${tickets.length}\n` +
      `# Gerado em: ${new Date().toLocaleString('pt-BR')}\n` +
      `# ------------------------------------------------------------\n` +
      tickets
        .map(
          (t) =>
            `Jogo ${t.index.toString().padStart(2, '0')}: ${t.dezenas
              .map((n) => n.toString().padStart(2, '0'))
              .join(' ')}`
        )
        .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_fechamento_${tickets.length}_jogos.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    const header = 'Jogo,D1,D2,D3,D4,D5,D6,D7,D8,D9,D10,D11,D12,D13,D14,D15,Pares,Primos,Soma,Moldura,ScoreIA\n';
    const rows = tickets
      .map(
        (t) =>
          `${t.index},${t.dezenas.join(',')},${t.pares},${t.primos},${t.soma},${t.moldura},${t.scoreIA}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_fechamento.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  // Copy standard line by line for Caixa Lotérica or Bolões
  const handleCopyRaw = () => {
    const text = tickets
      .map((t) => t.dezenas.map((n) => n.toString().padStart(2, '0')).join(' '))
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedFormat('raw');
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Results calculation against conferirDezenas
  let total15 = 0;
  let total14 = 0;
  let total13 = 0;
  let total12 = 0;
  let total11 = 0;

  for (const t of tickets) {
    const hits = countMatches(t.dezenas, conferirDezenas);
    if (hits === 15) total15++;
    else if (hits === 14) total14++;
    else if (hits === 13) total13++;
    else if (hits === 12) total12++;
    else if (hits === 11) total11++;
  }

  return (
    <div className="space-y-6">
      {/* Top Export Bar */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <span>Gerenciador de Jogos, Exportador & Conferidor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Exporte seus bilhetes para apostas em lotéricas ou confira a premiação instantânea
            contra qualquer sorteio.
          </p>
        </div>

        {tickets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyRaw}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              {copiedFormat === 'raw' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Linhas</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportTXT}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baixar TXT</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baixar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="space-y-6">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-white">Nenhum fechamento salvo na sessão</h3>
                <p className="text-xs text-slate-400">
                  Gere combinações com garantia no Fechamento ou utilize o Módulo de Conferência abaixo para conferir qualquer volante digitado ou colado.
                </p>
              </div>
            </div>
            <button
              onClick={onGoToGenerator}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer whitespace-nowrap"
            >
              Ir para o Fechamento
            </button>
          </div>

          <ModuloConferenciaJogos latestDraw={latestDraw} />
        </div>
      ) : (
        <>
          {/* Live Checker (Conferidor Instantâneo) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  <span>Conferidor Instantâneo de Acertos</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compare sua matriz contra os resultados oficiais da Lotofácil.
                </p>
              </div>

              {/* Concurso selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Selecionar Concurso:</span>
                <select
                  value={selectedConcurso}
                  onChange={(e) => handleSelectConcurso(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 font-mono cursor-pointer"
                >
                  {RECENT_DRAWS.map((d) => (
                    <option key={d.concurso} value={d.concurso}>
                      #{d.concurso} ({d.data})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Numbers Display */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Dezenas Sorteadas:</span>
                <div className="flex flex-wrap gap-1">
                  {conferirDezenas.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-500 text-slate-950 font-mono text-xs font-bold"
                    >
                      {n.toString().padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Total Hits Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {total15 > 0 && (
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-400 text-slate-950">
                    {total15}x 15 PONTOS!
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold ${
                    total14 > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {total14}x 14 Pontos
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold ${
                    total13 > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {total13}x 13 Pontos
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold ${
                    total12 > 0 ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {total12}x 12 Pontos
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold ${
                    total11 > 0 ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {total11}x 11 Pontos
                </span>
              </div>
            </div>

            {/* List of Tickets with Highlighted Matches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[550px] overflow-y-auto pr-1">
              {tickets.map((t) => {
                const hits = countMatches(t.dezenas, conferirDezenas);
                const isAwarded = hits >= 11;

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border transition ${
                      hits >= 14
                        ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-400/50'
                        : hits >= 13
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isAwarded
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-950/40 border-slate-850 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-mono font-bold text-white">
                        Jogo #{t.index.toString().padStart(2, '0')}
                      </span>
                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                          hits >= 14
                            ? 'bg-amber-400 text-slate-950'
                            : hits >= 11
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {hits} ACERTOS {hits >= 11 ? '★ PREMIADO' : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {t.dezenas.map((num) => {
                        const matched = conferirDezenas.includes(num);
                        return (
                          <span
                            key={num}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold ${
                              matched
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-800/80 text-slate-500'
                            }`}
                          >
                            {num.toString().padStart(2, '0')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
