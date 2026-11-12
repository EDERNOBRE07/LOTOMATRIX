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
  syncWithMySQLHostinger,
} from '../services/savedFechamentosStorage';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { soundService } from '../services/soundAlert';
import { MOLDURA, PRIMOS } from '../data/lotofacilData';
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
  Sparkles,
  Download,
  Upload,
  Flame,
  Zap,
  ShieldCheck,
  Target,
  ArrowRight,
  Info,
  Printer,
  FileCheck,
  FileSpreadsheet,
  Bell,
  BellRing,
  Database,
  RefreshCw,
} from 'lucide-react';
import {
  auditAndNotifySavedGames,
  isPushNotificationSupported,
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

export const SavedFechamentosDossierList: React.FC<SavedFechamentosDossierListProps> = ({
  latestDraw,
  onGoToConferencia,
  onSelectTicketsToInspect,
}) => {
  const [fechamentos, setFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(() => {
    const list = getSavedFechamentos();
    return list.length > 0 ? list[0].id : null;
  });
  const [expandedTicketsCardId, setExpandedTicketsCardId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [selectedForPDF, setSelectedForPDF] = useState<SavedFechamentoPrognostico | null>(null);
  const [selectedForLotericaPDF, setSelectedForLotericaPDF] = useState<SavedFechamentoPrognostico | null>(null);
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

  useEffect(() => {
    syncWithMySQLHostinger()
      .then((st) => setMysqlStatus(st))
      .catch(() => {});
  }, []);

  const handleManualMySQLSync = async () => {
    setIsSyncingMysql(true);
    try {
      const res = await syncWithMySQLHostinger();
      setMysqlStatus(res);
      setFechamentos(getSavedFechamentos());
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`✓ Banco Hostinger MySQL (${res.database}) sincronizado! ${res.totalSaved} fechamento(s) ativos.`);
    } catch {
      showFeedback('Falha na sincronização com o banco Hostinger MySQL.');
    } finally {
      setIsSyncingMysql(false);
    }
  };

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
          `✓ Auditoria de todos os jogos salva: ${res.totalBilhetesAvaliados} bilhetes auditados, ${res.totalWinningTickets} premiados (Máx: ${res.maxHits} acertos). Notificação push enviada via Service Worker!`
        );
      } else {
        showFeedback('✓ Auditoria executada e notificação push enviada via Service Worker!');
      }
    } catch (e) {
      showFeedback('Erro ao disparar notificação push de teste.');
    } finally {
      setIsTestingPush(false);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      const list = getSavedFechamentos();
      setFechamentos(list);
      if (list.length > 0 && !expandedCardId) {
        setExpandedCardId(list[0].id);
      }
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
  }, [expandedCardId]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedFechamentoIds, setSelectedFechamentoIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  // Diagnóstico de fechamentos redundantes ou idênticos
  const dupReport = useMemo(() => getDuplicateFechamentosReport(), [fechamentos]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedFechamentoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    showFeedback(`✓ ${idsToDelete.length} fechamentos selecionados foram excluídos definitivamente do Banco MySQL Hostinger e do armazenamento local.`);
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
    showFeedback(`✓ Fechamento "${name}" excluído definitivamente do Banco de Dados MySQL Hostinger e do armazenamento local.`);
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
    showFeedback(`✓ Todos os ${count} fechamentos foram excluídos definitivamente do Banco MySQL Hostinger e do armazenamento local.`);
  };

  const handleLoadInConferencia = (fechamento: SavedFechamentoPrognostico) => {
    const formattedText = formatTicketsForConferenciaInput(fechamento.tickets);
    if (!formattedText) {
      showFeedback('Este fechamento não possui bilhetes válidos para carregar.');
      return;
    }

    // Persistir em localStorage para garantir que a aba de conferência carregue mesmo após ser montada
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

    // Disparar evento para ModuloConferenciaJogos preencher a Entrada de Jogos
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

    // Mudar para a aba de conferência
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'conferencia' }));
    soundService.playGoldenZoneSuccessChime();

    if (onGoToConferencia) {
      onGoToConferencia();
    }
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
      '2. FILTROS OBRIGATÓRIOS (RESTRIÇÕES CANÔNICAS)',
      '--------------------------------------------------------------------------------',
      `• Faixa de Soma das 15 Dezenas: ${f.faixaSoma.min} a ${f.faixaSoma.max} (Zona de Ouro Canônica: ${f.faixaSoma.zonaOuro || '190 a 210'})`,
      `• Paridade Estrutural (Pares/Ímpares): ${f.paridade.minPares} a ${f.paridade.maxPares} Pares / ${15 - f.paridade.maxPares} a ${15 - f.paridade.minPares} Ímpares (Canônico: ${f.paridade.canonico || '7P/8I ou 8P/7I'})`,
      `• Sequência Máxima Consecutiva: Até ${f.maxConsecutivas} dezenas consecutivas`,
      `• Auditoria de Anomalias: ${f.auditoriaAnomalias}`,
      '',
      '--------------------------------------------------------------------------------',
      '3. FILTROS AVANÇADOS (PROBABILIDADE CONDICIONAL)',
      '--------------------------------------------------------------------------------',
      `• Repetidas do Concurso Anterior (#${f.repetidas.concursoRef || f.concurso}): ${f.repetidas.min} a ${f.repetidas.max} dezenas repetidas`,
      `• Dezenas na Moldura (16 externas): ${f.moldura.min} a ${f.moldura.max} dezenas [Moldura Oficial: 01, 02, 03, 04, 05, 06, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]`,
      `• Números Primos: ${f.primos.min} a ${f.primos.max} dezenas [Primos: 02, 03, 05, 07, 11, 13, 17, 19, 23]`,
      `• Sequência Fibonacci: ${f.fibonacci.min} a ${f.fibonacci.max} dezenas [Fibonacci: 01, 02, 03, 05, 08, 13, 21]`,
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
    link.download = `lotosniper_fechamento_salvo_${f.concurso}_${f.totalJogos}_jogos.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback('Arquivo TXT com Dossiê Técnico baixado com sucesso!');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadPdfDirect = (f: SavedFechamentoPrognostico) => {
    try {
      downloadGoldFechamentoPDF(f);
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`PDF Gold "${f.tipoFechamento}" gerado com sucesso via jsPDF!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF via jsPDF.');
    }
  };

  const handleDownloadLotericaDirect = (f: SavedFechamentoPrognostico) => {
    try {
      downloadProfessionalLotericaPDF({
        fechamento: f,
        tickets: f.tickets,
        concurso: f.concurso,
        dataConcurso: f.dataConcurso,
        strategyName: f.tipoFechamento,
        modalidadeMatriz: f.modalidadeMatriz,
        universoDezenas: f.universoDezenas,
        custoTotalEstimado: f.custoTotal,
      });
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`✓ PDF Oficial Lotérica com marca d'água para "${f.tipoFechamento}" gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF para lotérica.');
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
          ? `✓ PDF "Lista Otimizada (Econômico)" gerado para "${f.tipoFechamento}"!`
          : `✓ PDF "Volantes Oficiais 5×5" gerado para "${f.tipoFechamento}"!`
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
      showFeedback(`✓ Cartões de Jogos em layout oficial (grid 5×5) gerados para "${f.tipoFechamento}"!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar cartões de jogos PDF.');
    }
  };

  const handleDownloadAllLotericaPDFDirect = () => {
    if (fechamentos.length === 0) return;
    try {
      const allTickets = fechamentos.flatMap((f) => f.tickets || []);
      const totalCost = fechamentos.reduce(
        (acc, f) => acc + (f.custoTotal ?? (f.tickets?.length || 0) * 3.5),
        0
      );
      downloadProfessionalLotericaPDF({
        tickets: allTickets,
        concurso: fechamentos[0]?.concurso || 3818,
        strategyName: `Carteira Completa (${fechamentos.length} Fechamentos Salvos)`,
        modalidadeMatriz: `${allTickets.length} Apostas Consolidadas`,
        custoTotalEstimado: totalCost,
        watermarkText: 'LOTO SNIPER • COMPROVANTE OFICIAL DE JOGOS • USO LOTÉRICO',
      });
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`✓ PDF Lotérica com todos os ${allTickets.length} jogos salvos gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF de todos os jogos.');
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
        'Modelo de Prognostico',
        'Concurso Base',
        'Data Criacao',
      ];

      const rows = f.tickets.map((t, idx) => {
        const sorted = [...t.dezenas].sort((a, b) => a - b);
        const dCols = sorted.map((n) => n.toString().padStart(2, '0'));
        const formatted = sorted.map((n) => n.toString().padStart(2, '0')).join(' - ');
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
      link.download = `lotosniper_fechamento_concurso_${f.concurso}_${f.totalJogos}_jogos.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      soundService.playGoldenZoneSuccessChime();
      showFeedback(`✓ Arquivo CSV com ${f.totalJogos} apostas do Fechamento baixado com sucesso!`);
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar arquivo CSV.');
    }
  };

  const handleExportBackup = () => {
    try {
      exportBackupJSON();
      soundService.playGoldenZoneSuccessChime();
      showFeedback('Backup completo (.json) exportado com sucesso para restauração multi-dispositivos!');
    } catch {
      showFeedback('Falha ao exportar backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = restoreBackupJSON(content);
        if (res.success) {
          soundService.playGoldenZoneSuccessChime();
          showFeedback(`Backup restaurado com sucesso! ${res.count} fechamento(s) sincronizados.`);
          setFechamentos(getSavedFechamentos());
        } else {
          showFeedback(`Erro ao restaurar backup: ${res.error}`);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-200 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header da Seção de Jogos Salvos */}
      <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">Jogos Salvos & Dossiê de Fechamentos</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  {fechamentos.length} Fechamento(s) Armazenado(s)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cada prognóstico gerado em <strong>"Fechamentos & 14 Pontos"</strong> é catalogado com o tipo de fechamento, universo de dezenas e os filtros canônicos e avançados utilizados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Backup JSON */}
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Fazer download de um arquivo .json com todos os fechamentos para backup ou transferência para outro dispositivo"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Fazer Backup (.json)</span>
            </button>

            {/* Restaurar Backup */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              title="Restaurar fechamentos a partir de um arquivo .json de backup"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Restaurar Backup</span>
            </button>

            {/* Gerar PDF Lotérica de Todos os Jogos Salvos */}
            {fechamentos.length > 0 && (
              <button
                type="button"
                onClick={handleDownloadAllLotericaPDFDirect}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 text-emerald-300 border border-emerald-500/50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Gerar PDF profissional com todos os jogos salvos diagramados com marca d'água e custos estimados para impressão em lotéricas"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>PDF Lotérica (Todos os Jogos)</span>
              </button>
            )}

            {fechamentos.length > 1 && (
              confirmClearAll ? (
                <div className="flex items-center gap-1.5 bg-rose-950/90 p-1.5 rounded-xl border border-rose-500/60 shadow-md">
                  <span className="text-[11px] text-rose-200 font-bold px-1">Excluir todos do banco?</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    Sim, Limpar Tudo
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition cursor-pointer"
                  >
                    Não
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  title="Limpar todos os fechamentos salvos do banco de dados e do armazenamento local"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar Histórico</span>
                </button>
              )
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Novo Fechamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card de Diagnóstico de Redundância e Duplicatas entre Fechamentos */}
      {dupReport.duplicateCount > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-rose-950/60 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Auditoria de Redundância Ativa
                </span>
                <h4 className="text-sm sm:text-base font-black text-white">
                  Detectados {dupReport.duplicateCount} fechamentos 100% idênticos ({dupReport.redundantTicketsCount} bilhetes repetidos)
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                A matriz combinatória identificou fechamentos cópias gerados com os mesmos parâmetros. Limpar as duplicatas manterá apenas o primeiro fechamento único, liberando espaço e evitando apostas redundantes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const res = removeDuplicateFechamentos();
              setFechamentos(getSavedFechamentos());
              soundService.playGoldenZoneSuccessChime();
              showFeedback(`✓ Removidos ${res.removedCount} fechamentos duplicados com sucesso!`);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 shrink-0 flex items-center gap-2 active:scale-95"
          >
            <Trash2 className="w-4 h-4 fill-current" />
            <span>Limpar {dupReport.duplicateCount} Fechamentos Duplicados</span>
          </button>
        </div>
      )}

      {/* Card de Notificações Push em Segundo Plano via Service Worker */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <BellRing className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Notificações Push em Segundo Plano (Service Worker)
                </h3>
                {pushPerm === 'granted' ? (
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Operacional em 2º Plano
                  </span>
                ) : pushPerm === 'denied' ? (
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    Bloqueado no Navegador
                  </span>
                ) : (
                  <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Permissão Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                O Service Worker audita automaticamente todos os seus jogos salvos assim que a Caixa apurar um novo concurso, enviando uma notificação push com o total de acertos e bilhetes premiados, <strong>mesmo com o navegador em segundo plano ou a tela desligada</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {/* Toggle de ativação */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={handleTogglePush}
                className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-semibold text-[11px]">Auto-Push Ativo</span>
            </label>

            {/* Botão de Testar Notificação Push */}
            <button
              type="button"
              onClick={handleTestPush}
              disabled={isTestingPush}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              title="Disparar uma notificação push de teste agora para conferir o funcionamento no sistema"
            >
              <Bell className="w-3.5 h-3.5 fill-current" />
              <span>{isTestingPush ? 'Enviando...' : 'Testar Push Agora'}</span>
            </button>

            {pushPerm !== 'granted' && (
              <button
                type="button"
                onClick={async () => {
                  const p = await requestPushPermission();
                  setPushPerm(p);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>Habilitar no Navegador</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Card do Banco de Dados MySQL Hostinger (u376010332_LotoSniper @ lotosniper.com.br) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Database className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Banco de Dados MySQL Hostinger · u376010332_LotoSniper
                </h3>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-amber-400" />
                  lotosniper.com.br
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Criado em: 2026-10-10
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Persistência relacional na Hostinger: Todos os fechamentos e bilhetes salvos são sincronizados com o banco de dados <strong>u376010332_LotoSniper</strong> (usuário: <code>u376010332_LotoSniper</code>) para recuperação segura e consistente em qualquer dispositivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={handleManualMySQLSync}
              disabled={isSyncingMysql}
              className={`px-3.5 py-2 rounded-xl border text-xs font-black transition cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95 ${
                isSyncingMysql
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border-amber-400 shadow-amber-500/20'
              }`}
              title="Sincronizar imediatamente todos os jogos salvos com o banco de dados MySQL da Hostinger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMysql ? 'animate-spin' : ''}`} />
              <span>{isSyncingMysql ? 'Sincronizando...' : 'Sincronizar com MySQL'}</span>
            </button>

            <a
              href="/api/hostinger_mysql_sync.php"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
              title="Acessar endpoint PHP de conexão direta do MySQL no servidor Hostinger"
            >
              <span>Endpoint Hostinger PHP</span>
            </a>
          </div>
        </div>
      </div>

      {/* Lista de Jogos Vencedores Auditados pelo Service Worker */}
      <AuditedWinningGamesList
        latestDraw={latestDraw}
        onGoToConferencia={onGoToConferencia}
      />

      {/* Lista de Fechamentos Salvos */}
      {fechamentos.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum Fechamento Salvo no Momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gere uma matriz na aba <strong>"Fechamentos & 14 Pontos"</strong> ou use o <strong>"Gerador Turbo"</strong> para salvar automaticamente seus prognósticos com dossiê técnico completo aqui.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition"
          >
            <span>Ir para Fechamentos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Barra de Seleção e Exclusão em Massa de Fechamentos */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedFechamentoIds.size === fechamentos.length && fechamentos.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 text-rose-500 focus:ring-rose-500 cursor-pointer accent-rose-500"
                />
                <span className="text-xs font-bold text-slate-200">
                  Selecionar Todos ({fechamentos.length})
                </span>
              </label>

              {selectedFechamentoIds.size > 0 && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  {selectedFechamentoIds.size} de {fechamentos.length} selecionado(s)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedFechamentoIds.size > 0 ? (
                <>
                  {confirmBulkDelete ? (
                    <div className="flex items-center gap-2 bg-rose-950/90 p-1.5 px-3 rounded-xl border border-rose-500/60 shadow-md">
                      <span className="text-xs text-rose-200 font-bold">
                        Excluir {selectedFechamentoIds.size} fechamento(s)?
                      </span>
                      <button
                        type="button"
                        onClick={handleExecuteBulkDelete}
                        className="px-2.5 py-1 rounded-lg bg-rose-500 hover:bg-rose-400 text-slate-950 font-black text-xs transition cursor-pointer"
                        title="Confirmar exclusão em massa"
                      >
                        Sim, Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmBulkDelete(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                        title="Cancelar exclusão"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmBulkDelete(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Excluir todos os fechamentos marcados de uma só vez"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Excluir Selecionados ({selectedFechamentoIds.size})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Marque os fechamentos desejados para exclusão em lote
                </span>
              )}
            </div>
          </div>

          {fechamentos.map((f, idx) => {
            const isExpanded = expandedCardId === f.id;
            const isTicketsExpanded = expandedTicketsCardId === f.id;
            const isSelected = selectedFechamentoIds.has(f.id);

            return (
              <div
                key={f.id}
                className={`bg-slate-900/90 rounded-2xl border-2 transition-all shadow-xl ${
                  isSelected
                    ? 'border-rose-500/70 bg-rose-950/15 shadow-rose-500/10'
                    : isExpanded
                    ? 'border-amber-500/60 shadow-amber-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox individual para exclusão em massa */}
                    <div className="flex items-center pt-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelectOne(f.id);
                        }}
                        className="w-4 h-4 rounded border-slate-700 text-rose-500 focus:ring-rose-500 cursor-pointer accent-rose-500"
                        title="Selecionar para exclusão em massa"
                      />
                    </div>

                    <span className="flex items-center justify-center px-2 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-sm shrink-0">
                      #{(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="space-y-1">
                      {/* Linha 1: ⚡(Tipo de Fechamento com Filtros e Dossiê) */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 leading-snug">
                          <span>
                            ⚡{String(f.tipoFechamento || f.modalidadeMatriz || 'Fechamento Combinatório').replace(/^⚡\s*/, '')}
                            {!String(f.tipoFechamento || '').includes('Concurso #') &&
                              !String(f.tipoFechamento || '').includes('Alvo:') && (
                                <span className="text-slate-400 font-semibold text-xs ml-1.5">
                                  (Alvo: Concurso Caixa #{(f.concurso || 3827) + 1})
                                </span>
                              )}
                          </span>
                        </h3>
                      </div>

                      {/* Linha 2: Modalidade / Matriz */}
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        {String(f.modalidadeMatriz || '').includes('Matriz Pro')
                          ? f.modalidadeMatriz
                          : `${(f.universoDezenas || []).length} Dezenas (Garantia 14 se 15) - Matriz Pro (${f.totalJogos || (f.tickets || []).length} Jogos - Garantia 14 Pontos (com 35% de chance de 15))`}
                      </div>

                      {/* Linha 3: Total de Jogos & Custo */}
                      <div className="text-xs font-black text-amber-300 font-mono">
                        {f.totalJogos || (f.tickets || []).length} Jogos (R${' '}
                        {(f.custoTotal ?? (f.totalJogos || (f.tickets || []).length || 0) * 3.5).toFixed(2)})
                      </div>

                      {/* Linha 4: Data de Criação */}
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{f.dataCriacao || 'Data não registrada'}</span>
                      </div>

                      {/* Linhas 5 e 6: •Concurso Base Caixa •Universo */}
                      <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                        <span>•Concurso Base Caixa #{f.concurso || 3827}</span>
                        <span className="text-amber-400 font-bold">
                          •Universo: {(f.universoDezenas || []).length} Dezenas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação Principais para Este Fechamento */}
                  <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                    {/* Botão Gerar PDF Oficial Gold (Modal & Prévia de Impressão) */}
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playGoldenZoneSuccessChime();
                        setSelectedForPDF(f);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95"
                      title="Visualizar e Imprimir Dossiê e Volantes formatados"
                    >
                      <Printer className="w-4 h-4 text-slate-950" />
                      <span>Visualizar & Imprimir</span>
                    </button>

                    {/* Botão Baixar Cartões de Jogos Oficiais para Impressão */}
                    <button
                      type="button"
                      onClick={() => handleDownloadCartoesOficiaisPDF(f)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/25 active:scale-95 ring-1 ring-amber-300"
                      title="Imprimir cartões de jogos da Lotofácil (layout profissional 4 volantes por folha A4 com grid 5x5 e marcas de corte)"
                    >
                      <Printer className="w-4 h-4 text-slate-950" />
                      <span>Imprimir Cartões (PDF)</span>
                    </button>

                    {/* Botão Baixar Volante 5x5 Oficial */}
                    <button
                      type="button"
                      onClick={() => handleDownloadVolantesStyle(f, 'oficial')}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Baixar volantes no Modelo Aposta Oficial com grid 5x5 pronto para marcação"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Volante 5×5</span>
                    </button>

                    {/* Botão Baixar Lista Otimizada Econômica (Economia de Tinta) */}
                    <button
                      type="button"
                      onClick={() => handleDownloadVolantesStyle(f, 'economico')}
                      className="px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Baixar lista otimizada com economia de tinta (layout monocromático de alta densidade)"
                    >
                      <Printer className="w-4 h-4 text-teal-400" />
                      <span>Lista Econômica</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-teal-500/20 text-teal-200 font-mono">
                        -90% Tinta
                      </span>
                    </button>

                    {/* Botão Gerar PDF Oficial para Lotérica com Marca d'Água e Custos Estimados */}
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playGoldenZoneSuccessChime();
                        setSelectedForLotericaPDF(f);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-emerald-500/25 flex items-center gap-1.5 active:scale-95"
                      title="Gerar PDF profissional com dezenas, custo estimado e marca d'água para impressão em lotéricas"
                    >
                      <Printer className="w-4 h-4 text-slate-950" />
                      <span>PDF Lotérica (Marca d'Água)</span>
                    </button>

                    {/* Botão Baixar CSV Formatado para Lotéricas/Planilhas */}
                    <button
                      type="button"
                      onClick={() => handleDownloadCSVDirect(f)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                      title="Baixar arquivo CSV com todas as dezenas formatadas para lotéricas ou planilhas"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Baixar CSV</span>
                    </button>

                    {/* Botão Carregar Fechamento em Entrada de Jogos para Conferência */}
                    <button
                      type="button"
                      onClick={() => handleLoadInConferencia(f)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs transition cursor-pointer shadow-md shadow-sky-500/20 flex items-center gap-2 active:scale-95"
                      title="Carregar todos os bilhetes deste fechamento na Entrada de Jogos para Conferência"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Carregar na Conferência</span>
                    </button>

                    {/* Botão Exportar TXT */}
                    <button
                      type="button"
                      onClick={() => handleDownloadTXT(f)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                      title="Baixar arquivo TXT com Dossiê Técnico"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Botão Excluir Fechamento Salvo */}
                    {confirmDeleteId === f.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/90 p-1 rounded-xl border border-rose-500/60 shadow-md">
                        <span className="text-[10px] text-rose-200 font-bold px-1.5">Excluir?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id, f.tipoFechamento)}
                          className="px-2 py-1 rounded-lg bg-rose-500 text-slate-950 font-black text-[10px] hover:bg-rose-400 transition cursor-pointer"
                          title="Confirmar exclusão definitiva"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] hover:bg-slate-700 transition cursor-pointer"
                          title="Cancelar"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(f.id)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer"
                        title="Excluir este fechamento salvo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Botão Expandir / Recolher Dossiê */}
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : f.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                      title={isExpanded ? 'Recolher detalhes' : 'Expandir dossiê'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Dossiê Formatado Conforme Especificação */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 space-y-6 bg-slate-950/60 font-mono text-xs">
                    {/* SEÇÃO 1: DADOS DO FECHAMENTO & ESTRATÉGIA */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider pb-1 border-b border-amber-500/30">
                        <Target className="w-4 h-4" />
                        <span>DADOS DO FECHAMENTO & ESTRATÉGIA</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 pt-1 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Tipo de Fechamento:</strong> {f.tipoFechamento || 'Fechamento Combinatório'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Modalidade / Matriz:</strong> {f.modalidadeMatriz || 'Matriz Pro (Garantia 14 se 15)'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <div>
                            <strong className="text-white">Universo de Dezenas ({(f.universoDezenas || []).length} números):</strong>{' '}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(f.universoDezenas || []).map((n) => (
                                <span
                                  key={n}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-[11px] ${
                                    (f.dezenasFixas || []).includes(n)
                                      ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                                  }`}
                                >
                                  {n.toString().padStart(2, '0')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Dezenas Fixas:</strong>{' '}
                            {(f.dezenasFixas || []).length > 0
                              ? (f.dezenasFixas || []).map((d) => d.toString().padStart(2, '0')).join(' ')
                              : 'Nenhuma dezena fixa'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Dezenas Excluídas:</strong>{' '}
                            {(f.dezenasExcluidas || []).length > 0
                              ? (f.dezenasExcluidas || []).map((d) => d.toString().padStart(2, '0')).join(' ')
                              : 'Nenhuma dezena excluída'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 2: FILTROS OBRIGATÓRIOS (RESTRIÇÕES CANÔNICAS) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider pb-1 border-b border-cyan-500/30">
                        <ShieldCheck className="w-4 h-4" />
                        <span>2. FILTROS OBRIGATÓRIOS (RESTRIÇÕES CANÔNICAS)</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 pt-1 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Faixa de Soma das 15 Dezenas:</strong> {f.faixaSoma?.min ?? 180} a {f.faixaSoma?.max ?? 215} (Zona de Ouro Canônica: {f.faixaSoma?.zonaOuro || '190 a 210'})
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Paridade Estrutural (Pares/Ímpares):</strong> {f.paridade?.minPares ?? 6} a {f.paridade?.maxPares ?? 9} Pares / {15 - (f.paridade?.maxPares ?? 9)} a {15 - (f.paridade?.minPares ?? 6)} Ímpares (Canônico: {f.paridade?.canonico || '7P/8I ou 8P/7I'})
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Sequência Máxima Consecutiva:</strong> Até {f.maxConsecutivas ?? 5} dezenas consecutivas
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Auditoria de Anomalias:</strong> {f.auditoriaAnomalias || 'Auditado dinamicamente com filtros canônicos'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 3: FILTROS AVANÇADOS (PROBABILIDADE CONDICIONAL) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider pb-1 border-b border-emerald-500/30">
                        <Sparkles className="w-4 h-4" />
                        <span>3. FILTROS AVANÇADOS (PROBABILIDADE CONDICIONAL)</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 pt-1 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Repetidas do Concurso Anterior (#{f.repetidas?.concursoRef || f.concurso || 3827}):</strong> {f.repetidas?.min ?? 8} a {f.repetidas?.max ?? 10} dezenas repetidas
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Dezenas na Moldura (16 externas):</strong> {f.moldura?.min ?? 8} a {f.moldura?.max ?? 11} dezenas [Moldura Oficial: 01, 02, 03, 04, 05, 06, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Números Primos:</strong> {f.primos?.min ?? 4} a {f.primos?.max ?? 7} dezenas [Primos: 02, 03, 05, 07, 11, 13, 17, 19, 23]
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Sequência Fibonacci:</strong> {f.fibonacci?.min ?? 3} a {f.fibonacci?.max ?? 6} dezenas [Fibonacci: 01, 02, 03, 05, 08, 13, 21]
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão para Inspecionar / Ocultar Bilhetes Gerados */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTicketsCardId(isTicketsExpanded ? null : f.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isTicketsExpanded ? 'Ocultar Bilhetes' : `Inspecionar ${(f.tickets || []).length} Bilhetes Gerados`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadInConferencia(f)}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Carregar em Entrada de Jogos para Conferência</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Grid dos Bilhetes se expandido */}
                    {isTicketsExpanded && (
                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {(f.tickets || []).map((t, tIdx) => {
                            const dezenas = Array.isArray(t.dezenas) ? t.dezenas : [];
                            return (
                              <div
                                key={t.id || tIdx}
                                className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 font-bold">
                                    #{(t.index ?? tIdx + 1).toString().padStart(2, '0')}
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {dezenas.map((num) => (
                                      <span
                                        key={num}
                                        className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-slate-800 text-slate-200"
                                      >
                                        {num.toString().padStart(2, '0')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                                  S:{t.soma ?? dezenas.reduce((a, b) => a + b, 0)} | P:{t.pares ?? dezenas.filter((n) => n % 2 === 0).length}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
