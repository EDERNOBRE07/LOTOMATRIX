import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SavedFechamentoPrognostico,
  getSavedFechamentos,
  deleteSavedFechamento,
  deleteMultipleSavedFechamentos,
  clearAllSavedFechamentos,
  getDuplicateFechamentosReport,
  removeDuplicateFechamentos,
  formatTicketsForConferenciaInput,
  FIBONACCI_NUMBERS,
  exportBackupJSON,
  restoreBackupJSON,
  inspectBackupJSONPreview,
  syncWithMySQLHostinger,
} from '../services/savedFechamentosStorage';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { soundService } from '../services/soundAlert';
import { MOLDURA, RECENT_DRAWS } from '../data/lotofacilData';
import { ExportPDFModal } from './ExportPDFModal';
import { ExportLotericaPDFModal } from './ExportLotericaPDFModal';
import { downloadGoldFechamentoPDF, downloadTicketsVolantePDF, VolanteExportStyle } from '../services/goldPdfGenerator';
import { downloadProfessionalLotericaPDF } from '../services/lotericaPdfGenerator';
import { exportCartoesJogosToPdf } from '../services/cartoesJogosPdfGenerator';
import { AuditedWinningGamesList } from './AuditedWinningGamesList';
import {
  FileText,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Upload,
  Flame,
  Zap,
  ShieldCheck,
  Target,
  ArrowRight,
  Printer,
  FileSpreadsheet,
  Bell,
  BellRing,
  Database,
  RefreshCw,
  Edit3,
  RotateCcw,
  Award,
  Filter,
  SlidersHorizontal,
  Tag,
  X,
} from 'lucide-react';
import {
  auditAndNotifySavedGames,
  getPushPermission,
  requestPushPermission,
  isPushEnabledByUser,
  setPushEnabledByUser,
} from '../services/savedGamesAuditorService';

interface SavedFechamentosDossierListProps {
  latestDraw: LotofacilDraw;
  onGoToConferencia?: () => void;
  onSelectTicketsToInspect?: (tickets: GameTicket[]) => void;
}

type QuickListFilter = 'todos' | 'premiados' | 'modalidade';

interface EvaluatedFechamento {
  fechamento: SavedFechamentoPrognostico;
  universoCount: number;
  bestHits: number;
  premiadosCount: number;
  counts: { 15: number; 14: number; 13: number; 12: number; 11: number };
  ticketHitsMap: Map<string, number>;
}

export const SavedFechamentosDossierList: React.FC<SavedFechamentosDossierListProps> = ({
  latestDraw,
  onGoToConferencia,
  onSelectTicketsToInspect,
}) => {
  const [fechamentos, setFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );
  const [expandedDossierId, setExpandedDossierId] = useState<string | null>(null);
  const [expandedTicketsCardId, setExpandedTicketsCardId] = useState<string | null>(() => {
    const list = getSavedFechamentos();
    return list.length > 0 && list.length <= 5 ? list[0].id : null;
  });
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [selectedForPDF, setSelectedForPDF] = useState<SavedFechamentoPrognostico | null>(null);
  const [selectedForLotericaPDF, setSelectedForLotericaPDF] = useState<SavedFechamentoPrognostico | null>(null);
  const [isExportAllMenuOpen, setIsExportAllMenuOpen] = useState<boolean>(false);

  // Backup JSON Import state (seguro: mesclar vs substituir sem travar UI)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackupImport, setPendingBackupImport] = useState<{
    filename: string;
    content: string;
    totalFechamentos: number;
    totalTickets: number;
    dataExportacao?: string;
  } | null>(null);

  // Conferência Rápida Sticky (Oficial vs Simulação Manual)
  const [selectedConcursoNum, setSelectedConcursoNum] = useState<number>(latestDraw.concurso);
  const [isManualSimulation, setIsManualSimulation] = useState<boolean>(false);
  const [isEditingManualDraw, setIsEditingManualDraw] = useState<boolean>(false);
  const [manualConcursoNum, setManualConcursoNum] = useState<number>(latestDraw.concurso);
  const [manualDezenas, setManualDezenas] = useState<number[]>(() =>
    [...(latestDraw.dezenas || [])].sort((a, b) => a - b)
  );
  const [manualInputText, setManualInputText] = useState<string>(() =>
    [...(latestDraw.dezenas || [])]
      .sort((a, b) => a - b)
      .map((n) => n.toString().padStart(2, '0'))
      .join(' ')
  );

  // Filtros rápidos da Relação de Fechamentos
  const [quickFilter, setQuickFilter] = useState<QuickListFilter>('todos');
  const [modalidadeDezenasFilter, setModalidadeDezenasFilter] = useState<number | 'all'>('all');

  // Tags salvas de bilhetes
  const [storedTicketTags, setStoredTicketTags] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem('lotosniper_ticket_tags');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Push / Hostinger MySQL (painel utilitário recolhível para manter foco na relação)
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState<boolean>(false);
  const [pushPerm, setPushPerm] = useState<NotificationPermission>(() => getPushPermission());
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => isPushEnabledByUser());
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false);
  const [mysqlStatus, setMysqlStatus] = useState<{
    connected: boolean;
    database: string;
    user: string;
    site: string;
    totalSaved: number;
    message: string;
  } | null>(null);
  const [isSyncingMysql, setIsSyncingMysql] = useState<boolean>(false);

  // Sincronização de seleção de concurso com latestDraw
  useEffect(() => {
    if (!isManualSimulation) {
      setSelectedConcursoNum(latestDraw.concurso);
      setManualConcursoNum(latestDraw.concurso);
      const sorted = [...(latestDraw.dezenas || [])].sort((a, b) => a - b);
      setManualDezenas(sorted);
      setManualInputText(sorted.map((n) => n.toString().padStart(2, '0')).join(' '));
    }
  }, [latestDraw, isManualSimulation]);

  useEffect(() => {
    syncWithMySQLHostinger()
      .then((st) => setMysqlStatus(st))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handlePerm = () => setPushPerm(getPushPermission());
    const handleConfig = (e: any) => setPushEnabled(Boolean(e.detail));
    window.addEventListener('lotosniper-push-perm-changed', handlePerm);
    window.addEventListener('lotosniper-push-config-changed', handleConfig);
    return () => {
      window.removeEventListener('lotosniper-push-perm-changed', handlePerm);
      window.removeEventListener('lotosniper-push-config-changed', handleConfig);
    };
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const list = getSavedFechamentos();
      setFechamentos(list);
      try {
        const rawTags = localStorage.getItem('lotosniper_ticket_tags');
        if (rawTags) setStoredTicketTags(JSON.parse(rawTags));
      } catch {}
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    window.addEventListener('lotosniper-backup-restored', handleUpdate);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
      window.removeEventListener('lotosniper-backup-restored', handleUpdate);
    };
  }, []);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedFechamentoIds, setSelectedFechamentoIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  const dupReport = useMemo(() => getDuplicateFechamentosReport(), [fechamentos]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 5500);
  };

  // Lista unificada de concursos disponíveis para conferência rápida
  const availableDraws = useMemo(() => {
    return [latestDraw, ...RECENT_DRAWS.filter((d) => d.concurso !== latestDraw.concurso)].sort(
      (a, b) => b.concurso - a.concurso
    );
  }, [latestDraw]);

  const selectedOfficialDraw = useMemo(
    () => availableDraws.find((d) => d.concurso === selectedConcursoNum) || latestDraw,
    [availableDraws, selectedConcursoNum, latestDraw]
  );

  const conferirDezenas = useMemo(() => {
    const raw = isManualSimulation ? manualDezenas : selectedOfficialDraw.dezenas || [];
    return [...raw].filter((n) => n >= 1 && n <= 25).sort((a, b) => a - b);
  }, [isManualSimulation, manualDezenas, selectedOfficialDraw]);

  const conferirDezenasSet = useMemo(() => new Set(conferirDezenas), [conferirDezenas]);

  // Avaliação instantânea de todos os fechamentos contra conferirDezenas
  const { evaluatedList, globalSummary } = useMemo(() => {
    let totalTickets = 0;
    let c15 = 0;
    let c14 = 0;
    let c13 = 0;
    let c12 = 0;
    let c11 = 0;

    const sortedFechamentos = [...fechamentos].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const evaluated: EvaluatedFechamento[] = sortedFechamentos.map((f) => {
      const tickets = Array.isArray(f.tickets) ? f.tickets : [];
      const counts = { 15: 0, 14: 0, 13: 0, 12: 0, 11: 0 };
      const ticketHitsMap = new Map<string, number>();
      let bestHits = 0;
      let premiadosCount = 0;

      tickets.forEach((t, tIdx) => {
        const sortedTicketDez = Array.isArray(t.dezenas)
          ? [...t.dezenas].sort((a, b) => a - b)
          : [];
        const hits =
          conferirDezenas.length === 15 && sortedTicketDez.length === 15
            ? countMatches(sortedTicketDez, conferirDezenas)
            : sortedTicketDez.filter((d) => conferirDezenasSet.has(d)).length;

        const key = `${t.id || 't'}-${tIdx}`;
        ticketHitsMap.set(key, hits);
        totalTickets++;

        if (hits > bestHits) bestHits = hits;
        if (hits >= 11) premiadosCount++;

        if (hits === 15) {
          counts[15]++;
          c15++;
        } else if (hits === 14) {
          counts[14]++;
          c14++;
        } else if (hits === 13) {
          counts[13]++;
          c13++;
        } else if (hits === 12) {
          counts[12]++;
          c12++;
        } else if (hits === 11) {
          counts[11]++;
          c11++;
        }
      });

      return {
        fechamento: f,
        universoCount: Array.isArray(f.universoDezenas) ? f.universoDezenas.length : 15,
        bestHits,
        premiadosCount,
        counts,
        ticketHitsMap,
      };
    });

    return {
      evaluatedList: evaluated,
      globalSummary: {
        totalFechamentos: sortedFechamentos.length,
        totalTickets,
        count15: c15,
        count14: c14,
        count13: c13,
        count12: c12,
        count11: c11,
        totalPremiados: c15 + c14 + c13 + c12 + c11,
      },
    };
  }, [fechamentos, conferirDezenas, conferirDezenasSet]);

  // Fechamentos filtrados pelo filtro rápido do topo
  const filteredEvaluatedList = useMemo(() => {
    return evaluatedList.filter((item) => {
      if (quickFilter === 'premiados' && item.premiadosCount === 0) {
        return false;
      }
      if (quickFilter === 'modalidade') {
        if (modalidadeDezenasFilter === 'all') {
          return item.universoCount >= 16 && item.universoCount <= 21;
        }
        return item.universoCount === modalidadeDezenasFilter;
      }
      return true;
    });
  }, [evaluatedList, quickFilter, modalidadeDezenasFilter]);

  const modalidadeCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (let n = 15; n <= 21; n++) map[n] = 0;
    evaluatedList.forEach((item) => {
      if (item.universoCount >= 15 && item.universoCount <= 21) {
        map[item.universoCount] = (map[item.universoCount] || 0) + 1;
      }
    });
    return map;
  }, [evaluatedList]);

  // Handlers de Edição Manual para Simulação no Painel Superior
  const handleToggleManualDezena = (num: number) => {
    setIsManualSimulation(true);
    setManualDezenas((prev) => {
      let next: number[];
      if (prev.includes(num)) {
        next = prev.filter((n) => n !== num);
      } else if (prev.length < 15) {
        next = [...prev, num].sort((a, b) => a - b);
      } else {
        return prev;
      }
      setManualInputText(next.map((d) => d.toString().padStart(2, '0')).join(' '));
      return next;
    });
  };

  const handleApplyManualInputText = (text: string) => {
    setManualInputText(text);
    const nums = Array.from(
      new Set(
        (text.match(/\d+/g) || [])
          .map((s) => parseInt(s, 10))
          .filter((n) => n >= 1 && n <= 25)
      )
    )
      .slice(0, 15)
      .sort((a, b) => a - b);
    if (nums.length > 0) {
      setIsManualSimulation(true);
      setManualDezenas(nums);
    }
  };

  const handleRestoreOfficialDraw = () => {
    setIsManualSimulation(false);
    setIsEditingManualDraw(false);
    setSelectedConcursoNum(latestDraw.concurso);
    const sorted = [...(latestDraw.dezenas || [])].sort((a, b) => a - b);
    setManualDezenas(sorted);
    setManualInputText(sorted.map((n) => n.toString().padStart(2, '0')).join(' '));
  };

  // Handlers de Backup JSON (Importar com escolha Mesclar / Substituir + Exportar)
  const handleExportBackup = () => {
    try {
      exportBackupJSON();
      soundService.playGoldenZoneSuccessChime();
      showFeedback('Backup completo (.json) exportado com sucesso!');
    } catch {
      showFeedback('Falha ao exportar backup JSON.');
    }
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const preview = inspectBackupJSONPreview(content);
      if (!preview.valid) {
        showFeedback(`Erro ao ler arquivo JSON: ${preview.error}`);
        return;
      }
      setPendingBackupImport({
        filename: file.name,
        content,
        totalFechamentos: preview.totalFechamentos,
        totalTickets: preview.totalTickets,
        dataExportacao: preview.dataExportacao,
      });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmBackupRestore = (mode: 'merge' | 'replace') => {
    if (!pendingBackupImport) return;
    const res = restoreBackupJSON(pendingBackupImport.content, mode);
    if (res.success) {
      const updatedList = getSavedFechamentos();
      setFechamentos(updatedList);
      setPendingBackupImport(null);
      setExpandedTicketsCardId(null);
      setExpandedDossierId(null);
      soundService.playGoldenZoneSuccessChime();
      showFeedback(
        mode === 'replace'
          ? `Backup restaurado (substituição segura): ${res.totalAfter ?? res.count} fechamento(s) e ${res.totalTickets ?? 0} bilhete(s) carregados.`
          : `Backup mesclado com sucesso: +${res.count} fechamento(s) importado(s). Total ativo: ${res.totalAfter ?? updatedList.length} fechamento(s).`
      );
    } else {
      showFeedback(`Erro ao restaurar backup: ${res.error}`);
    }
  };

  // Consolidar / Exportar Todos (TXT / PDF)
  const handleDownloadAllConsolidatedTXT = () => {
    if (fechamentos.length === 0) return;
    const blocks = fechamentos.map((f, idx) => {
      const universoStr = (f.universoDezenas || []).map((n) => n.toString().padStart(2, '0')).join(' ');
      const fixasStr =
        (f.dezenasFixas || []).length > 0
          ? f.dezenasFixas.map((n) => n.toString().padStart(2, '0')).join(' ')
          : 'Nenhuma';
      return [
        '================================================================================',
        `#${(idx + 1).toString().padStart(2, '0')} • ${f.tipoFechamento}`,
        `Modalidade: ${f.modalidadeMatriz} | Concurso Base: #${f.concurso} (${f.dataConcurso || ''})`,
        `Criado em: ${f.dataCriacao} | Jogos: ${f.totalJogos} | Custo: R$ ${(f.custoTotal ?? f.totalJogos * VALOR_APOSTA_LOTOFACIL).toFixed(2)}`,
        `Universo (${(f.universoDezenas || []).length}): ${universoStr}`,
        `Fixas: ${fixasStr}`,
        '--------------------------------------------------------------------------------',
        formatTicketsForConferenciaInput(f.tickets),
      ].join('\n');
    });

    const content = [
      `LOTOSNIPER AI PRO • RELAÇÃO CONSOLIDADA DE FECHAMENTOS SALVOS (${fechamentos.length})`,
      `Exportado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      ...blocks,
    ].join('\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_consolidado_${fechamentos.length}_fechamentos.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportAllMenuOpen(false);
    soundService.playGoldenZoneSuccessChime();
    showFeedback(`Arquivo TXT consolidado com ${fechamentos.length} fechamento(s) baixado com sucesso!`);
  };

  const handleDownloadAllLotericaPDFDirect = () => {
    if (fechamentos.length === 0) return;
    try {
      const allTickets = fechamentos.flatMap((f) => f.tickets || []);
      const totalCost = fechamentos.reduce(
        (acc, f) => acc + (f.custoTotal ?? (f.tickets?.length || 0) * VALOR_APOSTA_LOTOFACIL),
        0
      );
      downloadProfessionalLotericaPDF({
        tickets: allTickets,
        concurso: fechamentos[0]?.concurso || latestDraw.concurso,
        strategyName: `Carteira Completa (${fechamentos.length} Fechamentos Salvos)`,
        modalidadeMatriz: `${allTickets.length} Apostas Consolidadas`,
        custoTotalEstimado: totalCost,
        watermarkText: 'LOTO SNIPER • COMPROVANTE OFICIAL DE JOGOS • USO LOTÉRICO',
      });
      setIsExportAllMenuOpen(false);
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`PDF consolidado com todos os ${allTickets.length} jogos salvos gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF consolidado.');
    }
  };

  // Ações de Seleção e Exclusão
  const handleToggleSelectOne = (id: string) => {
    setSelectedFechamentoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedFechamentoIds.size === fechamentos.length && fechamentos.length > 0) {
      setSelectedFechamentoIds(new Set());
    } else {
      setSelectedFechamentoIds(new Set(fechamentos.map((f) => f.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedFechamentoIds(new Set());
    setConfirmBulkDelete(false);
  };

  const handleExecuteBulkDelete = () => {
    if (selectedFechamentoIds.size === 0) return;
    const idsToDelete = Array.from(selectedFechamentoIds);
    const updated = deleteMultipleSavedFechamentos(idsToDelete);
    setFechamentos(updated);
    setSelectedFechamentoIds(new Set());
    setConfirmBulkDelete(false);
    try {
      soundService.playFilterClick();
    } catch {}
    showFeedback(`${idsToDelete.length} fechamento(s) excluído(s) com sucesso.`);
  };

  const handleDelete = (id: string, name: string) => {
    const updated = deleteSavedFechamento(id);
    setFechamentos(updated);
    setConfirmDeleteId(null);
    setSelectedFechamentoIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    try {
      soundService.playFilterClick();
    } catch {}
    showFeedback(`Fechamento "${name}" excluído.`);
  };

  const handleClearAll = () => {
    const count = fechamentos.length;
    clearAllSavedFechamentos();
    setFechamentos([]);
    setSelectedFechamentoIds(new Set());
    setConfirmBulkDelete(false);
    setConfirmClearAll(false);
    try {
      soundService.playFilterClick();
    } catch {}
    showFeedback(`Todos os ${count} fechamentos foram removidos.`);
  };

  const handleLoadInConferencia = (fechamento: SavedFechamentoPrognostico) => {
    const formattedText = formatTicketsForConferenciaInput(fechamento.tickets);
    if (!formattedText) {
      showFeedback('Este fechamento não possui bilhetes válidos para conferir.');
      return;
    }

    if (onSelectTicketsToInspect) {
      onSelectTicketsToInspect(fechamento.tickets);
    }

    try {
      localStorage.setItem(
        'lotosniper_pending_conference_games',
        JSON.stringify({
          text: formattedText,
          tickets: fechamento.tickets,
          name: fechamento.tipoFechamento,
          concurso: fechamento.concurso,
          timestamp: Date.now(),
        })
      );
    } catch {}

    window.dispatchEvent(
      new CustomEvent('lotosniper-load-conference-games', {
        detail: {
          text: formattedText,
          tickets: fechamento.tickets,
          name: fechamento.tipoFechamento,
          concurso: fechamento.concurso,
        },
      })
    );

    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'conferencia' }));
    soundService.playGoldenZoneSuccessChime();
    onGoToConferencia?.();
  };

  const handleDownloadTXT = (f: SavedFechamentoPrognostico) => {
    const headerLines = [
      '================================================================================',
      'LOTOSNIPER - DOSSIÊ TÉCNICO DE FECHAMENTO & PROGNÓSTICO',
      '================================================================================',
      `• Tipo de Fechamento: ${f.tipoFechamento}`,
      `• Modalidade / Matriz: ${f.modalidadeMatriz}`,
      `• Universo de Dezenas (${(f.universoDezenas || []).length} números): ${(f.universoDezenas || []).map((n) => n.toString().padStart(2, '0')).join(' ')}`,
      `• Dezenas Fixas: ${(f.dezenasFixas || []).length > 0 ? f.dezenasFixas.map((n) => n.toString().padStart(2, '0')).join(' ') : 'Nenhuma dezena fixa'}`,
      `• Dezenas Excluídas: ${(f.dezenasExcluidas || []).length > 0 ? f.dezenasExcluidas.map((n) => n.toString().padStart(2, '0')).join(' ') : 'Nenhuma dezena excluída'}`,
      '',
      '--------------------------------------------------------------------------------',
      'FILTROS APLICADOS',
      '--------------------------------------------------------------------------------',
      `• Faixa de Soma: ${f.faixaSoma.min} a ${f.faixaSoma.max} (Zona de Ouro: ${f.faixaSoma.zonaOuro || '190 a 210'})`,
      `• Paridade: ${f.paridade.minPares} a ${f.paridade.maxPares} Pares`,
      `• Sequência Máxima Consecutiva: Até ${f.maxConsecutivas} dezenas`,
      `• Repetidas (#${f.repetidas.concursoRef || f.concurso}): ${f.repetidas.min} a ${f.repetidas.max}`,
      `• Moldura: ${f.moldura.min} a ${f.moldura.max} | Primos: ${f.primos.min} a ${f.primos.max} | Fibonacci: ${f.fibonacci.min} a ${f.fibonacci.max}`,
      `• Auditoria de Anomalias: ${f.auditoriaAnomalias}`,
      '',
      '================================================================================',
      `BILHETES GERADOS (${f.tickets.length} JOGOS)`,
      '================================================================================',
      formatTicketsForConferenciaInput(f.tickets),
    ].join('\n');

    const blob = new Blob([headerLines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_fechamento_${f.concurso}_${f.totalJogos}_jogos.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback('Arquivo TXT do fechamento baixado com sucesso!');
  };

  const handleDownloadPdfDirect = (f: SavedFechamentoPrognostico) => {
    try {
      downloadGoldFechamentoPDF(f);
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`PDF "${f.tipoFechamento}" gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF.');
    }
  };

  const handleDownloadVolantesStyle = (f: SavedFechamentoPrognostico, style: VolanteExportStyle) => {
    try {
      downloadTicketsVolantePDF(f.tickets, {
        concurso: f.concurso,
        dataConcurso: f.dataConcurso,
        titulo:
          style === 'economico'
            ? `LOTOSNIPER • LISTA OTIMIZADA DE JOGOS (${f.tipoFechamento})`
            : `LOTOSNIPER GOLD • VOLANTES DE APOSTA 5X5 (${f.tipoFechamento})`,
        style,
      });
      soundService.playGoldenZoneSuccessChime();
      showFeedback(
        style === 'economico'
          ? `PDF Lista Econômica gerado para "${f.tipoFechamento}".`
          : `PDF Volantes 5×5 gerado para "${f.tipoFechamento}".`
      );
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF de volantes.');
    }
  };

  const handleDownloadCartoesOficiaisPDF = (f: SavedFechamentoPrognostico) => {
    try {
      exportCartoesJogosToPdf({
        tickets: f.tickets,
        latestDraw,
        fechamentoNome: f.tipoFechamento,
      });
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`Cartões de Jogos (grid 5×5) gerados para "${f.tipoFechamento}".`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar cartões PDF.');
    }
  };

  const handleDownloadCSVDirect = (f: SavedFechamentoPrognostico) => {
    try {
      const headers = [
        'Jogo',
        'Dezenas Formatadas',
        'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15',
        'Pares',
        'Ímpares',
        'Primos',
        'Moldura',
        'Fibonacci',
        'Soma Total',
        'Score IA',
        'Fechamento',
        'Concurso Base',
        'Data Criacao',
      ];

      const rows = f.tickets.map((t, idx) => {
        const sorted = [...t.dezenas].sort((a, b) => a - b);
        const dCols = sorted.map((n) => n.toString().padStart(2, '0'));
        const formatted = dCols.join(' - ');
        return [
          `"Jogo ${(t.index ?? idx + 1).toString().padStart(2, '0')}"`,
          `"${formatted}"`,
          ...dCols,
          t.pares ?? sorted.filter((n) => n % 2 === 0).length,
          t.impares ?? sorted.filter((n) => n % 2 !== 0).length,
          t.primos ?? sorted.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length,
          t.moldura ?? sorted.filter((n) => MOLDURA.includes(n)).length,
          t.fibonacci ?? sorted.filter((n) => FIBONACCI_NUMBERS.includes(n)).length,
          t.soma ?? sorted.reduce((a, b) => a + b, 0),
          `"${(t.scoreIA || 92).toFixed(1)}"`,
          `"${f.tipoFechamento}"`,
          f.concurso,
          `"${f.dataCriacao || ''}"`,
        ].join(';');
      });

      const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lotosniper_fechamento_${f.concurso}_${f.totalJogos}_jogos.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`Arquivo CSV com ${f.totalJogos} jogos baixado com sucesso!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar CSV.');
    }
  };

  const handleManualMySQLSync = async () => {
    setIsSyncingMysql(true);
    try {
      const res = await syncWithMySQLHostinger();
      setMysqlStatus(res);
      setFechamentos(getSavedFechamentos());
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`Banco MySQL (${res.database}) sincronizado! ${res.totalSaved} fechamento(s) ativo(s).`);
    } catch {
      showFeedback('Falha na sincronização com o banco Hostinger MySQL.');
    } finally {
      setIsSyncingMysql(false);
    }
  };

  const handleTogglePush = () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    setPushEnabledByUser(next);
    showFeedback(next ? 'Notificações push em 2º plano ativadas.' : 'Notificações push desativadas.');
  };

  const handleTestPush = async () => {
    setIsTestingPush(true);
    try {
      if (pushPerm !== 'granted') {
        const p = await requestPushPermission();
        setPushPerm(p);
        if (p !== 'granted') {
          showFeedback('Permissão de notificações não concedida no navegador.');
          setIsTestingPush(false);
          return;
        }
      }
      const res = await auditAndNotifySavedGames(latestDraw, true);
      if (res) {
        showFeedback(
          `Auditoria concluída: ${res.totalBilhetesAvaliados} bilhetes avaliados, ${res.totalWinningTickets} premiado(s) (Máx: ${res.maxHits} pts).`
        );
      } else {
        showFeedback('Auditoria executada e notificação push enviada via Service Worker.');
      }
    } catch {
      showFeedback('Erro ao disparar notificação push de teste.');
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
          >
            Fechar
          </button>
        </div>
      )}

      {/* CABEÇALHO & BARRA DE FERRAMENTAS DE BACKUP E EXPORTAÇÃO CONSOLIDADA */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Relação de Fechamentos Salvos & Conferência
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono tabular-nums">
                <span>{fechamentos.length} fechamento(s) salvo(s)</span>
                <span aria-hidden="true">·</span>
                <span>{globalSummary.totalTickets} bilhete(s)</span>
                <span aria-hidden="true">·</span>
                <span>Ordenado do mais recente para o mais antigo</span>
              </div>
            </div>
          </div>

          {/* Barra de Ferramentas Destacada (Restaurar JSON, Exportar JSON, Consolidar Todos) */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileSelected}
              accept=".json,application/json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-sky-500/20 whitespace-nowrap shrink-0"
              title="Restaurar fechamentos a partir de um arquivo .json de backup do LotoSniper"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restaurar Backup (Importar JSON)</span>
            </button>

            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Exportar todos os fechamentos salvos para um arquivo .json no padrão oficial LotoSniper"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Exportar Backup (.JSON)</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsExportAllMenuOpen((prev) => !prev)}
                disabled={fechamentos.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
                title="Consolidar e exportar todos os fechamentos salvos em TXT ou PDF"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Consolidar / Exportar Todos (TXT / PDF)</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {isExportAllMenuOpen && fechamentos.length > 0 && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-2xl z-30 space-y-1">
                  <button
                    type="button"
                    onClick={handleDownloadAllConsolidatedTXT}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Baixar Todos Consolidados (.TXT)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadAllLotericaPDFDirect}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-emerald-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Baixar Todos Consolidados (.PDF)</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsIntegrationsOpen((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              title="Configurar Push em 2º Plano e Sincronização MySQL Hostinger"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Push & MySQL</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Novo Fechamento</span>
            </button>
          </div>
        </div>

        {/* Barra de Confirmação Segura de Importação JSON (Mesclar vs Substituir) */}
        {pendingBackupImport && (
          <div className="bg-slate-950/90 border border-sky-500/50 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-sky-300 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Arquivo pronto para restauração: {pendingBackupImport.filename}</span>
              </div>
              <div className="text-xs text-slate-300 font-mono tabular-nums">
                {pendingBackupImport.totalFechamentos} fechamento(s) · {pendingBackupImport.totalTickets} bilhete(s)
                {pendingBackupImport.dataExportacao ? ` · Exportado em ${pendingBackupImport.dataExportacao}` : ''}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleConfirmBackupRestore('merge')}
                className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer whitespace-nowrap"
              >
                Mesclar com Atuais
              </button>
              <button
                type="button"
                onClick={() => handleConfirmBackupRestore('replace')}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer whitespace-nowrap"
              >
                Substituir Lista Atual
              </button>
              <button
                type="button"
                onClick={() => setPendingBackupImport(null)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Painel Recolhível: Service Worker Push & MySQL Hostinger */}
        {isIntegrationsOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-emerald-400" />
                  <span>Push Service Worker ({pushPerm === 'granted' ? 'Ativo' : pushPerm === 'denied' ? 'Bloqueado' : 'Pendente'})</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Audita seus jogos em segundo plano quando um novo concurso é apurado.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={handleTogglePush}
                    className="rounded border-slate-700 text-emerald-500"
                  />
                  <span>Auto</span>
                </label>
                <button
                  type="button"
                  onClick={handleTestPush}
                  disabled={isTestingPush}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer disabled:opacity-50"
                >
                  {isTestingPush ? 'Enviando...' : 'Testar Push Agora'}
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span>MySQL Hostinger · {mysqlStatus?.database || 'u376010332_LotoSniper'}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {mysqlStatus?.connected ? 'Conectado ao servidor remoto' : 'Cache local pronto para sincronização'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualMySQLSync}
                disabled={isSyncingMysql}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMysql ? 'animate-spin' : ''}`} />
                <span>{isSyncingMysql ? 'Sincronizando...' : 'Sincronizar MySQL'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PAINEL SUPERIOR DE CONFERÊNCIA RÁPIDA (STICKY / DESTACADO) */}
      <div className="sticky top-2 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-black text-white uppercase tracking-wide">
                Conferência Rápida
              </span>
            </div>

            {isManualSimulation ? (
              <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                <span>Simulação Manual · Concurso #{manualConcursoNum}</span>
                <button
                  type="button"
                  onClick={handleRestoreOfficialDraw}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Usar Oficial Caixa</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedConcursoNum}
                  onChange={(e) => setSelectedConcursoNum(parseInt(e.target.value, 10))}
                  className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-mono cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  {availableDraws.map((d) => (
                    <option key={d.concurso} value={d.concurso}>
                      Concurso #{d.concurso} ({d.data}){d.concurso === latestDraw.concurso ? ' · Oficial Caixa' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsEditingManualDraw((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isEditingManualDraw
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingManualDraw ? 'Fechar Edição' : 'Editar / Simular Dezenas'}</span>
            </button>
          </div>

          {/* 15 Dezenas do Resultado Ativo */}
          <div className="flex flex-wrap items-center gap-1 font-mono tabular-nums">
            {conferirDezenas.length === 0 ? (
              <span className="text-xs text-slate-400">Selecione 15 dezenas para conferir</span>
            ) : (
              conferirDezenas.map((num) => (
                <span
                  key={num}
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-black ${
                    isManualSimulation
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {num.toString().padStart(2, '0')}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Editor Manual de Concurso / Dezenas para Simulação */}
        {isEditingManualDraw && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 font-semibold whitespace-nowrap">Nº Concurso:</label>
                <input
                  type="number"
                  value={manualConcursoNum}
                  onChange={(e) => {
                    setManualConcursoNum(parseInt(e.target.value, 10) || latestDraw.concurso);
                    setIsManualSimulation(true);
                  }}
                  className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <label className="text-slate-400 font-semibold whitespace-nowrap">Digitar 15 dezenas:</label>
                <input
                  type="text"
                  value={manualInputText}
                  onChange={(e) => handleApplyManualInputText(e.target.value)}
                  placeholder="Ex: 01 02 04 05 06 10 11 13 15 16 18 20 21 22 23"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <span className="text-[11px] font-mono text-amber-300 whitespace-nowrap tabular-nums">
                {manualDezenas.length}/15 marcadas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
                const selected = manualDezenas.includes(num);
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleToggleManualDezena(num)}
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
                      selected
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    {num.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards de Resumo Instantâneo da Conferência */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono tabular-nums">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 block">Fechamentos Salvos</span>
            <strong className="text-base font-black text-white">{globalSummary.totalFechamentos}</strong>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-[10px] text-slate-400 block">Bilhetes Avaliados</span>
            <strong className="text-base font-black text-sky-400">{globalSummary.totalTickets}</strong>
          </div>
          <div className={`rounded-xl px-3 py-2 border ${globalSummary.count11 > 0 ? 'bg-slate-800/80 border-emerald-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
            <span className="text-[10px] text-slate-400 block">11 Pontos</span>
            <strong className={`text-base font-black ${globalSummary.count11 > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
              {globalSummary.count11}
            </strong>
          </div>
          <div className={`rounded-xl px-3 py-2 border ${globalSummary.count12 > 0 ? 'bg-slate-800/80 border-emerald-500/40' : 'bg-slate-950/60 border-slate-800'}`}>
            <span className="text-[10px] text-slate-400 block">12 Pontos</span>
            <strong className={`text-base font-black ${globalSummary.count12 > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
              {globalSummary.count12}
            </strong>
          </div>
          <div className={`rounded-xl px-3 py-2 border ${globalSummary.count13 > 0 ? 'bg-emerald-950/40 border-emerald-500/50' : 'bg-slate-950/60 border-slate-800'}`}>
            <span className="text-[10px] text-slate-400 block">13 Pontos</span>
            <strong className={`text-base font-black ${globalSummary.count13 > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {globalSummary.count13}
            </strong>
          </div>
          <div className={`rounded-xl px-3 py-2 border ${globalSummary.count14 > 0 ? 'bg-amber-950/40 border-amber-500/60' : 'bg-slate-950/60 border-slate-800'}`}>
            <span className="text-[10px] text-slate-400 block">14 Pontos</span>
            <strong className={`text-base font-black ${globalSummary.count14 > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
              {globalSummary.count14}
            </strong>
          </div>
          <div className={`rounded-xl px-3 py-2 border ${globalSummary.count15 > 0 ? 'bg-amber-500/20 border-amber-400' : 'bg-slate-950/60 border-slate-800'}`}>
            <span className="text-[10px] text-slate-400 block">15 Pontos</span>
            <strong className={`text-base font-black ${globalSummary.count15 > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
              {globalSummary.count15}
            </strong>
          </div>
        </div>
      </div>

      {/* Diagnóstico de Duplicatas */}
      {dupReport.duplicateCount > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-slate-200">
              <strong className="text-amber-300">
                {dupReport.duplicateCount} fechamento(s) idêntico(s) detectado(s)
              </strong>{' '}
              ({dupReport.redundantTicketsCount} bilhetes repetidos).
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const res = removeDuplicateFechamentos();
              setFechamentos(getSavedFechamentos());
              soundService.playGoldenZoneSuccessChime();
              showFeedback(`Removidos ${res.removedCount} fechamentos duplicados.`);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Duplicatas ({dupReport.duplicateCount})</span>
          </button>
        </div>
      )}

      {/* Lista de Jogos Vencedores Auditados pelo Service Worker */}
      <AuditedWinningGamesList
        latestDraw={latestDraw}
        onGoToConferencia={onGoToConferencia}
      />

      {/* FILTROS RÁPIDOS NO TOPO DA RELAÇÃO & CONTROLES DE LOTE */}
      {fechamentos.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filtro Rápido */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Filtro Rápido:</span>
              </span>

              <button
                type="button"
                onClick={() => setQuickFilter('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  quickFilter === 'todos'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Todos os Fechamentos ({evaluatedList.length})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('premiados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  quickFilter === 'premiados'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                }`}
              >
                Apenas Premiados (11+ pts) ({evaluatedList.filter((i) => i.premiadosCount > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setQuickFilter('modalidade')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  quickFilter === 'modalidade'
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-800 text-sky-300 hover:bg-slate-700'
                }`}
              >
                Por Modalidade (16 a 21 Dezenas)
              </button>
            </div>

            {/* Seleção e Exclusão em Massa */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedFechamentoIds.size === fechamentos.length && fechamentos.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 text-rose-500 cursor-pointer accent-rose-500"
                />
                <span>Selecionar Todos</span>
              </label>

              {selectedFechamentoIds.size > 0 && (
                confirmBulkDelete ? (
                  <div className="flex items-center gap-1.5 bg-rose-950/90 px-2.5 py-1 rounded-lg border border-rose-500/60">
                    <span className="text-rose-200 font-bold">Excluir {selectedFechamentoIds.size}?</span>
                    <button
                      type="button"
                      onClick={handleExecuteBulkDelete}
                      className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-black cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold cursor-pointer"
                  >
                    Excluir Selecionados ({selectedFechamentoIds.size})
                  </button>
                )
              )}

              {fechamentos.length > 1 && (
                confirmClearAll ? (
                  <div className="flex items-center gap-1.5 bg-rose-950/90 px-2.5 py-1 rounded-lg border border-rose-500/60">
                    <span className="text-rose-200 font-bold">Limpar tudo?</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-0.5 rounded bg-rose-500 text-slate-950 font-black cursor-pointer"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(true)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold cursor-pointer"
                  >
                    Limpar Histórico
                  </button>
                )
              )}
            </div>
          </div>

          {/* Seletor de Dezenas quando Filtro por Modalidade estiver ativo */}
          {quickFilter === 'modalidade' && (
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModalidadeDezenasFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                  modalidadeDezenasFilter === 'all'
                    ? 'bg-sky-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todas (16–21 Dez)
              </button>
              {[16, 17, 18, 19, 20, 21].map((dezCount) => (
                <button
                  key={dezCount}
                  type="button"
                  onClick={() => setModalidadeDezenasFilter(dezCount)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                    modalidadeDezenasFilter === dezCount
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {dezCount} Dezenas ({modalidadeCounts[dezCount] || 0})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RELAÇÃO CLÁSSICA DE FECHAMENTOS SALVOS (ACCORDION / DRAWER) */}
      {fechamentos.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum Fechamento Salvo no Momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gere uma matriz no Estúdio de Fechamentos ou clique em <strong>Restaurar Backup (Importar JSON)</strong> acima para carregar fechamentos salvos anteriormente.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              Restaurar Backup (.JSON)
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer"
            >
              <span>Criar Fechamento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : filteredEvaluatedList.length === 0 ? (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <Award className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            Nenhum fechamento encontrado para o filtro selecionado
          </h3>
          <button
            type="button"
            onClick={() => {
              setQuickFilter('todos');
              setModalidadeDezenasFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer"
          >
            Mostrar Todos os Fechamentos ({fechamentos.length})
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvaluatedList.map((item, idx) => {
            const { fechamento: f, bestHits, premiadosCount, counts, ticketHitsMap } = item;
            const isDossierExpanded = expandedDossierId === f.id;
            const isTicketsExpanded = expandedTicketsCardId === f.id;
            const isSelected = selectedFechamentoIds.has(f.id);
            const universo = Array.isArray(f.universoDezenas) ? f.universoDezenas : [];
            const fixas = Array.isArray(f.dezenasFixas) ? f.dezenasFixas : [];
            const fixasSet = new Set(fixas);
            const tickets = Array.isArray(f.tickets) ? f.tickets : [];
            const totalJogos = f.totalJogos || tickets.length;
            const custoTotal = f.custoTotal ?? totalJogos * VALOR_APOSTA_LOTOFACIL;

            return (
              <div
                key={f.id}
                className={`bg-slate-900/90 rounded-2xl border transition-colors shadow-xl ${
                  isSelected
                    ? 'border-rose-500/70 bg-rose-950/15'
                    : bestHits >= 14
                    ? 'border-amber-500/60'
                    : premiadosCount > 0
                    ? 'border-emerald-500/40'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Cabeçalho Estruturado do Card */}
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(f.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 text-rose-500 cursor-pointer accent-rose-500 shrink-0"
                        title="Selecionar fechamento"
                      />

                      <span className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 font-mono font-black text-xs shrink-0 tabular-nums">
                        #{(idx + 1).toString().padStart(2, '0')}
                      </span>

                      <div className="space-y-1.5 min-w-0">
                        {/* Cabeçalho: tipoFechamento, dataCriacao, concurso, totalJogos, custoTotal */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {String(f.tipoFechamento || 'Fechamento Combinatório').replace(/^⚡\s*/, '')}
                          </h3>
                          {premiadosCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-black tabular-nums">
                              {premiadosCount} premiado(s) · Máx {bestHits} pts
                            </span>
                          )}
                        </div>

                        {/* Metadados principais em tipografia limpa tabular */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-slate-300">
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{f.dataCriacao || 'Data não registrada'}</span>
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span>
                            Concurso Ref: <strong className="text-white">#{f.concurso || latestDraw.concurso}</strong>
                            {f.dataConcurso ? ` (${f.dataConcurso})` : ''}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-emerald-400 font-bold">
                            {totalJogos} jogos
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-amber-300 font-bold">
                            R$ {custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Subtítulo Técnico: modalidadeMatriz + resumo dos filtros */}
                        <div className="text-xs text-slate-300 space-y-1">
                          <div className="font-semibold text-emerald-400">
                            {f.modalidadeMatriz || `${universo.length} Dezenas • Matriz Pro`}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400 leading-relaxed">
                            Soma {f.faixaSoma?.min ?? 180}–{f.faixaSoma?.max ?? 215} · Paridade{' '}
                            {f.paridade?.minPares ?? 6}–{f.paridade?.maxPares ?? 9}P · Moldura{' '}
                            {f.moldura?.min ?? 8}–{f.moldura?.max ?? 11} · Primos{' '}
                            {f.primos?.min ?? 4}–{f.primos?.max ?? 7} · Fibonacci{' '}
                            {f.fibonacci?.min ?? 3}–{f.fibonacci?.max ?? 6} · Repetidas{' '}
                            {f.repetidas?.min ?? 8}–{f.repetidas?.max ?? 10}
                          </div>
                        </div>

                        {/* Badges de Universo de Dezenas + Destaque Âmbar/Ouro para Fixas */}
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-mono text-slate-400 mr-1">
                            Universo ({universo.length}):
                          </span>
                          {universo.map((num) => {
                            const isFixa = fixasSet.has(num);
                            return (
                              <span
                                key={num}
                                title={isFixa ? `Dezena Fixa ${num.toString().padStart(2, '0')}` : undefined}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-mono text-[11px] font-bold ${
                                  isFixa
                                    ? 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-300'
                                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                                }`}
                              >
                                {num.toString().padStart(2, '0')}
                              </span>
                            );
                          })}
                          {fixas.length > 0 && (
                            <span className="text-[11px] font-mono text-amber-300 font-bold ml-1">
                              Fixas ({fixas.length}): {fixas.map((d) => d.toString().padStart(2, '0')).join(' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações Individuais do Fechamento */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedTicketsCardId(isTicketsExpanded ? null : f.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                          isTicketsExpanded
                            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {isTicketsExpanded
                            ? `Recolher Bilhetes (${tickets.length})`
                            : `Ver/Expandir Bilhetes (${tickets.length})`}
                        </span>
                        {isTicketsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadInConferencia(f)}
                        className="px-3 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        title="Carregar todos os bilhetes deste fechamento no Conferidor Oficial"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        <span>Conferir com Concurso Atual</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadTXT(f)}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                        title="Exportar fechamento em TXT"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-400" />
                        <span>TXT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedForLotericaPDF(f)}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
                        title="Exportar PDF Lotérica com marca d'água e custo estimado"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundService.playGoldenZoneSuccessChime();
                          setSelectedForPDF(f);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                        title="Pré-visualizar e Imprimir Volantes Oficiais 5x5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir Volantes</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedDossierId(isDossierExpanded ? null : f.id)}
                        className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                        title="Exibir/ocultar dossiê técnico e opções extras de exportação"
                      >
                        {isDossierExpanded ? 'Ocultar Dossiê' : 'Dossiê'}
                      </button>

                      {confirmDeleteId === f.id ? (
                        <div className="flex items-center gap-1 bg-rose-950/90 p-1 rounded-xl border border-rose-500/60">
                          <button
                            type="button"
                            onClick={() => handleDelete(f.id, f.tipoFechamento)}
                            className="px-2 py-1 rounded-lg bg-rose-500 text-slate-950 font-black text-[11px] cursor-pointer"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] cursor-pointer"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(f.id)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                          title="Excluir Fechamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resumo de faixas deste fechamento quando houver acertos >= 11 */}
                  {premiadosCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono tabular-nums text-slate-300">
                      <span className="text-emerald-400 font-bold">Desempenho no Concurso Ativo:</span>
                      {counts[15] > 0 && <span className="text-amber-300 font-black">{counts[15]}x 15 pts</span>}
                      {counts[14] > 0 && <span className="text-amber-300 font-bold">{counts[14]}x 14 pts</span>}
                      {counts[13] > 0 && <span className="text-emerald-300 font-bold">{counts[13]}x 13 pts</span>}
                      {counts[12] > 0 && <span className="text-slate-200">{counts[12]}x 12 pts</span>}
                      {counts[11] > 0 && <span className="text-slate-300">{counts[11]}x 11 pts</span>}
                    </div>
                  )}
                </div>

                {/* Drawer 1: Dossiê Técnico Detalhado & Exportações Extras */}
                {isDossierExpanded && (
                  <div className="px-4 sm:px-5 py-4 border-t border-slate-800 bg-slate-950/60 space-y-3 text-xs font-mono">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-300">
                      <div>
                        <strong className="text-amber-300 block mb-1">1. Estratégia & Fixas</strong>
                        <div>Fixas: {fixas.length > 0 ? fixas.map((d) => d.toString().padStart(2, '0')).join(' ') : 'Nenhuma'}</div>
                        <div>
                          Excluídas:{' '}
                          {(f.dezenasExcluidas || []).length > 0
                            ? f.dezenasExcluidas.map((d) => d.toString().padStart(2, '0')).join(' ')
                            : 'Nenhuma'}
                        </div>
                      </div>
                      <div>
                        <strong className="text-cyan-300 block mb-1">2. Restrições Canônicas</strong>
                        <div>Soma: {f.faixaSoma?.min ?? 180} a {f.faixaSoma?.max ?? 215}</div>
                        <div>Paridade: {f.paridade?.minPares ?? 6} a {f.paridade?.maxPares ?? 9} Pares</div>
                        <div>Consecutivas: até {f.maxConsecutivas ?? 5}</div>
                      </div>
                      <div>
                        <strong className="text-emerald-300 block mb-1">3. Auditoria & Filtros Avançados</strong>
                        <div>Repetidas (#{f.repetidas?.concursoRef || f.concurso}): {f.repetidas?.min ?? 8}–{f.repetidas?.max ?? 10}</div>
                        <div>Moldura: {f.moldura?.min ?? 8}–{f.moldura?.max ?? 11} | Primos: {f.primos?.min ?? 4}–{f.primos?.max ?? 7}</div>
                        <div className="text-slate-400">{f.auditoriaAnomalias}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleDownloadVolantesStyle(f, 'oficial')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
                      >
                        Baixar Volante 5×5 (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadVolantesStyle(f, 'economico')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-bold cursor-pointer"
                      >
                        Baixar Lista Econômica (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCartoesOficiaisPDF(f)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold cursor-pointer"
                      >
                        Imprimir Cartões 4/folha (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdfDirect(f)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold cursor-pointer"
                      >
                        Dossiê Gold (PDF)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCSVDirect(f)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Exportar CSV</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Drawer 2: Expansão Suave dos Bilhetes (Tickets) em Grid Responsivo */}
                {isTicketsExpanded && (
                  <div className="px-4 sm:px-5 py-4 border-t border-slate-800 bg-slate-950/75 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-slate-300 font-bold">
                        Bilhetes do Fechamento ({tickets.length} apostas · 15 dezenas cada)
                      </span>
                      <span className="text-slate-400">
                        Verde esmeralda = dezena sorteada no concurso conferido
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {tickets.map((t, tIdx) => {
                        const dezenas = Array.isArray(t.dezenas)
                          ? [...t.dezenas].sort((a, b) => a - b)
                          : [];
                        const hitsKey = `${t.id || 't'}-${tIdx}`;
                        const hits = ticketHitsMap.get(hitsKey) ?? dezenas.filter((n) => conferirDezenasSet.has(n)).length;
                        const soma = t.soma ?? dezenas.reduce((a, b) => a + b, 0);
                        const pares = t.pares ?? dezenas.filter((n) => n % 2 === 0).length;
                        const impares = t.impares ?? 15 - pares;
                        const primos =
                          t.primos ??
                          dezenas.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
                        const moldura = t.moldura ?? dezenas.filter((n) => MOLDURA.includes(n)).length;
                        const scoreIA = t.scoreIA ?? 92;
                        const ticketId = t.id || `ticket-${t.index ?? tIdx + 1}`;
                        const mergedTags = Array.from(
                          new Set([...(t.tags || []), ...(storedTicketTags[ticketId] || [])])
                        );

                        return (
                          <div
                            key={`${ticketId}-${tIdx}`}
                            className={`p-3 rounded-xl border space-y-2.5 transition ${
                              hits >= 14
                                ? 'bg-amber-950/30 border-amber-400/70'
                                : hits >= 11
                                ? 'bg-emerald-950/25 border-emerald-500/50'
                                : 'bg-slate-900/80 border-slate-800'
                            }`}
                          >
                            {/* Linha Superior: Identificação + Badge de Acertos */}
                            <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums">
                              <div className="min-w-0">
                                <span className="font-black text-white">
                                  Jogo #{(t.index ?? tIdx + 1).toString().padStart(2, '0')}
                                </span>
                                {t.id && (
                                  <span className="text-[10px] text-slate-500 ml-1.5 truncate">
                                    {t.id}
                                  </span>
                                )}
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded font-black text-[11px] shrink-0 ${
                                  hits >= 14
                                    ? 'bg-amber-400 text-slate-950'
                                    : hits >= 11
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {hits} ACERTOS
                              </span>
                            </div>

                            {/* 15 Dezenas em Esferas / Pílulas */}
                            <div className="flex flex-wrap gap-1 font-mono tabular-nums">
                              {dezenas.map((num) => {
                                const isHit = conferirDezenasSet.has(num);
                                return (
                                  <span
                                    key={num}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] transition ${
                                      isHit
                                        ? 'bg-emerald-500 text-black font-bold shadow-sm'
                                        : 'bg-slate-800 text-slate-300 font-semibold'
                                    }`}
                                  >
                                    {num.toString().padStart(2, '0')}
                                  </span>
                                );
                              })}
                            </div>

                            {/* Métricas Rápidas + Tags */}
                            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-slate-400">
                              <span>
                                Soma <strong className="text-slate-200">{soma}</strong> ·{' '}
                                {pares}P/{impares}I · Primos {primos} · Mold {moldura} · IA{' '}
                                <strong className="text-emerald-400">{scoreIA.toFixed(0)}</strong>
                              </span>

                              {mergedTags.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-amber-300">
                                  <Tag className="w-3 h-3" />
                                  <span>{mergedTags.join(' · ')}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Exportação e Impressão PDF Oficial Gold */}
      {selectedForPDF && (
        <ExportPDFModal
          isOpen={Boolean(selectedForPDF)}
          onClose={() => setSelectedForPDF(null)}
          tickets={selectedForPDF.tickets}
          savedFechamento={selectedForPDF}
          latestDraw={{
            ...latestDraw,
            concurso: selectedForPDF.concurso,
            data: selectedForPDF.dataConcurso || latestDraw.data,
          }}
          fechamentoMeta={{
            strategyName: selectedForPDF.tipoFechamento,
            modeName: selectedForPDF.modalidadeMatriz,
            concurso: selectedForPDF.concurso,
            dataConcurso: selectedForPDF.dataConcurso,
            selectedNumbers: selectedForPDF.universoDezenas,
            fixedNumbers: selectedForPDF.dezenasFixas,
            excludedNumbers: selectedForPDF.dezenasExcluidas,
            garantia: selectedForPDF.modalidadeMatriz,
          }}
        />
      )}

      {/* Modal de Exportação Profissional para Lotéricas com Marca d'Água e Custos */}
      {selectedForLotericaPDF && (
        <ExportLotericaPDFModal
          isOpen={Boolean(selectedForLotericaPDF)}
          onClose={() => setSelectedForLotericaPDF(null)}
          fechamento={selectedForLotericaPDF}
          tickets={selectedForLotericaPDF.tickets}
          latestDraw={latestDraw}
        />
      )}
    </div>
  );
};
