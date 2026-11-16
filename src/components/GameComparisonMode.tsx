import React, { useMemo, useState } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { formatCurrencyBRL, getTicketCostBRL } from '../services/ticketRoiAudit';
import {
  GitCompare,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  Award,
  Download,
  Search,
  Sparkles,
  CheckSquare,
  Square,
} from 'lucide-react';

interface GameComparisonModeProps {
  activeTickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  initialSelectedIds?: string[];
  onGoToGenerator?: () => void;
}

interface ComparableGameEntry {
  uid: string;
  label: string;
  origin: string;
  ticket: GameTicket;
}

interface EvaluatedComparableGame {
  entry: ComparableGameEntry;
  custoUnitario: number;
  custoAcumulado: number;
  retornoAcumulado: number;
  lucroAcumulado: number;
  roiPercent: number;
  acertosAcumulados: number;
  mediaAcertos: number;
  premiacoesCount: number;
  taxaPremiacaoPercent: number;
  melhorPontuacao: number;
  acertosConcursoAtual: number;
  faixas: {
    15: number;
    14: number;
    13: number;
    12: number;
    11: number;
  };
}

export const GameComparisonMode: React.FC<GameComparisonModeProps> = ({
  activeTickets,
  latestDraw = CONCURSO_ATUAL,
  initialSelectedIds,
  onGoToGenerator,
}) => {
  const [windowSize, setWindowSize] = useState<10 | 20 | 50 | 100>(20);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Consolida bilhetes da memória ativa + fechamentos salvos no Dossiê (desduplicados por assinatura de dezenas)
  const availableGames = useMemo<ComparableGameEntry[]>(() => {
    const entries: ComparableGameEntry[] = [];
    const seenSignatures = new Set<string>();

    activeTickets.forEach((t, idx) => {
      const sortedDez = [...(t.dezenas || [])].sort((a, b) => a - b);
      if (sortedDez.length < 15) return;
      const sig = sortedDez.join('-');
      const uid = t.id || `active-${t.index || idx + 1}`;
      seenSignatures.add(sig);
      entries.push({
        uid,
        label: `Jogo #${String(t.index || idx + 1).padStart(2, '0')}`,
        origin: 'Bilhetes Ativos',
        ticket: { ...t, dezenas: sortedDez },
      });
    });

    const savedFechamentos = getSavedFechamentos();
    savedFechamentos.forEach((fech) => {
      const fechName =
        fech.nomeFechamento ||
        fech.tipoFechamento ||
        fech.modalidadeMatriz ||
        `Alvo #${fech.concursoAlvo || fech.concurso}`;
      (fech.tickets || []).forEach((t, idx) => {
        const sortedDez = [...(t.dezenas || [])].sort((a, b) => a - b);
        if (sortedDez.length < 15) return;
        const sig = sortedDez.join('-');
        if (seenSignatures.has(sig)) return;
        seenSignatures.add(sig);
        const uid = `${fech.id}__${t.id || idx + 1}`;
        entries.push({
          uid,
          label: `Jogo #${String(t.index || idx + 1).padStart(2, '0')}`,
          origin: fechName,
          ticket: { ...t, dezenas: sortedDez },
        });
      });
    });

    return entries;
  }, [activeTickets]);

  // Estado dos bilhetes selecionados para comparação lado a lado (até 6 simultâneos)
  const [comparedIds, setComparedIds] = useState<string[]>(() => {
    if (initialSelectedIds && initialSelectedIds.length >= 2) {
      return initialSelectedIds.slice(0, 6);
    }
    return availableGames.slice(0, Math.min(4, availableGames.length)).map((g) => g.uid);
  });

  // Mantém seleção sincronizada com jogos disponíveis quando muda a base
  const validComparedIds = useMemo(() => {
    const validSet = new Set(availableGames.map((g) => g.uid));
    const kept = comparedIds.filter((id) => validSet.has(id));
    if (kept.length > 0) return kept;
    return availableGames.slice(0, Math.min(3, availableGames.length)).map((g) => g.uid);
  }, [availableGames, comparedIds]);

  const historicalDraws = useMemo(
    () => getHistorical100Draws(latestDraw).slice(0, windowSize),
    [latestDraw, windowSize]
  );

  // Avalia todos os jogos disponíveis na janela histórica selecionada
  const evaluatedAll = useMemo<EvaluatedComparableGame[]>(() => {
    const drawCount = Math.max(1, historicalDraws.length);

    return availableGames.map((entry) => {
      const dez = entry.ticket.dezenas;
      const custoUnitario = getTicketCostBRL(entry.ticket, VALOR_APOSTA_LOTOFACIL);
      const custoAcumulado = custoUnitario * drawCount;

      let retornoAcumulado = 0;
      let acertosAcumulados = 0;
      let premiacoesCount = 0;
      let melhorPontuacao = 0;
      const faixas = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };

      for (const d of historicalDraws) {
        const hits = countMatches(dez, d.dezenas);
        acertosAcumulados += hits;
        if (hits > melhorPontuacao) melhorPontuacao = hits;
        if (hits >= 11) {
          premiacoesCount++;
          if (hits === 15) {
            faixas[15]++;
            retornoAcumulado += d.premiacoes?.faixa15?.valor || 1800000;
          } else if (hits === 14) {
            faixas[14]++;
            retornoAcumulado += d.premiacoes?.faixa14?.valor || 1500;
          } else if (hits === 13) {
            faixas[13]++;
            retornoAcumulado += d.premiacoes?.faixa13?.valor || 35;
          } else if (hits === 12) {
            faixas[12]++;
            retornoAcumulado += d.premiacoes?.faixa12?.valor || 14;
          } else {
            faixas[11]++;
            retornoAcumulado += d.premiacoes?.faixa11?.valor || 7;
          }
        }
      }

      const lucroAcumulado = retornoAcumulado - custoAcumulado;
      const roiPercent =
        custoAcumulado > 0 ? ((retornoAcumulado - custoAcumulado) / custoAcumulado) * 100 : 0;
      const mediaAcertos = acertosAcumulados / drawCount;
      const taxaPremiacaoPercent = (premiacoesCount / drawCount) * 100;
      const acertosConcursoAtual = countMatches(dez, latestDraw.dezenas);

      return {
        entry,
        custoUnitario,
        custoAcumulado,
        retornoAcumulado,
        lucroAcumulado,
        roiPercent,
        acertosAcumulados,
        mediaAcertos,
        premiacoesCount,
        taxaPremiacaoPercent,
        melhorPontuacao,
        acertosConcursoAtual,
        faixas,
      };
    });
  }, [availableGames, historicalDraws, latestDraw.dezenas]);

  const evaluatedById = useMemo(() => {
    const map = new Map<string, EvaluatedComparableGame>();
    evaluatedAll.forEach((ev) => map.set(ev.entry.uid, ev));
    return map;
  }, [evaluatedAll]);

  const comparedItems = useMemo(
    () =>
      validComparedIds
        .map((id) => evaluatedById.get(id))
        .filter((item): item is EvaluatedComparableGame => Boolean(item)),
    [validComparedIds, evaluatedById]
  );

  // Líderes para destaque visual na tabela lado a lado
  const leaders = useMemo(() => {
    if (comparedItems.length === 0) {
      return { bestRoiId: '', bestHitsId: '', bestReturnId: '' };
    }
    const byRoi = [...comparedItems].sort((a, b) => b.roiPercent - a.roiPercent)[0];
    const byHits = [...comparedItems].sort((a, b) => b.acertosAcumulados - a.acertosAcumulados)[0];
    const byReturn = [...comparedItems].sort((a, b) => b.retornoAcumulado - a.retornoAcumulado)[0];
    return {
      bestRoiId: byRoi.entry.uid,
      bestHitsId: byHits.entry.uid,
      bestReturnId: byReturn.entry.uid,
    };
  }, [comparedItems]);

  // Dezenas em comum entre todos os bilhetes atualmente selecionados
  const commonDezenas = useMemo(() => {
    if (comparedItems.length < 2) return [];
    const first = comparedItems[0].entry.ticket.dezenas;
    return first.filter((n) => comparedItems.every((it) => it.entry.ticket.dezenas.includes(n)));
  }, [comparedItems]);

  const filteredSelectorList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return evaluatedAll;
    return evaluatedAll.filter((ev) => {
      const dezText = ev.entry.ticket.dezenas.map((n) => String(n).padStart(2, '0')).join(' ');
      return (
        ev.entry.label.toLowerCase().includes(q) ||
        ev.entry.origin.toLowerCase().includes(q) ||
        dezText.includes(q)
      );
    });
  }, [evaluatedAll, searchTerm]);

  const handleToggleCompareId = (uid: string) => {
    setComparedIds((prev) => {
      const base = prev.length > 0 ? prev : validComparedIds;
      if (base.includes(uid)) {
        return base.filter((id) => id !== uid);
      }
      if (base.length >= 6) {
        return [...base.slice(1), uid];
      }
      return [...base, uid];
    });
  };

  const handleSelectTop4ByRoi = () => {
    const top4 = [...evaluatedAll]
      .sort((a, b) => b.roiPercent - a.roiPercent || b.acertosAcumulados - a.acertosAcumulados)
      .slice(0, 4)
      .map((ev) => ev.entry.uid);
    setComparedIds(top4);
  };

  const handleExportComparisonCSV = () => {
    if (comparedItems.length === 0) return;
    const headers = [
      'Jogo',
      'Origem',
      'Dezenas',
      `Janela (${windowSize} Concursos)`,
      'ROI (%)',
      'Custo Acumulado (BRL)',
      'Retorno Acumulado (BRL)',
      'Lucro Liquido (BRL)',
      'Acertos Acumulados',
      'Media Acertos/Concurso',
      'Premiacoes (11+)',
      'Melhor Pontuacao',
      `Acertos Concurso #${latestDraw.concurso}`,
    ];

    const rows = comparedItems.map((it) => [
      it.entry.label,
      it.entry.origin,
      it.entry.ticket.dezenas.map((n) => String(n).padStart(2, '0')).join(' '),
      `${windowSize} concursos`,
      it.roiPercent.toFixed(2),
      it.custoAcumulado.toFixed(2),
      it.retornoAcumulado.toFixed(2),
      it.lucroAcumulado.toFixed(2),
      String(it.acertosAcumulados),
      it.mediaAcertos.toFixed(2),
      String(it.premiacoesCount),
      String(it.melhorPontuacao),
      String(it.acertosConcursoAtual),
    ]);

    const csv =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lotosniper_comparacao_jogos_${windowSize}conc.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportFeedback(`Tabela comparativa de ${comparedItems.length} jogos exportada em CSV.`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  if (availableGames.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center mx-auto">
          <GitCompare className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Nenhum bilhete disponível para comparação</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Gere e salve jogos no Estúdio de Fechamento para selecionar múltiplos bilhetes e comparar ROI e acertos acumulados lado a lado.
        </p>
        {onGoToGenerator && (
          <button
            type="button"
            onClick={onGoToGenerator}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Gerar Fechamento Agora
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho & Controles de Janela */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <GitCompare className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Comparador Lado a Lado</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {comparedItems.length} de 6 bilhetes em comparação
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Modo de Comparação de Jogos (ROI &amp; Acertos Acumulados)
            </h2>
            <p className="text-xs text-slate-400">
              Selecione de 2 a 6 bilhetes abaixo para auditar custo, retorno histórico, ROI e soma de acertos lado a lado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
              {([10, 20, 50, 100] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWindowSize(w)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                    windowSize === w
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w} conc.
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSelectTop4ByRoi}
              className="px-3 py-2 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Selecionar Top 4 ROI</span>
            </button>

            <button
              type="button"
              onClick={handleExportComparisonCSV}
              disabled={comparedItems.length === 0}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {exportFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{exportFeedback}</span>
            <button
              type="button"
              onClick={() => setExportFeedback(null)}
              className="text-emerald-300 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Seletor Rápido de Bilhetes */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar bilhetes por número ou origem..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-400 font-mono tabular-nums">
                Disponíveis: <strong className="text-white">{availableGames.length}</strong>
              </span>
              <button
                type="button"
                onClick={() => setComparedIds([])}
                className="text-slate-400 hover:text-rose-300 font-semibold cursor-pointer whitespace-nowrap"
              >
                Limpar Seleção
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
            {filteredSelectorList.map((ev) => {
              const isChecked = validComparedIds.includes(ev.entry.uid);
              return (
                <button
                  key={ev.entry.uid}
                  type="button"
                  onClick={() => handleToggleCompareId(ev.entry.uid)}
                  className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                    isChecked
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="font-mono font-bold text-xs truncate">
                        {ev.entry.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{ev.entry.origin}</div>
                    <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                      <span className={ev.roiPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        ROI {ev.roiPercent > 0 ? '+' : ''}
                        {ev.roiPercent.toFixed(1)}%
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300">{ev.acertosAcumulados} acertos</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabela Comparativa Lado a Lado */}
      {comparedItems.length < 2 ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <p className="text-sm font-bold text-white">
            Selecione pelo menos 2 bilhetes acima para visualizar o comparativo lado a lado.
          </p>
          <p className="text-xs text-slate-400">
            Você pode marcar até 6 bilhetes simultaneamente ou clicar em &ldquo;Selecionar Top 4 ROI&rdquo;.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <Award className="w-4 h-4 text-amber-400" />
              <span>
                Tabela Comparativa Lado a Lado ({comparedItems.length} Bilhetes · Janela de {historicalDraws.length} Concursos)
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
              Dezenas em comum entre todos: <strong className="text-emerald-400">{commonDezenas.length}</strong>
              {commonDezenas.length > 0 && (
                <span className="ml-1.5 text-slate-300">
                  ({commonDezenas.map((n) => String(n).padStart(2, '0')).join(' ')})
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800">
                  <th className="py-3 px-4 font-bold text-slate-300 sticky left-0 bg-slate-950 z-10 min-w-[190px] border-r border-slate-800">
                    Métrica / Indicador
                  </th>
                  {comparedItems.map((item) => {
                    const isBestRoi = item.entry.uid === leaders.bestRoiId;
                    return (
                      <th
                        key={item.entry.uid}
                        className="py-3 px-4 min-w-[205px] align-top border-r border-slate-800/60 last:border-r-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-white text-sm">
                                {item.entry.label}
                              </span>
                              {isBestRoi && (
                                <span className="text-[10px] font-bold text-emerald-400">
                                  · Líder ROI
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-normal block truncate max-w-[160px]">
                              {item.entry.origin}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCompareId(item.entry.uid)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                            title="Remover da comparação"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
                {/* ROI Histórico */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    ROI Histórico ({historicalDraws.length} conc.)
                  </td>
                  {comparedItems.map((item) => {
                    const isLeader = item.entry.uid === leaders.bestRoiId;
                    return (
                      <td
                        key={item.entry.uid}
                        className={`py-3 px-4 font-mono font-bold tabular-nums border-r border-slate-800/60 last:border-r-0 ${
                          isLeader ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {item.roiPercent >= 0 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span
                            className={`text-sm ${
                              item.roiPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.roiPercent > 0 ? '+' : ''}
                            {item.roiPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Acertos Acumulados */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Acertos Acumulados
                  </td>
                  {comparedItems.map((item) => {
                    const isLeader = item.entry.uid === leaders.bestHitsId;
                    return (
                      <td
                        key={item.entry.uid}
                        className={`py-3 px-4 font-mono tabular-nums border-r border-slate-800/60 last:border-r-0 ${
                          isLeader ? 'bg-emerald-500/5' : ''
                        }`}
                      >
                        <div className="flex items-baseline gap-1.5">
                          <strong className="text-sm text-white">{item.acertosAcumulados} pts</strong>
                          <span className="text-[11px] text-slate-400">
                            ({item.mediaAcertos.toFixed(2)}/conc.)
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Retorno Bruto Acumulado */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Retorno Bruto Acumulado
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className={`py-3 px-4 font-mono font-semibold tabular-nums text-emerald-400 border-r border-slate-800/60 last:border-r-0 ${
                        item.entry.uid === leaders.bestReturnId ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {formatCurrencyBRL(item.retornoAcumulado)}
                    </td>
                  ))}
                </tr>

                {/* Custo Acumulado */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Custo Acumulado ({historicalDraws.length}×)
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className="py-3 px-4 font-mono tabular-nums text-slate-300 border-r border-slate-800/60 last:border-r-0"
                    >
                      {formatCurrencyBRL(item.custoAcumulado)}
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({formatCurrencyBRL(item.custoUnitario)}/ap)
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Lucro Líquido Acumulado */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Lucro Líquido Acumulado
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className={`py-3 px-4 font-mono font-bold tabular-nums border-r border-slate-800/60 last:border-r-0 ${
                        item.lucroAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.lucroAcumulado > 0 ? '+' : ''}
                      {formatCurrencyBRL(item.lucroAcumulado)}
                    </td>
                  ))}
                </tr>

                {/* Premiações 11+ */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Premiações (11+ pts)
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className="py-3 px-4 font-mono tabular-nums text-slate-200 border-r border-slate-800/60 last:border-r-0"
                    >
                      <strong>{item.premiacoesCount}</strong> / {historicalDraws.length}{' '}
                      <span className="text-slate-400">({item.taxaPremiacaoPercent.toFixed(0)}%)</span>
                    </td>
                  ))}
                </tr>

                {/* Faixas Premiação */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Distribuição 11–15 pts
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className="py-3 px-4 font-mono text-[11px] tabular-nums text-slate-300 border-r border-slate-800/60 last:border-r-0"
                    >
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <span className={item.faixas[15] > 0 ? 'text-amber-300 font-bold' : 'text-slate-500'}>
                          15:{item.faixas[15]}
                        </span>
                        <span className={item.faixas[14] > 0 ? 'text-amber-300 font-bold' : 'text-slate-500'}>
                          14:{item.faixas[14]}
                        </span>
                        <span className={item.faixas[13] > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                          13:{item.faixas[13]}
                        </span>
                        <span>12:{item.faixas[12]}</span>
                        <span>11:{item.faixas[11]}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Melhor Pontuação & Concurso Atual */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Melhor Nota · Atual (#{latestDraw.concurso})
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className="py-3 px-4 font-mono tabular-nums border-r border-slate-800/60 last:border-r-0"
                    >
                      <span className="text-amber-300 font-bold">{item.melhorPontuacao} pts</span>
                      <span className="text-slate-500 mx-1.5">·</span>
                      <span
                        className={
                          item.acertosConcursoAtual >= 11
                            ? 'text-emerald-400 font-bold'
                            : 'text-slate-300'
                        }
                      >
                        {item.acertosConcursoAtual} pts hoje
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Perfil Estrutural */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800">
                    Soma · Paridade · Primos
                  </td>
                  {comparedItems.map((item) => {
                    const t = item.entry.ticket;
                    return (
                      <td
                        key={item.entry.uid}
                        className="py-3 px-4 font-mono tabular-nums text-slate-300 border-r border-slate-800/60 last:border-r-0"
                      >
                        Σ {t.soma} · {t.pares}P/{t.impares}I · {t.primos} Primos
                      </td>
                    );
                  })}
                </tr>

                {/* Dezenas Marcadas (Comparação Visual) */}
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-300 sticky left-0 bg-slate-950/95 border-r border-slate-800 align-top">
                    Dezenas (Verde = #{latestDraw.concurso})
                  </td>
                  {comparedItems.map((item) => (
                    <td
                      key={item.entry.uid}
                      className="py-3 px-4 border-r border-slate-800/60 last:border-r-0 align-top"
                    >
                      <div className="flex flex-wrap gap-1">
                        {item.entry.ticket.dezenas.map((num) => {
                          const hitLatest = latestDraw.dezenas.includes(num);
                          const isCommon = commonDezenas.includes(num);
                          return (
                            <span
                              key={num}
                              title={
                                isCommon
                                  ? 'Presente em todos os jogos comparados'
                                  : undefined
                              }
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-mono tabular-nums ${
                                hitLatest
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : isCommon
                                  ? 'bg-slate-700 text-amber-300 font-bold border border-amber-400/50'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {String(num).padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
