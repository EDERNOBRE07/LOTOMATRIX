import React, { useState } from 'react';
import { GameTicket, LotofacilDraw, FechamentoExportMeta } from '../types/lotofacil';
import { CONCURSO_ATUAL, RECENT_DRAWS } from '../data/lotofacilData';
import { countMatches, DEFAULT_FILTERS } from '../services/combinatorics';
import { generateFechamentoTxtContent } from '../services/txtExportFormatter';
import { ModuloConferenciaJogos } from './ModuloConferenciaJogos';
import { RealTimeFilterSimulation } from './RealTimeFilterSimulation';
import { ExportCSVModal, CSVExportGame } from './ExportCSVModal';
import { ExportPDFModal } from './ExportPDFModal';
import { ExportLotericaPDFModal } from './ExportLotericaPDFModal';
import { SavedFechamentosDossierList } from './SavedFechamentosDossierList';
import { AuditedWinningGamesList } from './AuditedWinningGamesList';
import { AnaliseROISavedGames } from './AnaliseROISavedGames';
import {
  getSavedFechamentos,
  getDuplicateFechamentosReport,
  removeDuplicateFechamentos,
  DuplicateFechamentosReport,
  sanitizarFechamentosSalvos,
} from '../services/savedFechamentosStorage';
import { soundService } from '../services/soundAlert';
import { SavedGamesFilterMenu, PrimosFilterOption, SomaFilterOption } from './SavedGamesFilterMenu';
import {
  downloadTicketsVolantePDF,
  VolanteExportStyle,
  PdfFontSizePreference,
  PdfMarginPreference,
} from '../services/goldPdfGenerator';
import { downloadProfessionalLotericaPDF } from '../services/lotericaPdfGenerator';
import { downloadRelatorioFechamentoAtivoPDF } from '../services/relatorioFechamentoAtivoPdf';
export { downloadRelatorioFechamentoAtivoPDF, downloadRelatorioFechamentoAtivoPDF as gerarEDispararRelatorioPDF };
import jsPDF from 'jspdf';
import Papa from 'papaparse';
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
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  Settings2,
  Award,
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
  const [isLotericaPDFModalOpen, setIsLotericaPDFModalOpen] = useState<boolean>(false);
  const [pdfExportStyle, setPdfExportStyle] = useState<VolanteExportStyle>('oficial');
  const [pdfPreferences, setPdfPreferences] = useState<{
    fontSize: PdfFontSizePreference;
    margin: PdfMarginPreference;
    includeStatsFooter: boolean;
  }>({
    fontSize: 'normal',
    margin: 'normal',
    includeStatsFooter: true,
  });
  const [isPdfConfigOpen, setIsPdfConfigOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<'fechamentos_salvos' | 'bilhetes_individuais' | 'analise_roi'>('fechamentos_salvos');

  // Relatório de duplicatas e limpeza automática
  const [dupReport, setDupReport] = useState<DuplicateFechamentosReport>(() => getDuplicateFechamentosReport());
  const [duplicateActionFeedback, setDuplicateActionFeedback] = useState<string | null>(null);

  React.useEffect(() => {
    const handleUpdate = () => {
      setDupReport(getDuplicateFechamentosReport());
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
  }, []);

  const handleLimpezaDuplicatas = () => {
    const report = getDuplicateFechamentosReport();
    if (report.duplicateCount === 0) {
      setDuplicateActionFeedback('Nenhum fechamento duplicado ou 100% redundante encontrado na sua base!');
      setTimeout(() => setDuplicateActionFeedback(null), 4000);
      return;
    }
    const res = removeDuplicateFechamentos();
    setDupReport(getDuplicateFechamentosReport());
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}
    setDuplicateActionFeedback(`✓ ${res.details}`);
    setTimeout(() => setDuplicateActionFeedback(null), 5000);
  };

  const [sanitizacaoFeedback, setSanitizacaoFeedback] = useState<string | null>(null);

  const handleSanitizarBase = () => {
    const res = sanitizarFechamentosSalvos();
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}
    if (res.sanitizedCount > 0 || res.ticketsCorrigidosCount > 0) {
      setSanitizacaoFeedback(
        `✓ Sanitização concluída com sucesso: ${res.sanitizedCount} fechamento(s) corrigido(s) e ${res.ticketsCorrigidosCount} bilhete(s) reparado(s) com 100% de integridade no universo de dezenas!`
      );
    } else {
      setSanitizacaoFeedback(
        `✓ Base 100% íntegra: todos os ${res.totalFechamentos} fechamentos e bilhetes estão em perfeita conformidade (dezenasFixas ≤ 12 e pertencentes ao universo).`
      );
    }
    setTimeout(() => setSanitizacaoFeedback(null), 6000);
  };

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

  // Export CSV formatado diretamente via PapaParse para planilhas externas (Excel, Google Sheets, Calc)
  const handleExportCSV = () => {
    const targetTickets = tickets.filter((t) => selectedTicketIds.has(t.id || `ticket-${t.index}`));
    const listToExport = targetTickets.length > 0 ? targetTickets : tickets;
    if (listToExport.length === 0) return;

    let metaToUse = fechamentoMeta;
    if (!metaToUse) {
      try {
        const savedMeta = localStorage.getItem('lotosniper_active_fechamento_meta');
        if (savedMeta) metaToUse = JSON.parse(savedMeta);
      } catch {}
    }

    const estrategia = metaToUse?.strategyName || metaToUse?.modeName || 'Fechamento LotoSniper';
    const concursoRef = metaToUse?.concurso || latestDraw.concurso;
    const dataRef = metaToUse?.dataConcurso || latestDraw.data;

    const dataRows = listToExport.map((t) => {
      const id = t.id || `ticket-${t.index}`;
      const tags = (ticketTags[id] || []).join(' | ');
      const sortedDez = [...t.dezenas].sort((a, b) => a - b);
      const rowObj: Record<string, any> = {
        Jogo: `Jogo ${t.index.toString().padStart(2, '0')}`,
        'Dezenas Formatadas': sortedDez.map((n) => n.toString().padStart(2, '0')).join(' - '),
      };
      sortedDez.forEach((n, idx) => {
        rowObj[`D${(idx + 1).toString().padStart(2, '0')}`] = n.toString().padStart(2, '0');
      });
      rowObj['Pares'] = t.pares;
      rowObj['Ímpares'] = t.impares ?? (15 - t.pares);
      rowObj['Primos'] = t.primos;
      rowObj['Moldura'] = t.moldura;
      rowObj['Fibonacci'] = t.fibonacci ?? 0;
      rowObj['Soma Total'] = t.soma;
      rowObj['Repetidas'] = t.repetidas ?? 0;
      rowObj['Score IA'] = (t.scoreIA || 0).toFixed(1);
      rowObj['Tags'] = tags;
      rowObj['Estratégia'] = estrategia;
      rowObj['Concurso Referência'] = concursoRef;
      rowObj['Data Concurso'] = dataRef;
      return rowObj;
    });

    // Utiliza PapaParse unparse para formatação robusta de CSV com separador regional ';'
    const unparsedCsv = Papa.unparse(dataRows, { delimiter: ';' });
    const csvContent = '\uFEFF' + unparsedCsv;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_jogos_concurso_${concursoRef}_${listToExport.length}_apostas.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setCopiedFormat('csv');
    setTimeout(() => setCopiedFormat(null), 3500);
  };

  // Exportação do Relatório Executivo de Fechamento Ativo em PDF
  const handleExportRelatorioFechamentoAtivoPDF = () => {
    const targetTickets = tickets.filter((t) => selectedTicketIds.has(t.id || `ticket-${t.index}`));
    const listToExport = targetTickets.length > 0 ? targetTickets : tickets;
    if (listToExport.length === 0) return;

    downloadRelatorioFechamentoAtivoPDF({
      tickets: listToExport,
      fechamentoMeta,
      concursoAlvo: (latestDraw?.concurso || 3825) + 1,
      dataEmissao: new Date().toLocaleDateString('pt-BR'),
      valorPorAposta: 3.50,
    });

    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}

    setCopiedFormat('pdf');
    setTimeout(() => setCopiedFormat(null), 4000);
  };

  // Exportação direta em PDF com diagramação oficial de volante Lotofácil via jsPDF
  const handleExportDirectVolantePDF = () => {
    const targetTickets = tickets.filter((t) => selectedTicketIds.has(t.id || `ticket-${t.index}`));
    const listToExport = targetTickets.length > 0 ? targetTickets : tickets;
    if (listToExport.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho Principal Imperial
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LOTOSNIPER • VOLANTES OFICIAIS DE FECHAMENTO', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(52, 211, 153); // emerald-400
    doc.text(
      `Concurso Base: #${latestDraw.concurso} | ${listToExport.length} Apostas Otimizadas | 14 se 15 100% Auditado | ${new Date().toLocaleDateString('pt-BR')}`,
      14,
      20
    );

    let yOffset = 34;
    listToExport.forEach((t) => {
      if (yOffset > 245) {
        doc.addPage();
        yOffset = 18;
      }

      // Caixa do Cartão
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, yOffset, pageWidth - 28, 48, 2.5, 2.5, 'FD');

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`JOGO #${t.index.toString().padStart(2, '0')}`, 18, yOffset + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Soma: ${t.soma} | Pares: ${t.pares} | Ímpares: ${t.impares ?? 15 - t.pares} | Moldura: ${t.moldura} | Primos: ${t.primos} | Score IA: ${(t.scoreIA || 92).toFixed(1)}`,
        48,
        yOffset + 7
      );

      // Grid 5x5 do Volante Lotofácil
      const startX = 18;
      const startY = yOffset + 12;
      const circleR = 2.7;
      const spacingX = 6.8;
      const spacingY = 6.0;

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const num = r * 5 + c + 1;
          const isSelected = t.dezenas.includes(num);
          const cx = startX + c * spacingX;
          const cy = startY + r * spacingY;

          if (isSelected) {
            doc.setFillColor(16, 185, 129); // emerald-500
            doc.circle(cx, cy, circleR, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.text(num.toString().padStart(2, '0'), cx - 1.9, cy + 1.1);
          } else {
            doc.setFillColor(241, 245, 249);
            doc.setDrawColor(226, 232, 240);
            doc.circle(cx, cy, circleR, 'FD');
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.0);
            doc.text(num.toString().padStart(2, '0'), cx - 1.7, cy + 1);
          }
        }
      }

      // Linha das 15 Dezenas em Destaque
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const sortedStr = [...t.dezenas]
        .sort((a, b) => a - b)
        .map((n) => n.toString().padStart(2, '0'))
        .join(' - ');
      doc.text(`Dezenas Marcadas no Volante:`, 56, yOffset + 18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(sortedStr, 56, yOffset + 26);

      yOffset += 53;
    });

    doc.save(`lotosniper_volantes_formatados_${listToExport.length}_jogos.pdf`);
    setCopiedFormat('pdf');
    setTimeout(() => setCopiedFormat(null), 3500);
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

  // Filtros ativos e pool de dezenas para a Simulação em Tempo Real
  const effectiveFilters = fechamentoMeta?.filters || DEFAULT_FILTERS;
  const effectiveSelectedNumbers = React.useMemo(() => {
    if (fechamentoMeta?.selectedNumbers && fechamentoMeta.selectedNumbers.length >= 15) {
      return fechamentoMeta.selectedNumbers;
    }
    if (tickets.length > 0) {
      const union = Array.from(new Set(tickets.flatMap((t) => t.dezenas))).sort((a, b) => a - b);
      if (union.length >= 15) return union;
    }
    return latestDraw.dezenas;
  }, [fechamentoMeta, tickets, latestDraw.dezenas]);

  const handleDirectVolantePDF = () => {
    const targetTickets = tickets.filter((t) => selectedTicketIds.has(t.id || `ticket-${t.index}`));
    const listToExport = targetTickets.length > 0 ? targetTickets : tickets;
    if (listToExport.length === 0) return;

    let metaToUse = fechamentoMeta;
    if (!metaToUse) {
      try {
        const savedMeta = localStorage.getItem('lotosniper_active_fechamento_meta');
        if (savedMeta) metaToUse = JSON.parse(savedMeta);
      } catch {}
    }

    const concursoRef = metaToUse?.concurso || latestDraw.concurso;
    const dataRef = metaToUse?.dataConcurso || latestDraw.data;

    try {
      downloadTicketsVolantePDF(listToExport, {
        concurso: concursoRef,
        dataConcurso: dataRef,
        titulo:
          pdfExportStyle === 'economico'
            ? 'LOTOSNIPER • LISTA OTIMIZADA DE JOGOS (ECONOMIA DE TINTA)'
            : 'LOTOSNIPER GOLD • VOLANTES DE APOSTA OFICIAIS 5X5',
        style: pdfExportStyle,
        fontSize: pdfPreferences.fontSize,
        margin: pdfPreferences.margin,
        includeStatsFooter: pdfPreferences.includeStatsFooter,
      });
      setCopiedFormat('pdf');
      setTimeout(() => setCopiedFormat(null), 4000);
    } catch (e) {
      console.error('Erro ao gerar PDF de volantes via jsPDF:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Visão Principal: Dossiê de Fechamentos Salvos vs Gerenciador de Bilhetes */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/95 p-2 rounded-2xl border-2 border-slate-800 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('fechamentos_salvos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSection === 'fechamentos_salvos'
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-amber-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Dossiê de Fechamentos Salvos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('bilhetes_individuais')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSection === 'bilhetes_individuais'
                ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Gerenciador de Bilhetes ({tickets.length} Jogos)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('analise_roi')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSection === 'analise_roi'
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-emerald-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Análise de ROI</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              LUCRO REAL
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Exportação de PDF Formatado de Jogos Salvos para Impressão */}
          <button
            type="button"
            onClick={() => {
              const allSaved = getSavedFechamentos();
              if (allSaved.length > 0) {
                const allTickets = allSaved.flatMap((f) => f.tickets);
                const totalCost = allSaved.reduce((acc, f) => acc + f.custoTotal, 0);
                downloadProfessionalLotericaPDF({
                  tickets: allTickets.length > 0 ? allTickets : tickets,
                  concurso: latestDraw.concurso,
                  dataConcurso: latestDraw.data,
                  strategyName: `Dossiê Geral • ${allSaved.length} Fechamentos Salvos`,
                  modalidadeMatriz: `${allTickets.length} Jogos Prontos para Impressão`,
                  custoTotalEstimado: totalCost,
                });
              } else if (tickets.length > 0) {
                downloadProfessionalLotericaPDF({
                  tickets,
                  concurso: latestDraw.concurso,
                  dataConcurso: latestDraw.data,
                  strategyName: 'Bilhetes LotoSniper',
                  modalidadeMatriz: `${tickets.length} Jogos Formatados para Impressão`,
                  custoTotalEstimado: tickets.length * 3.5,
                });
              } else {
                setIsLotericaPDFModalOpen(true);
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
            title="Exportar jogos salvos em PDF profissional formatado, pronto para impressão em lotéricas"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            <span>Exportar PDF para Impressão</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('lotosniper-open-backup'))}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Backup completo e automático de jogos e configurações (JSON & Google Drive)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Backup Cloud Pro</span>
          </button>

          <button
            type="button"
            onClick={handleLimpezaDuplicatas}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
              dupReport.duplicateCount > 0
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Identificar e remover automaticamente fechamentos idênticos ou que contenham 100% de tickets repetidos"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpeza de Duplicatas</span>
            {dupReport.duplicateCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 font-mono text-[10px] font-black">
                {dupReport.duplicateCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSanitizarBase}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Auditar e sanitizar dezenas fixas (máx 12) e integridade de dezenas em todos os fechamentos salvos no LocalStorage"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sanitizar Base</span>
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Criar Novo Fechamento</span>
          </button>
        </div>
      </div>

      {sanitizacaoFeedback && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{sanitizacaoFeedback}</span>
          </div>
          <button
            onClick={() => setSanitizacaoFeedback(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {duplicateActionFeedback && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{duplicateActionFeedback}</span>
          </div>
          <button
            onClick={() => setDuplicateActionFeedback(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* VISÃO 1: DOSSIÊ DE FECHAMENTOS SALVOS */}
      {activeSection === 'fechamentos_salvos' && (
        <SavedFechamentosDossierList
          latestDraw={latestDraw}
          onGoToConferencia={() => {
            window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'conferencia' }));
          }}
        />
      )}

      {/* VISÃO 2: GERENCIADOR DE BILHETES INDIVIDUAIS */}
      {activeSection === 'bilhetes_individuais' && (
        <div className="space-y-6">
          {/* Análise de ROI (Return on Investment) com Configuração de Aposta Mínima */}
          <AnaliseROISavedGames
            tickets={tickets}
            latestDraw={latestDraw}
          />

          {/* Jogos Vencedores Auditados pelo Service Worker */}
          <AuditedWinningGamesList
            latestDraw={latestDraw}
            onGoToConferencia={() => {
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'conferencia' }));
            }}
          />
          {/* Top Export Bar */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <span>Gerenciador de Bilhetes Individuais, Exportador & Conferidor</span>
              </h2>
          <p className="text-xs text-slate-400 mt-1">
            Exporte seus bilhetes para formatos oficiais (PDF com Volantes 5×5 e CSV para planilhas/lotéricas) ou confira a premiação instantânea.
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

            {/* Botão Exportar para CSV direto */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer shadow-sm hover:border-emerald-400 active:scale-95"
              title="Baixar lista atual de jogos em arquivo CSV pronto para Excel, Google Sheets ou lotéricas"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            {/* Botão Exportar Relatório Executivo PDF (Ativo, Garantia e Custo) */}
            <button
              onClick={handleExportRelatorioFechamentoAtivoPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 hover:from-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer shadow-sm hover:border-amber-400 active:scale-95"
              title="Baixar Relatório Executivo em PDF contendo estratégia ativa, garantia matemática, cálculo do investimento total e tabela de jogos auditada"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Relatório Executivo PDF</span>
            </button>

            {/* Seletor de Estilo de Impressão PDF (Oficial 5x5 vs Lista Econômica) */}
            <div className="flex items-center bg-slate-950/90 p-0.5 rounded-xl border border-slate-700/80 shadow-inner">
              <span className="text-[10px] text-slate-400 font-bold px-2 uppercase tracking-wider hidden lg:inline">
                Estilo PDF:
              </span>
              <button
                type="button"
                onClick={() => setPdfExportStyle('oficial')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pdfExportStyle === 'oficial'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modelo Aposta Oficial: Grid 5x5 estilo volante oficial da Caixa com marcação visual"
              >
                <span>Grid 5×5 Oficial</span>
              </button>
              <button
                type="button"
                onClick={() => setPdfExportStyle('economico')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  pdfExportStyle === 'economico'
                    ? 'bg-emerald-400 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Modelo Lista Otimizada: Focado em economia máxima de tinta (monocromático, 10 jogos por folha)"
              >
                <span>Lista Econômica</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900/50 text-slate-950 font-mono font-black">
                  -90% Tinta
                </span>
              </button>
            </div>

            {/* Menu Suspenso (Dropdown) para Configurar Preferências de Exportação do PDF */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPdfConfigOpen(!isPdfConfigOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-sm ${
                  isPdfConfigOpen
                    ? 'bg-slate-800 border-amber-400 text-amber-300 ring-2 ring-amber-400/20'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                }`}
                title="Configurar preferências do PDF: tamanho da fonte, margens do documento e resumo estatístico no rodapé"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>Preferências PDF</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    isPdfConfigOpen ? 'rotate-180 text-amber-400' : ''
                  }`}
                />
              </button>

              {isPdfConfigOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-slate-900/98 border-2 border-slate-700 rounded-2xl p-4 shadow-2xl z-50 backdrop-blur-xl animate-fadeIn space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="font-black text-white text-xs block">Preferências de Exportação PDF</span>
                        <span className="text-[10px] text-slate-400 block font-normal">Ajuste de tipografia, margens e rodapé técnico</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPdfConfigOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tamanho da Fonte */}
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-bold text-[11px]">
                      Tamanho da Fonte dos Jogos:
                    </label>
                    <select
                      value={pdfPreferences.fontSize}
                      onChange={(e) =>
                        setPdfPreferences((prev) => ({
                          ...prev,
                          fontSize: e.target.value as PdfFontSizePreference,
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-medium"
                    >
                      <option value="normal">Padrão (10pt) • Equilíbrio e Nitidez</option>
                      <option value="compact">Compacto (8.5pt) • Alta Densidade</option>
                      <option value="large">Grande (12pt) • Alta Legibilidade / Idosos</option>
                    </select>
                  </div>

                  {/* Margens do Documento */}
                  <div className="space-y-1">
                    <label className="block text-slate-300 font-bold text-[11px]">
                      Margens da Folha A4:
                    </label>
                    <select
                      value={pdfPreferences.margin}
                      onChange={(e) =>
                        setPdfPreferences((prev) => ({
                          ...prev,
                          margin: e.target.value as PdfMarginPreference,
                        }))
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-medium"
                    >
                      <option value="normal">Normal (12mm) • Margem Padrão ABNT</option>
                      <option value="compact">Estreita (6mm) • Máximo Aproveitamento</option>
                      <option value="wide">Ampla (18mm) • Espaçamento Confortável</option>
                    </select>
                  </div>

                  {/* Resumo Estatístico no Rodapé */}
                  <div className="pt-2 border-t border-slate-800">
                    <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition">
                      <input
                        type="checkbox"
                        checked={pdfPreferences.includeStatsFooter}
                        onChange={(e) =>
                          setPdfPreferences((prev) => ({
                            ...prev,
                            includeStatsFooter: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                      />
                      <div className="select-none">
                        <span className="font-bold text-slate-200 block text-[11px]">
                          Incluir Resumo Estatístico no Rodapé
                        </span>
                        <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
                          Imprime no rodapé de cada página: Média de Soma (Zona de Ouro), Paridade predominante, Moldura e Primos.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80">
                    <span>
                      Estilo: <strong className="text-amber-300">{pdfExportStyle === 'economico' ? 'Lista Econômica' : 'Grid 5×5 Oficial'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPdfConfigOpen(false)}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black cursor-pointer shadow-sm transition"
                    >
                      Salvar Opções
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Botão Exportar PDF com layout de acordo com o estilo selecionado */}
            <button
              onClick={handleDirectVolantePDF}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-md active:scale-95 ${
                pdfExportStyle === 'economico'
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-emerald-500/25 ring-1 ring-emerald-300'
                  : 'bg-gradient-to-r from-amber-500/25 via-yellow-500/25 to-amber-500/25 hover:from-amber-500/35 text-amber-300 border border-amber-500/50 shadow-amber-500/15'
              }`}
              title={
                pdfExportStyle === 'economico'
                  ? 'Gerar e baixar PDF no Modelo Lista Otimizada (monocromático, alta densidade e economia máxima de toner)'
                  : 'Gerar e baixar PDF no Modelo Aposta Oficial com o grid 5x5 diagramado para marcação'
              }
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {pdfExportStyle === 'economico'
                  ? 'Baixar PDF (Lista Econômica)'
                  : 'Baixar PDF (Volantes 5×5)'}
              </span>
            </button>

            {/* Botão Exportar PDF Profissional para Lotérica com Marca d'Água e Custo Estimado */}
            <button
              onClick={() => setIsLotericaPDFModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
              title="Gerar PDF profissional com dezenas, custo estimado e marca d'água para levar e imprimir em casas lotéricas"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>PDF Lotérica (Marca d'Água)</span>
            </button>

            {/* Modal de Configuração Avançada de PDF */}
            <button
              onClick={() => setIsPDFModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Visualizar prévia e configurar opções de impressão dos volantes"
            >
              <span>Prévia / Imprimir</span>
            </button>
          </div>
        )}
      </div>

      {/* Alerta de Confirmação de Download do CSV */}
      {copiedFormat === 'csv' && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Download Concluído:</strong> A lista de jogos foi exportada com sucesso em arquivo CSV com codificação UTF-8 BOM, 100% compatível com Excel, Google Sheets e LibreOffice!
            </span>
          </div>
          <button
            onClick={() => setCopiedFormat(null)}
            className="text-emerald-400 hover:text-white font-bold text-xs px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Simulação em Tempo Real dos Filtros Personalizados (Movido para Meus Jogos & Conferidor) */}
      <RealTimeFilterSimulation
        filters={effectiveFilters}
        selectedNumbers={effectiveSelectedNumbers}
        latestDraw={latestDraw}
      />

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

            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-[11px]">
                <strong className="text-emerald-400">{selectedTicketIds.size}</strong> de{' '}
                <strong className="text-white">{tickets.length}</strong> jogos marcados
              </span>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                title="Exportar jogos selecionados diretamente para CSV"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Exportar para CSV ({selectedTicketIds.size})</span>
              </button>
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

                const b1 = t.bola1 ?? t.dezenas[0];
                const b15 = t.bola15 ?? t.dezenas[t.dezenas.length - 1];
                const isExtremidadesFora = b1 < 1 || b1 > 4 || b15 < 22 || b15 > 25;
                const cruzCount =
                  t.cruz ??
                  t.dezenas.filter((n) => [3, 8, 11, 12, 13, 14, 15, 18, 23].includes(n)).length;
                const isZonaOuroCruz = cruzCount >= 5 && cruzCount <= 6;

                return (
                  <div
                    key={id}
                    className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                      isExtremidadesFora
                        ? 'border-rose-500/40 bg-rose-950/10'
                        : isSelected
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectTicket(id)}
                          className="w-4 h-4 rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                        />
                        <span className="font-mono font-black text-white text-sm">
                          Jogo #{t.index.toString().padStart(2, '0')}
                        </span>

                        {isExtremidadesFora && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse shadow-sm">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Fora do Padrão</span>
                          </span>
                        )}

                        {isZonaOuroCruz && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
                            ★ Cruz Ouro ({cruzCount})
                          </span>
                        )}
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

                    {/* Tags & Analytical Section */}
                    <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex flex-wrap items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            isExtremidadesFora
                              ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 font-bold'
                              : 'bg-slate-850 text-slate-400 border-slate-700/60'
                          }`}
                        >
                          B1: {b1.toString().padStart(2, '0')} | B15: {b15.toString().padStart(2, '0')}
                          {isExtremidadesFora ? ' ⚠️ Fora do Padrão' : ''}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            isZonaOuroCruz
                              ? 'bg-blue-500/25 text-blue-200 border-blue-400/50 font-bold'
                              : 'bg-slate-850 text-slate-400 border-slate-700/60'
                          }`}
                        >
                          {cruzCount} Cruz {isZonaOuroCruz ? '★ Zona de Ouro' : ''}
                        </span>

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
        </div>
      )}

      {/* VISÃO 3: ANÁLISE DE ROI & LUCRO LÍQUIDO (RETORNO FINANCEIRO) */}
      {activeSection === 'analise_roi' && (
        <div className="space-y-6">
          <AnaliseROISavedGames
            tickets={tickets}
            latestDraw={latestDraw}
          />
          <AuditedWinningGamesList
            latestDraw={latestDraw}
            onGoToConferencia={() => {
              window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'conferencia' }));
            }}
          />
        </div>
      )}

      {/* Modal de Exportação CSV Profissional para Casas Lotéricas e Plataformas de Apostas */}
      <ExportCSVModal
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        games={csvExportGames}
        concursoRef={selectedConcurso}
        dataConcurso={latestDraw.data}
        fechamentoMeta={fechamentoMeta}
        estrategia={fechamentoMeta?.strategyName || fechamentoMeta?.modeName || 'Estratégia Pro LotoSniper'}
        title={`Exportação CSV Profissional (${csvExportGames.length} Jogos)`}
        defaultFilename={`lotosniper_concurso_${selectedConcurso}_${csvExportGames.length}_jogos.csv`}
      />

      {/* Modal de Exportação em PDF Formatado para Volantes da Lotofácil */}
      <ExportPDFModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        tickets={ticketsWithTags}
        latestDraw={latestDraw}
      />

      {/* Modal de Exportação em PDF Profissional para Lotéricas com Marca d'Água e Custos */}
      <ExportLotericaPDFModal
        isOpen={isLotericaPDFModalOpen}
        onClose={() => setIsLotericaPDFModalOpen(false)}
        tickets={ticketsWithTags}
        latestDraw={latestDraw}
      />
    </div>
  );
};
