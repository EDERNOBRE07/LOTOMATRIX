/**
 * Sistema de Snapshot e Auditoria Pré-Voo (Pre-flight Crash Snapshot)
 * Captura o estado completo do array de dezenas e os filtros aplicados IMEDIATAMENTE
 * antes de iniciar o cálculo do fechamento, salvando em localStorage.
 * Em caso de colapso do navegador (tela preta, out-of-memory ou travamento da main thread),
 * as informações permanecem intactas no disco para depuração e recuperação forense imediata.
 */

import { FilterCriteria, FechamentoMode } from '../types/lotofacil';
import { logFechamentoError } from './fechamentoErrorLogger';

export interface FechamentoPreflightSnapshot {
  id: string;
  epoch: number;
  timestamp: string;
  mode: FechamentoMode | string;
  targetCount: number;
  selectedNumbers: number[];
  fixedNumbers: number[];
  excludedNumbers: number[];
  activeFilters: FilterCriteria;
  drawConcurso: number;
  drawData: string;
  status: 'executing' | 'completed' | 'crashed';
  executionType: 'worker' | 'chunked_fallback';
  userAgent: string;
}

const PREFLIGHT_STORAGE_KEY = 'lotosniper_fechamento_preflight_snapshot';
const CRASH_HISTORY_KEY = 'lotosniper_fechamento_crash_history';

/**
 * Grava o snapshot pré-voo no localStorage antes de disparar o processamento.
 */
export function saveFechamentoPreflightSnapshot(params: {
  mode: FechamentoMode | string;
  targetCount: number;
  selectedNumbers: number[];
  fixedNumbers?: number[];
  excludedNumbers?: number[];
  activeFilters: FilterCriteria;
  drawConcurso: number;
  drawData?: string;
  executionType?: 'worker' | 'chunked_fallback';
}): FechamentoPreflightSnapshot {
  const snapshot: FechamentoPreflightSnapshot = {
    id: `preflight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    epoch: Date.now(),
    timestamp: new Date().toLocaleString('pt-BR'),
    mode: params.mode,
    targetCount: params.targetCount,
    selectedNumbers: [...params.selectedNumbers],
    fixedNumbers: params.fixedNumbers ? [...params.fixedNumbers] : [],
    excludedNumbers: params.excludedNumbers ? [...params.excludedNumbers] : [],
    activeFilters: JSON.parse(JSON.stringify(params.activeFilters)),
    drawConcurso: params.drawConcurso,
    drawData: params.drawData || new Date().toLocaleDateString('pt-BR'),
    status: 'executing',
    executionType: params.executionType || 'worker',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Unknown',
  };

  try {
    localStorage.setItem(PREFLIGHT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('[Preflight] Não foi possível persistir snapshot pré-voo no localStorage:', err);
  }

  return snapshot;
}

/**
 * Marca o snapshot como concluído com sucesso, liberando o estado de execução.
 */
export function markFechamentoPreflightSuccess(snapshotId?: string): void {
  try {
    const raw = localStorage.getItem(PREFLIGHT_STORAGE_KEY);
    if (!raw) return;

    const parsed: FechamentoPreflightSnapshot = JSON.parse(raw);
    if (!snapshotId || parsed.id === snapshotId) {
      parsed.status = 'completed';
      localStorage.setItem(PREFLIGHT_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {}
}

/**
 * Obtém o snapshot pré-voo atual do localStorage.
 */
export function getFechamentoPreflightSnapshot(): FechamentoPreflightSnapshot | null {
  try {
    const raw = localStorage.getItem(PREFLIGHT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Limpa o snapshot pré-voo.
 */
export function clearFechamentoPreflightSnapshot(): void {
  try {
    localStorage.removeItem(PREFLIGHT_STORAGE_KEY);
  } catch {}
}

/**
 * Verifica se ocorreu um crash no ciclo anterior (status 'executing' abandonado).
 * Se detectado, registra automaticamente um log de erro forense para auditoria imediata.
 */
export function checkAndAuditUnresolvedCrash(): FechamentoPreflightSnapshot | null {
  try {
    const raw = localStorage.getItem(PREFLIGHT_STORAGE_KEY);
    if (!raw) return null;

    const snapshot: FechamentoPreflightSnapshot = JSON.parse(raw);
    // Se o status ainda é 'executing' e se passaram mais de 8 segundos, o browser travou / crashou
    const elapsedMs = Date.now() - snapshot.epoch;
    if (snapshot.status === 'executing' && elapsedMs > 8000) {
      snapshot.status = 'crashed';
      // Salva no histórico de crashes
      try {
        const historyRaw = localStorage.getItem(CRASH_HISTORY_KEY);
        const history: FechamentoPreflightSnapshot[] = historyRaw ? JSON.parse(historyRaw) : [];
        history.unshift(snapshot);
        if (history.length > 20) history.pop();
        localStorage.setItem(CRASH_HISTORY_KEY, JSON.stringify(history));
        // Atualiza status no storage
        localStorage.setItem(PREFLIGHT_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {}

      // Registra telemetria de falha para depuração imediata
      logFechamentoError({
        stage: 'combinatoria',
        mode: snapshot.mode,
        targetCount: snapshot.targetCount,
        selectedNumbers: snapshot.selectedNumbers,
        fixedNumbers: snapshot.fixedNumbers,
        excludedNumbers: snapshot.excludedNumbers,
        activeFilters: snapshot.activeFilters,
        drawConcurso: snapshot.drawConcurso,
        drawData: snapshot.drawData,
        errorMessage: `[Crash Forense Detectado] O cálculo do fechamento travou ou colapsou a interface do navegador (${Math.round(elapsedMs / 1000)}s atrás).`,
        errorStack: `ExecutionType: ${snapshot.executionType} | Selected: [${snapshot.selectedNumbers.join(', ')}] | Fixed: [${snapshot.fixedNumbers.join(', ')}]`,
      });

      console.error('[Preflight Audit] Crash ou travamento de interface detectado no ciclo anterior:', snapshot);
      return snapshot;
    }
  } catch (err) {
    console.warn('[Preflight Audit] Erro ao auditar snapshot não resolvido:', err);
  }

  return null;
}
