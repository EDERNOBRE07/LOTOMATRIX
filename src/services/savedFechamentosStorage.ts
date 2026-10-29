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
