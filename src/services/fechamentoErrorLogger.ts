import { FilterCriteria } from '../types/lotofacil';

export interface FechamentoErrorPayload {
  timestamp: string;
  epoch: number;
  stage: 'config' | 'combinatoria' | 'filtragem' | 'ponderado' | 'set_cover' | 'turbo' | 'render_monitor' | 'salvamento';
  mode?: string;
  targetCount?: number;
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  activeFilters: Partial<FilterCriteria>;
  drawConcurso?: number;
  drawData?: string;
  errorMessage: string;
  errorName?: string;
  errorStack?: string;
  userAgent?: string;
  memoryInfo?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

export interface FechamentoErrorLogEntry extends FechamentoErrorPayload {
  id: string;
}

const STORAGE_KEY = 'lotosniper_fechamento_error_logs';
const MAX_LOCAL_LOGS = 50;

/**
 * Persists an error locally in localStorage and asynchronously notifies backend /api/fechamento-errors
 */
export async function logFechamentoError(
  payload: Omit<FechamentoErrorPayload, 'timestamp' | 'epoch' | 'userAgent'>
): Promise<FechamentoErrorLogEntry> {
  const timestamp = new Date().toISOString();
  const epoch = Date.now();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown';

  let memoryInfo: any = undefined;
  if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
    const mem = (window.performance as any).memory;
    memoryInfo = {
      usedJSHeapSize: Math.round(mem.usedJSHeapSize / 1024 / 1024),
      totalJSHeapSize: Math.round(mem.totalJSHeapSize / 1024 / 1024),
      jsHeapSizeLimit: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
    };
  }

  const logEntry: FechamentoErrorLogEntry = {
    id: `err-${epoch}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    epoch,
    userAgent,
    memoryInfo,
    ...payload,
  };

  // 1. Asynchronous local persistence
  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    const existing: FechamentoErrorLogEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
    const updated = [logEntry, ...existing].slice(0, MAX_LOCAL_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (storageErr) {
    console.warn('[FechamentoErrorLogger] Falha ao gravar no localStorage:', storageErr);
  }

  // 2. Dispatch UI Event for real-time alerts
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('lotosniper-fechamento-error', {
          detail: logEntry,
        })
      );
    } catch {}
  }

  // 3. Asynchronous fire-and-forget POST to server API
  try {
    if (typeof fetch !== 'undefined') {
      fetch('/api/fechamento-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
        keepalive: true,
      }).catch((netErr) => {
        // Silently tolerate if offline or network unreachable
        console.debug('[FechamentoErrorLogger] Backend log sync pendente (offline/cors):', netErr);
      });
    }
  } catch (fetchErr) {
    console.debug('[FechamentoErrorLogger] Falha ao enviar log para servidor:', fetchErr);
  }

  return logEntry;
}

/**
 * Returns all locally stored error logs sorted newest first
 */
export function getFechamentoErrorLogs(): FechamentoErrorLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clears local error logs
 */
export function clearFechamentoErrorLogs(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
}

/**
 * Exports error logs formatted as a JSON string
 */
export function exportFechamentoLogsAsJson(): string {
  const logs = getFechamentoErrorLogs();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      app: 'LotoSniper',
      totalLogs: logs.length,
      logs,
    },
    null,
    2
  );
}

/**
 * Exports error logs as a human-readable forensic TXT report
 */
export function exportFechamentoLogsAsTxt(): string {
  const logs = getFechamentoErrorLogs();
  if (logs.length === 0) {
    return `=== LOTOSNIPER • DOSSIÊ FORENSE DE ERROS DO MOTOR DE FECHAMENTO ===\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: Nenhum erro registrado no histórico local. Todos os fechamentos operaram com 100% de estabilidade.\n`;
  }

  let report = `========================================================================\n`;
  report += `         LOTOSNIPER • DOSSIÊ FORENSE DE ANOMALIAS DE PROCESSAMENTO\n`;
  report += `========================================================================\n`;
  report += `Data de Exportação: ${new Date().toLocaleString('pt-BR')}\n`;
  report += `Total de Ocorrências Gravadas: ${logs.length}\n\n`;

  logs.forEach((log, idx) => {
    report += `------------------------------------------------------------------------\n`;
    report += `OCORRÊNCIA #${idx + 1} • ID: ${log.id} • ${new Date(log.epoch).toLocaleString('pt-BR')}\n`;
    report += `Etapa da Falha: [${log.stage.toUpperCase()}] • Modo: ${log.mode || 'N/A'} • Alvo: ${log.targetCount ?? 'N/A'} dezenas\n`;
    report += `Concurso de Referência: #${log.drawConcurso ?? 'N/A'}\n`;
    report += `Mensagem de Erro: ${log.errorMessage}\n`;
    if (log.errorStack) {
      report += `Stack Trace: ${log.errorStack.split('\n').slice(0, 3).join('\n')}\n`;
    }
    report += `Dezenas Selecionadas (${log.selectedNumbers.length}): [${log.selectedNumbers.map((n) => String(n).padStart(2, '0')).join(', ')}]\n`;
    report += `Dezenas Fixas: [${(log.fixedNumbers || []).map((n) => String(n).padStart(2, '0')).join(', ')}]\n`;
    report += `Dezenas Excluídas: [${(log.excludedNumbers || []).map((n) => String(n).padStart(2, '0')).join(', ')}]\n`;
    report += `Filtros Ativos:\n`;
    report += `  - Soma: ${log.activeFilters.somaMin ?? 'N/A'} a ${log.activeFilters.somaMax ?? 'N/A'}\n`;
    report += `  - Pares: ${log.activeFilters.paresMin ?? 'N/A'} a ${log.activeFilters.paresMax ?? 'N/A'}\n`;
    report += `  - Primos: ${log.activeFilters.primosMin ?? 'N/A'} a ${log.activeFilters.primosMax ?? 'N/A'}\n`;
    report += `  - Moldura: ${log.activeFilters.molduraMin ?? 'N/A'} a ${log.activeFilters.molduraMax ?? 'N/A'}\n`;
    report += `  - Repetidas: ${log.activeFilters.repetidasMin ?? 'N/A'} a ${log.activeFilters.repetidasMax ?? 'N/A'}\n`;
    report += `  - Ponderado Ativo: ${log.activeFilters.fechamentoPonderadoAtivo ? 'Sim' : 'Não'}\n`;
    report += `  - Robustez 50 Ativa: ${log.activeFilters.robustezEstatisticaAtiva ? 'Sim' : 'Não'}\n`;
    if (log.memoryInfo) {
      report += `Memória JS Heap: ${log.memoryInfo.usedJSHeapSize}MB usados / ${log.memoryInfo.totalJSHeapSize}MB alocados (Limite: ${log.memoryInfo.jsHeapSizeLimit}MB)\n`;
    }
    report += `\n`;
  });

  return report;
}
