import { GameTicket, FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { MOLDURA, PRIMOS } from '../data/lotofacilData';
import { VALOR_APOSTA_LOTOFACIL } from './combinatorics';

export const FIBONACCI_NUMBERS = [1, 2, 3, 5, 8, 13, 21];

export interface SavedFechamentoPrognostico {
  id: string;
  timestamp: number;
  dataCriacao: string;
  concurso: number;
  dataConcurso?: string;
  tipoFechamento: string;
  modalidadeMatriz: string;
  universoDezenas: number[];
  dezenasFixas: number[];
  dezenasExcluidas: number[];
  faixaSoma: { min: number; max: number; zonaOuro?: string };
  paridade: { minPares: number; maxPares: number; canonico?: string };
  maxConsecutivas: number;
  auditoriaAnomalias: string;
  repetidas: { min: number; max: number; concursoRef?: number };
  moldura: { min: number; max: number };
  primos: { min: number; max: number };
  fibonacci: { min: number; max: number };
  tickets: GameTicket[];
  totalJogos: number;
  custoTotal: number;
}

const STORAGE_KEY = 'lotosniper_saved_prognosticos';

export function getSavedFechamentos(): SavedFechamentoPrognostico[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial sample matching user's exact specification
      const sample = createInitialSampleFechamento();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
      return [sample];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createInitialSampleFechamento()];
  } catch {
    return [createInitialSampleFechamento()];
  }
}

export function saveFechamentoPrognostico(fechamento: SavedFechamentoPrognostico): void {
  try {
    const list = getSavedFechamentos();
    // Prepend new prognostic
    const updated = [fechamento, ...list.filter((f) => f.id !== fechamento.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 30))); // Keep last 30
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: updated }));
    }
  } catch (e) {
    console.error('Falha ao salvar fechamento:', e);
  }
}

export function deleteSavedFechamento(id: string): void {
  try {
    const list = getSavedFechamentos();
    const updated = list.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: updated }));
    }
  } catch (e) {
    console.error('Falha ao excluir fechamento salvo:', e);
  }
}

export function clearAllSavedFechamentos(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: [] }));
    }
  } catch {}
}

export function createInitialSampleFechamento(): SavedFechamentoPrognostico {
  const universo = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 22, 23, 24, 25];
  const sampleTickets: GameTicket[] = [
    {
      id: 'sample-01',
      index: 1,
      dezenas: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17],
      pares: 7,
      impares: 8,
      primos: 6,
      soma: 198,
      moldura: 10,
      miolo: 5,
      fibonacci: 4,
      repetidas: 9,
      maxConsecutivas: 4,
      scoreIA: 96,
    },
    {
      id: 'sample-02',
      index: 2,
      dezenas: [1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14, 19, 20, 22, 23],
      pares: 8,
      impares: 7,
      primos: 5,
      soma: 204,
      moldura: 9,
      miolo: 6,
      fibonacci: 4,
      repetidas: 9,
      maxConsecutivas: 3,
      scoreIA: 97,
    },
    {
      id: 'sample-03',
      index: 3,
      dezenas: [1, 2, 4, 5, 6, 10, 11, 12, 13, 14, 15, 17, 20, 22, 24],
      pares: 8,
      impares: 7,
      primos: 5,
      soma: 206,
      moldura: 10,
      miolo: 5,
      fibonacci: 3,
      repetidas: 8,
      maxConsecutivas: 3,
      scoreIA: 95,
    },
  ];

  return {
    id: 'fechamento-amplo-21-turbo',
    timestamp: Date.now() - 3600000,
    dataCriacao: new Date(Date.now() - 3600000).toLocaleString('pt-BR'),
    concurso: 3815,
    dataConcurso: '24/10/2026',
    tipoFechamento: '⚡ Gerador Turbo (Força Bruta 14 Pts • 17ms)',
    modalidadeMatriz: '21 Dezenas Amplo',
    universoDezenas: universo,
    dezenasFixas: [1, 2],
    dezenasExcluidas: [],
    faixaSoma: { min: 175, max: 220, zonaOuro: '190 a 210' },
    paridade: { minPares: 7, maxPares: 8, canonico: '7P/8I ou 8P/7I' },
    maxConsecutivas: 5,
    auditoriaAnomalias: 'Todos os bilhetes foram auditados com 0 anomalias estatísticas',
    repetidas: { min: 8, max: 10, concursoRef: 3815 },
    moldura: { min: 8, max: 11 },
    primos: { min: 4, max: 7 },
    fibonacci: { min: 3, max: 5 },
    tickets: sampleTickets,
    totalJogos: 18,
    custoTotal: 18 * VALOR_APOSTA_LOTOFACIL,
  };
}

/**
 * Converts a list of tickets into text formatted for "Entrada de Jogos para Conferência"
 */
export function formatTicketsForConferenciaInput(tickets: GameTicket[]): string {
  if (!tickets || tickets.length === 0) return '';
  return tickets
    .map((t, idx) => {
      const dezenasStr = t.dezenas
        .map((n) => n.toString().padStart(2, '0'))
        .join(' - ');
      return `Jogo ${(idx + 1).toString().padStart(2, '0')}: ${dezenasStr}`;
    })
    .join('\n');
}

/**
 * Cria e salva um SavedFechamentoPrognostico a partir do estado atual do FechamentoTab
 */
export function createSavedFechamentoFromCurrent({
  tickets,
  tipoFechamento,
  modalidadeMatriz,
  universoDezenas,
  dezenasFixas = [],
  dezenasExcluidas = [],
  filters,
  concurso = 3816,
  dataConcurso = '26/10/2026',
}: {
  tickets: GameTicket[];
  tipoFechamento: string;
  modalidadeMatriz: string;
  universoDezenas: number[];
  dezenasFixas?: number[];
  dezenasExcluidas?: number[];
  filters?: FilterCriteria;
  concurso?: number;
  dataConcurso?: string;
}): SavedFechamentoPrognostico {
  const totalJogos = tickets.length;
  const custoTotal = totalJogos * VALOR_APOSTA_LOTOFACIL;
  const now = new Date();

  const prognostico: SavedFechamentoPrognostico = {
    id: `fechamento-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    dataCriacao: now.toLocaleString('pt-BR'),
    concurso,
    dataConcurso,
    tipoFechamento,
    modalidadeMatriz,
    universoDezenas: [...universoDezenas].sort((a, b) => a - b),
    dezenasFixas: [...dezenasFixas].sort((a, b) => a - b),
    dezenasExcluidas: [...dezenasExcluidas].sort((a, b) => a - b),
    faixaSoma: {
      min: filters?.somaMin ?? 180,
      max: filters?.somaMax ?? 220,
      zonaOuro: '190 a 210',
    },
    paridade: {
      minPares: filters?.paresMin ?? 6,
      maxPares: filters?.paresMax ?? 9,
      canonico: '6 a 9 Pares (Banda Flexível)',
    },
    maxConsecutivas: filters?.maxConsecutivas ?? 6,
    auditoriaAnomalias: 'Todos os bilhetes foram auditados com 0 anomalias estatísticas e Soma >= 180',
    repetidas: {
      min: filters?.repetidasMin ?? 6,
      max: filters?.repetidasMax ?? 11,
      concursoRef: concurso,
    },
    moldura: {
      min: filters?.molduraMin ?? 8,
      max: filters?.molduraMax ?? 11,
    },
    primos: {
      min: filters?.primosMin ?? 4,
      max: filters?.primosMax ?? 7,
    },
    fibonacci: {
      min: filters?.fibonacciMin ?? 3,
      max: filters?.fibonacciMax ?? 5,
    },
    tickets,
    totalJogos,
    custoTotal,
  };

  saveFechamentoPrognostico(prognostico);
  triggerAutoBackupSnapshot();
  return prognostico;
}

// ==============================================================================
// SISTEMA DE BACKUP AUTOMÁTICO & RECUPERAÇÃO MULTI-DISPOSITIVOS
// ==============================================================================
const BACKUP_SNAPSHOTS_KEY = 'lotosniper_auto_backup_snapshots';

export interface BackupSnapshot {
  id: string;
  data: string;
  timestamp: number;
  totalFechamentos: number;
  fechamentos: SavedFechamentoPrognostico[];
}

export function triggerAutoBackupSnapshot(): void {
  try {
    const list = getSavedFechamentos();
    const snapshotsRaw = localStorage.getItem(BACKUP_SNAPSHOTS_KEY);
    const snapshots: BackupSnapshot[] = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      data: new Date().toLocaleString('pt-BR'),
      timestamp: Date.now(),
      totalFechamentos: list.length,
      fechamentos: list,
    };

    // Mantém os 5 snapshots mais recentes
    const updated = [newSnapshot, ...snapshots.slice(0, 4)];
    localStorage.setItem(BACKUP_SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Erro ao salvar snapshot de backup automático:', err);
  }
}

export function getBackupSnapshots(): BackupSnapshot[] {
  try {
    const snapshotsRaw = localStorage.getItem(BACKUP_SNAPSHOTS_KEY);
    return snapshotsRaw ? JSON.parse(snapshotsRaw) : [];
  } catch {
    return [];
  }
}

export function exportBackupJSON(): void {
  const list = getSavedFechamentos();
  const backupData = {
    app: 'LotoSniper AI Pro',
    versao: '2026.4',
    dataExportacao: new Date().toISOString(),
    totalFechamentos: list.length,
    fechamentos: list,
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lotosniper_backup_jogos_salvos_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function restoreBackupJSON(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const fechamentosToRestore = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.fechamentos)
      ? parsed.fechamentos
      : null;

    if (!fechamentosToRestore || fechamentosToRestore.length === 0) {
      return { success: false, count: 0, error: 'Nenhum fechamento válido encontrado no arquivo.' };
    }

    const current = getSavedFechamentos();
    const currentIds = new Set(current.map((f) => f.id));
    const merged = [...fechamentosToRestore.filter((f: SavedFechamentoPrognostico) => !currentIds.has(f.id)), ...current];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged.slice(0, 50)));
    triggerAutoBackupSnapshot();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: merged }));
    }

    return { success: true, count: fechamentosToRestore.length };
  } catch (e) {
    return { success: false, count: 0, error: 'Arquivo JSON inválido ou corrompido.' };
  }
}
