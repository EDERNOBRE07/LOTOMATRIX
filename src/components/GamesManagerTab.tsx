import React, { useState } from 'react';
import { GameTicket, LotofacilDraw, FechamentoExportMeta } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches } from '../services/combinatorics';
import { generateFechamentoTxtContent } from '../services/txtExportFormatter';
import { ModuloConferenciaJogos } from './ModuloConferenciaJogos';
import { ExportCSVModal, CSVExportGame } from './ExportCSVModal';
import { ExportPDFModal } from './ExportPDFModal';
import {
  SavedGamesFilterMenu,
  PrimosFilterOption,
  SomaFilterOption,
} from './SavedGamesFilterMenu';
import {
  Download,
  Copy,
  Printer,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  Search,
  Check,
  Layers,
  Sparkles,
  ArrowRight,
  Tag,
  Plus,
  X,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';

interface GamesManagerTabProps {
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
  fechamentoMeta?: FechamentoExportMeta | null;
  onClearTickets: () => void;
  onGoToGenerator: () => void;
}

export const GamesManagerTab: React.FC<GamesManagerTabProps> = ({
  tickets,
  latestDraw = CONCURSO_ATUAL,
  fechamentoMeta,
  onClearTickets,
  onGoToGenerator,
}) => {
  const [conferirDezenas, setConferirDezenas] = useState<number[]>(latestDraw.dezenas);
  const [selectedConcurso, setSelectedConcurso] = useState<number>(latestDraw.concurso);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState<boolean>(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState<boolean>(false);

  // Sistema de Tags Personalizadas ('Ciclo Ativo', 'Aposta Agressiva', 'Matriz Ouro')
  const [ticketTags, setTicketTags] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('lotosniper_ticket_tags');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeTagFilter, setActiveTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newTagInput, setNewTagInput] = useState<{ [ticketId: string]: string }>({});

  // Menu de Filtros Dinâmicos (Dezenas específicas, Primos fora da curva, Soma fora do comum)
  const [selectedFilterDezenas, setSelectedFilterDezenas] = useState<number[]>([]);
  const [dezenaMatchMode, setDezenaMatchMode] = useState<'and' | 'or'>('and');
  const [primosFilter, setPrimosFilter] = useState<PrimosFilterOption>('all');
  const [somaFilter, setSomaFilter] = useState<SomaFilterOption>('all');

  // Seleção de múltiplos jogos para exportação em lote
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<string>>(() => {
    return new Set(tickets.map((t) => t.id || `ticket-${t.index}`));
  });

  // Atualiza seleção padrão quando novos tickets chegam
  React.useEffect(() => {
    setSelectedTicketIds(new Set(tickets.map((t) => t.id || `ticket-${t.index}`)));
  }, [tickets]);

  const handleToggleSelectTicket = (id: string) => {
    setSelectedTicketIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllTickets = () => {
    setSelectedTicketIds(new Set(tickets.map((t) => t.id || `ticket-${t.index}`)));
  };

  const handleDeselectAllTickets = () => {
    setSelectedTicketIds(new Set());
  };

  // Funções de Gerenciamento de Tags
  const handleAddTag = (ticketId: string, tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;
    const current = ticketTags[ticketId] || [];
    if (!current.includes(cleanTag)) {
      const updated = { ...ticketTags, [ticketId]: [...current, cleanTag] };
      setTicketTags(updated);
      try {
        localStorage.setItem('lotosniper_ticket_tags', JSON.stringify(updated));
      } catch {}
    }
    setNewTagInput((prev) => ({ ...prev, [ticketId]: '' }));
  };

  const handleRemoveTag = (ticketId: string, tagToRemove: string) => {
    const current = ticketTags[ticketId] || [];
    const updated = { ...ticketTags, [ticketId]: current.filter((t) => t !== tagToRemove) };
    setTicketTags(updated);
    try {
      localStorage.setItem('lotosniper_ticket_tags', JSON.stringify(updated));
    } catch {}
  };

  // Update when latestDraw changes
  React.useEffect(() => {
    setConferirDezenas(latestDraw.dezenas);
    setSelectedConcurso(latestDraw.concurso);
  }, [latestDraw.concurso, latestDraw.dezenas]);

  // Lista de todos os tags únicos existentes
  const allExistingTags = React.useMemo(() => {
    const defaultTags = ['Ciclo Ativo', 'Aposta Agressiva', 'Matriz Ouro', 'Equilíbrio 8P/7I'];
    const customTags = Object.values(ticketTags).flat();
    return Array.from(new Set([...defaultTags, ...customTags]));
  }, [ticketTags]);

  const handleToggleFilterDezena = (num: number) => {
    setSelectedFilterDezenas((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleClearFilterDezenas = () => {
    setSelectedFilterDezenas([]);
  };

  const handleResetAllFilters = () => {
    setSelectedFilterDezenas([]);
    setDezenaMatchMode('and');
    setPrimosFilter('all');
    setSomaFilter('all');
    setActiveTagFilter('all');
    setSearchQuery('');
  };

  // Jogos filtrados por Tag, Busca e Menu de Filtros Dinâmicos
  const filteredTickets = React.useMemo(() => {
    return tickets.filter((t) => {
      const id = t.id || `ticket-${t.index}`;
      const tags = ticketTags[id] || [];

      // 1. Filtro de tag
      if (activeTagFilter !== 'all' && !tags.includes(activeTagFilter)) {
        return false;
      }

      // 2. Filtro de busca (por número de dezenas ou label)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hasTag = tags.some((tg) => tg.toLowerCase().includes(q));
        const hasNumber = t.dezenas.some((n) => n.toString() === q || n.toString().padStart(2, '0') === q);
        const hasLabel = `jogo ${t.index}`.includes(q);
        if (!hasTag && !hasNumber && !hasLabel) return false;
      }

      // 3. Filtro de dezenas específicas
      if (selectedFilterDezenas.length > 0) {
        if (dezenaMatchMode === 'and') {
          const hasAll = selectedFilterDezenas.every((num) => t.dezenas.includes(num));
          if (!hasAll) return false;
        } else {
          const hasAny = selectedFilterDezenas.some((num) => t.dezenas.includes(num));
          if (!hasAny) return false;
        }
      }

      // 4. Filtro de Primos fora da curva (fora de 4-7)
      if (primosFilter === 'fora_da_curva') {
        if (t.primos >= 4 && t.primos <= 7) return false;
      } else if (primosFilter === 'canonico') {
        if (t.primos < 4 || t.primos > 7) return false;
      }

      // 5. Filtro de Soma fora do intervalo comum (175-220)
      if (somaFilter === 'fora_do_comum') {
        if (t.soma >= 175 && t.soma <= 220) return false;
      } else if (somaFilter === 'comum') {
        if (t.soma < 175 || t.soma > 220) return false;
      } else if (somaFilter === 'zona_ouro') {
        if (t.soma < 190 || t.soma > 210) return false;
      }

      return true;
    });
  }, [
    tickets,
    ticketTags,
    activeTagFilter,
    searchQuery,
    selectedFilterDezenas,
    dezenaMatchMode,
    primosFilter,
    somaFilter,
  ]);

  const handleSelectOnlyFiltered = () => {
    const ids = new Set(filteredTickets.map((t) => t.id || `ticket-${t.index}`));
    setSelectedTicketIds(ids);
  };

  // Tickets formatados com tags para o PDF e CSV
  const ticketsWithTags: GameTicket[] = React.useMemo(() => {
    return tickets.map((t) => ({
      ...t,
      tags: ticketTags[t.id || `ticket-${t.index}`] || [],
    }));
  }, [tickets, ticketTags]);

  // Convert selected tickets to CSVExportGame format for batch export
  const csvExportGames: CSVExportGame[] = React.useMemo(() => {
    const targetTickets = tickets.filter((t) => selectedTicketIds.has(t.id || `ticket-${t.index}`));
    const listToExport = targetTickets.length > 0 ? targetTickets : tickets;

    return listToExport.map((t) => {
      const hits = countMatches(t.dezenas, conferirDezenas);
      let premioNome = 'Não premiado';
      let premioValor = 0;
      if (hits === 15) {
        premioNome = '15 Pontos';
        premioValor = latestDraw.premiacoes?.faixa15?.valor || 1750000;
      } else if (hits === 14) {
        premioNome = '14 Pontos';
        premioValor = latestDraw.premiacoes?.faixa14?.valor || 1400;
      } else if (hits === 13) {
        premioNome = '13 Pontos';
        premioValor = 35.0;
      } else if (hits === 12) {
        premioNome = '12 Pontos';
        premioValor = 14.0;
      } else if (hits === 11) {
        premioNome = '11 Pontos';
        premioValor = 7.0;
      }

      const id = t.id || `ticket-${t.index}`;
      const tags = ticketTags[id] || [];

      return {
        index: t.index,
        label: `Jogo ${t.index.toString().padStart(2, '0')}${tags.length > 0 ? ` [${tags.join(', ')}]` : ''}`,
        dezenas: t.dezenas,
        pares: t.pares,
        impares: t.impares,
        primos: t.primos,
        soma: t.soma,
        moldura: t.moldura,
        scoreIA: t.scoreIA,
        hits,
        premioNome,
        premioValor,
      };
    });
  }, [tickets, selectedTicketIds, conferirDezenas, latestDraw, ticketTags]);

  const allDraws = [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)];

  const handleSelectConcurso = (concursoNum: number) => {
    setSelectedConcurso(concursoNum);
    const draw = allDraws.find((d) => d.concurso === concursoNum);
    if (draw) {
      setConferirDezenas(draw.dezenas);
    }
  };

  // Export TXT com cabeçalho técnico completo: estratégia, filtros obrigatórios e avançados
  const handleExportTXT = () => {
    const targetTickets = tickets.filter((t) => selectedTicketIds.has(t.id || `ticket-${t.index}`));
    const listToExport = targetTickets.length > 0 ? targetTickets : tickets;
    if (listToExport.length === 0) return;

    let metaToUse = fechamentoMeta;
    if (!metaToUse) {
      try {
        const savedMeta = localStorage.getItem('lotosniper_active_fechamento_meta');
        if (savedMeta) {
          metaToUse = JSON.parse(savedMeta);
        }
      } catch {}
    }

    const content = generateFechamentoTxtContent({
      tickets: listToExport,
      latestDraw,
      meta: metaToUse,
      ticketTags,
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_fechamento_${listToExport.length}_jogos.txt`;
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

            {/* Exportar CSV em Lote (com contagem de selecionados) */}
            <button
              onClick={() => setIsCSVModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer shadow-sm shadow-emerald-500/10"
              title="Exportar CSV em lote formatado para ferramentas de aposta ou Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV em Lote ({selectedTicketIds.size})</span>
            </button>

            {/* Exportar PDF Formatado para Volantes da Lotofácil */}
            <button
              onClick={() => setIsPDFModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition cursor-pointer shadow-sm shadow-purple-500/15"
              title="Exportar PDF formatado pronto para impressão em volantes da Lotofácil"
            >
              <Printer className="w-3.5 h-3.5 text-purple-400" />
              <span>Exportar PDF (Volantes)</span>
            </button>
          </div>
        )}
      </div>

      {/* Barra de Filtros por Tags e Seleção em Lote */}
      {tickets.length > 0 && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 shadow-lg space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Tag Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Tags:</span>
              </span>
              <button
                onClick={() => setActiveTagFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeTagFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todas ({tickets.length})
              </button>
              {allExistingTags.map((tag) => {
                const count = tickets.filter((t) => (ticketTags[t.id || `ticket-${t.index}`] || []).includes(tag)).length;
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTagFilter(tag)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                      activeTagFilter === tag
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'bg-slate-800/80 text-amber-300/80 hover:text-amber-200 border border-slate-700/60'
                    }`}
                  >
                    <span>{tag}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por tag ou dezena..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs w-48 sm:w-56 focus:outline-none focus:border-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Batch Selection Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAllTickets}
                className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Selecionar Todos</span>
              </button>
              <span className="text-slate-600">•</span>
              <button
                onClick={handleDeselectAllTickets}
                className="text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Desmarcar Todos</span>
              </button>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              <strong className="text-emerald-400">{selectedTicketIds.size}</strong> de{' '}
              <strong className="text-white">{tickets.length}</strong> jogos marcados para exportação
            </div>
          </div>
        </div>
      )}

      {/* Menu de Filtros Dinâmicos (Dezenas específicas, Primos fora da curva, Soma fora do comum) */}
      {tickets.length > 0 && (
        <SavedGamesFilterMenu
          tickets={tickets}
          selectedDezenas={selectedFilterDezenas}
          onToggleDezena={handleToggleFilterDezena}
          onClearDezenas={handleClearFilterDezenas}
          dezenaMatchMode={dezenaMatchMode}
          onChangeDezenaMatchMode={setDezenaMatchMode}
          primosFilter={primosFilter}
          onChangePrimosFilter={setPrimosFilter}
          somaFilter={somaFilter}
          onChangeSomaFilter={setSomaFilter}
          totalFilteredCount={filteredTickets.length}
          totalTicketsCount={tickets.length}
          onResetAllFilters={handleResetAllFilters}
          onSelectOnlyFiltered={handleSelectOnlyFiltered}
        />
      )}

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

          <ModuloConferenciaJogos
            latestDraw={latestDraw}
            generatedTickets={tickets}
            onGoToFechamento={onGoToGenerator}
          />
        </div>
      ) : (
        <>
          {/* Live Checker (Conferidor Instantâneo) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  <span>Conferidor Instantâneo de Acertos & Gestão de Tags</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compare sua matriz contra os resultados oficiais da Lotofácil e organize seus jogos com tags personalizadas.
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

            {/* List of Tickets with Tags and Selection or Filter Empty State */}
            {filteredTickets.length === 0 ? (
              <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  Nenhum bilhete corresponde aos filtros aplicados
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Não encontramos jogos que atendam simultaneamente às dezenas selecionadas, critério de primos e intervalo de soma configurados.
                </p>
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-amber-400/20"
                >
                  Restaurar Todos os Bilhetes ({tickets.length})
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredTickets.map((t) => {
                const id = t.id || `ticket-${t.index}`;
                const hits = countMatches(t.dezenas, conferirDezenas);
                const isAwarded = hits >= 11;
                const isSelected = selectedTicketIds.has(id);
                const currentTags = ticketTags[id] || [];

                return (
                  <div
                    key={id}
                    className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                      isSelected
                        ? 'border-emerald-500/50 bg-slate-950'
                        : 'border-slate-800/80 bg-slate-950/40 opacity-75'
                    } ${
                      hits >= 14
                        ? 'ring-1 ring-amber-400/50 bg-amber-500/5'
                        : ''
                    }`}
                  >
                    {/* Top Row: Selection Checkbox, Game Title & Hit Badge */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectTicket(id)}
                          className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                        />
                        <span className="font-mono font-black text-white text-sm">
                          Jogo #{t.index.toString().padStart(2, '0')}
                        </span>
                      </div>

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

                    {/* Numbers Grid */}
                    <div className="flex flex-wrap gap-1">
                      {t.dezenas.map((num) => {
                        const matched = conferirDezenas.includes(num);
                        return (
                          <span
                            key={num}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold ${
                              matched
                                ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                                : 'bg-slate-800/80 text-slate-400'
                            }`}
                          >
                            {num.toString().padStart(2, '0')}
                          </span>
                        );
                      })}
                    </div>

                    {/* Tags Section */}
                    <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1">
                        {currentTags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                          >
                            <span>{tag}</span>
                            <button
                              onClick={() => handleRemoveTag(id, tag)}
                              className="text-amber-400 hover:text-white cursor-pointer"
                              title="Remover tag"
                            >
                              ✕
                            </button>
                          </span>
                        ))}

                        {/* Quick Add Tag Suggestions */}
                        {!currentTags.includes('Ciclo Ativo') && (
                          <button
                            onClick={() => handleAddTag(id, 'Ciclo Ativo')}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 hover:text-amber-300 cursor-pointer"
                          >
                            + Ciclo Ativo
                          </button>
                        )}
                        {!currentTags.includes('Matriz Ouro') && (
                          <button
                            onClick={() => handleAddTag(id, 'Matriz Ouro')}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 hover:text-amber-300 cursor-pointer"
                          >
                            + Matriz Ouro
                          </button>
                        )}
                        {!currentTags.includes('Aposta Agressiva') && (
                          <button
                            onClick={() => handleAddTag(id, 'Aposta Agressiva')}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 hover:text-amber-300 cursor-pointer"
                          >
                            + Agressiva
                          </button>
                        )}
                      </div>

                      {/* Custom Tag Input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Nova tag..."
                          value={newTagInput[id] || ''}
                          onChange={(e) => setNewTagInput({ ...newTagInput, [id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddTag(id, newTagInput[id] || '');
                            }
                          }}
                          className="bg-slate-900 border border-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 w-20 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          onClick={() => handleAddTag(id, newTagInput[id] || '')}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          title="Adicionar tag"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        </>
      )}

      {/* Modal de Exportação CSV em Lote para Volantes e Excel */}
      <ExportCSVModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        games={csvExportGames}
        concursoRef={selectedConcurso}
        title={`Exportar ${csvExportGames.length} Jogos Selecionados em CSV`}
        defaultFilename={`lotosniper_lote_${csvExportGames.length}_jogos.csv`}
      />

      {/* Modal de Exportação em PDF Formatado para Volantes da Lotofácil */}
      <ExportPDFModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        tickets={ticketsWithTags}
        latestDraw={latestDraw}
      />
    </div>
  );
};
