import { GameTicket } from '../types/lotofacil';
import { analyzeTicket, auditarTicketsGerados } from './combinatorics';

export type SanitizerReport = any[] & {
  sanitizedCount: number;
  totalFechamentos: number;
  ticketsCorrigidosCount: number;
  data: any[];
  fechamentos: any[];
};

/**
 * sanitizarFechamentosSalvos
 *
 * Percorre o localStorage na chave 'lotosniper_saved_tickets' (e chaves legadas compatíveis),
 * aplicando a regra de limpeza:
 * 1. Remove dezenas de 'dezenasFixas' que não estão no 'universoDezenas'.
 * 2. Limita 'dezenasFixas.length' a no máximo 12 itens.
 * 3. Garante que todos os bilhetes salvos contenham apenas dezenas presentes no 'universoDezenas'.
 *
 * Persiste as correções no localStorage e dispara eventos de atualização.
 */
export function sanitizarFechamentosSalvos(customStorageOrData?: any): SanitizerReport {
  const STORAGE_KEY = 'lotosniper_saved_tickets';
  const PROGNOSTICOS_KEY = 'lotosniper_saved_prognosticos';
  let rawData: any = null;
  let isLocalStorage = false;

  if (customStorageOrData !== undefined && customStorageOrData !== null) {
    if (typeof customStorageOrData === 'string') {
      try {
        rawData = JSON.parse(customStorageOrData);
      } catch {
        rawData = [];
      }
    } else {
      rawData = customStorageOrData;
    }
  } else if (typeof localStorage !== 'undefined') {
    isLocalStorage = true;
    try {
      const storedTickets = localStorage.getItem(STORAGE_KEY);
      const storedPrognosticos = localStorage.getItem(PROGNOSTICOS_KEY);

      if (storedTickets) {
        rawData = JSON.parse(storedTickets);
      } else if (storedPrognosticos) {
        rawData = JSON.parse(storedPrognosticos);
      } else {
        rawData = [];
      }
    } catch {
      rawData = [];
    }
  } else {
    rawData = [];
  }

  // Normaliza para array de itens (fechamentos ou tickets com metadados)
  let items: any[] = [];
  if (Array.isArray(rawData)) {
    items = rawData;
  } else if (rawData && typeof rawData === 'object') {
    if (Array.isArray(rawData.fechamentos)) {
      items = rawData.fechamentos;
    } else if (Array.isArray(rawData.tickets)) {
      items = rawData.tickets;
    } else {
      items = [rawData];
    }
  }

  let sanitizedCount = 0;
  let ticketsCorrigidosCount = 0;

  const sanitizedItems = items.map((item: any, idx: number) => {
    // 1. Identifica o universo de dezenas do fechamento/item
    let universo: number[] = [];
    if (Array.isArray(item.universoDezenas) && item.universoDezenas.length > 0) {
      universo = item.universoDezenas;
    } else if (Array.isArray(item.universo) && item.universo.length > 0) {
      universo = item.universo;
    } else if (Array.isArray(item.selectedNumbers) && item.selectedNumbers.length > 0) {
      universo = item.selectedNumbers;
    } else if (Array.isArray(item.dezenas) && item.dezenas.length >= 15) {
      universo = item.dezenas;
    } else {
      // Universo padrão da Lotofácil (1 a 25) se nenhum especificado
      universo = Array.from({ length: 25 }, (_, i) => i + 1);
    }

    const uniqueUniverse = [...new Set(universo)].sort((a, b) => a - b);
    const universeSet = new Set(uniqueUniverse);

    // 2. Regra de limpeza das dezenas fixas:
    // - Remove dezenas de 'dezenasFixas' que não estão no 'universoDezenas'
    // - Limita 'dezenasFixas.length' a no máximo 12 itens
    const originalFixas: number[] = Array.isArray(item.dezenasFixas) ? item.dezenasFixas : [];
    const filteredFixas = originalFixas.filter((d: number) => universeSet.has(d));
    const clampedFixas = filteredFixas.slice(0, 12).sort((a, b) => a - b);

    const fixasChanged =
      originalFixas.length !== clampedFixas.length ||
      originalFixas.some((d, fIdx) => d !== clampedFixas[fIdx]);

    // 3. Regra de integridade dos bilhetes:
    // - Garante que todos os bilhetes salvos contenham apenas dezenas presentes no 'universoDezenas'
    let itemTicketsChanged = 0;

    let sanitizedTickets: GameTicket[] | undefined = undefined;
    if (Array.isArray(item.tickets)) {
      sanitizedTickets = item.tickets.map((t: any, tIdx: number) => {
        const originalNumbers: number[] = Array.isArray(t.dezenas)
          ? t.dezenas
          : Array.isArray(t.numbers)
          ? t.numbers
          : [];

        // Filtra apenas dezenas que pertencem ao universoDezenas
        const onlyUniverseNumbers = originalNumbers.filter((d: number) => universeSet.has(d));
        const hadInvalidNumbers = onlyUniverseNumbers.length !== originalNumbers.length;

        if (!hadInvalidNumbers && onlyUniverseNumbers.length === 15) {
          return t;
        }

        itemTicketsChanged++;
        ticketsCorrigidosCount++;

        // Substitui números inválidos com dezenas disponíveis do universo para completar 15
        const availableInUniverse = uniqueUniverse.filter((d) => !onlyUniverseNumbers.includes(d));
        const corrected = [...onlyUniverseNumbers];
        for (const candidate of availableInUniverse) {
          if (corrected.length >= 15) break;
          corrected.push(candidate);
        }
        corrected.sort((a, b) => a - b);

        const analysis = analyzeTicket(corrected);
        return {
          ...t,
          id: t.id || `ticket-sanitizado-${tIdx + 1}`,
          index: t.index || tIdx + 1,
          ...analysis,
          dezenas: corrected,
        };
      });
    }

    // Caso o próprio item seja um ticket individual com dezenas
    let singleTicketNumbers: number[] | undefined = undefined;
    if (Array.isArray(item.dezenas) && !item.tickets) {
      let filtered = item.dezenas.filter((d: number) => universeSet.has(d));
      if (filtered.length !== item.dezenas.length || filtered.length !== 15) {
        itemTicketsChanged++;
        ticketsCorrigidosCount++;
        const pool = uniqueUniverse.filter((d) => !filtered.includes(d));
        for (const num of pool) {
          if (filtered.length >= 15) break;
          filtered.push(num);
        }
        if (filtered.length > 15) {
          filtered = filtered.slice(0, 15);
        }
        filtered.sort((a: number, b: number) => a - b);
        singleTicketNumbers = filtered;
      }
    }

    if (fixasChanged || itemTicketsChanged > 0) {
      sanitizedCount++;
    }

    const updatedItem: any = {
      ...item,
      universoDezenas: uniqueUniverse,
      dezenasFixas: clampedFixas,
    };

    if (sanitizedTickets) {
      updatedItem.tickets = sanitizedTickets;
      try {
        const audit = auditarTicketsGerados(sanitizedTickets);
        updatedItem.auditoriaAnomalias = audit.resumo;
      } catch {}
    }

    if (singleTicketNumbers) {
      updatedItem.dezenas = singleTicketNumbers;
      const analysis = analyzeTicket(singleTicketNumbers);
      Object.assign(updatedItem, analysis);
    }

    return updatedItem;
  });

  // Persiste de volta no localStorage se estiver em ambiente de navegador ou teste com localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizedItems));
      // Mantém 'lotosniper_saved_prognosticos' e 'lotosniper_saved_fechamentos' sincronizados
      localStorage.setItem(PROGNOSTICOS_KEY, JSON.stringify(sanitizedItems.slice(0, 50)));
      localStorage.setItem('lotosniper_saved_fechamentos', JSON.stringify(sanitizedItems.slice(0, 50)));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lotosniper-saved-tickets-updated', { detail: sanitizedItems }));
        window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: sanitizedItems }));
      }
    } catch (e) {
      console.warn('Erro ao persistir itens sanitizados no localStorage:', e);
    }
  }

  const result: any = sanitizedItems;
  result.sanitizedCount = sanitizedCount;
  result.totalFechamentos = sanitizedItems.length;
  result.ticketsCorrigidosCount = ticketsCorrigidosCount;
  result.data = sanitizedItems;
  result.fechamentos = sanitizedItems;

  return result as SanitizerReport;
}
