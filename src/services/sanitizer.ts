import { GameTicket } from '../types/lotofacil';
import { analyzeTicket, auditarTicketsGerados } from './combinatorics';
import { normalizeSavedFechamento, SavedFechamentoPrognostico } from './savedFechamentosStorage';

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
 * Percorre o localStorage (ou dados customizados passados por parâmetro):
 * 1. Sanitiza 'dezenasFixas' (removendo dezenas fora do universo e limitando a no máximo 12).
 * 2. Garante que todos os bilhetes salvos contenham exatamente 15 dezenas pertencentes ao universo.
 * 3. Normaliza a estrutura completa do fechamento (tipoFechamento, modalidadeMatriz, filtros).
 * 4. Salva apenas Fechamentos válidos em 'lotosniper_saved_prognosticos' e 'lotosniper_saved_fechamentos'.
 * 5. Salva os bilhetes individuais limpos em 'lotosniper_saved_tickets'.
 */
export function sanitizarFechamentosSalvos(customStorageOrData?: any): SanitizerReport {
  const TICKETS_KEY = 'lotosniper_saved_tickets';
  const PROGNOSTICOS_KEY = 'lotosniper_saved_prognosticos';
  const FECHAMENTOS_KEY = 'lotosniper_saved_fechamentos';

  let rawData: any = null;

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
    try {
      const storedPrognosticos = localStorage.getItem(PROGNOSTICOS_KEY);
      const storedFechamentos = localStorage.getItem(FECHAMENTOS_KEY);
      const storedTickets = localStorage.getItem(TICKETS_KEY);

      if (storedPrognosticos) {
        rawData = JSON.parse(storedPrognosticos);
      } else if (storedFechamentos) {
        rawData = JSON.parse(storedFechamentos);
      } else if (storedTickets) {
        rawData = JSON.parse(storedTickets);
      } else {
        rawData = [];
      }
    } catch {
      rawData = [];
    }
  } else {
    rawData = [];
  }

  // Normaliza a entrada para lista de itens
  let rawList: any[] = [];
  if (Array.isArray(rawData)) {
    rawList = rawData;
  } else if (rawData && typeof rawData === 'object') {
    if (Array.isArray(rawData.fechamentos)) {
      rawList = rawData.fechamentos;
    } else if (Array.isArray(rawData.tickets)) {
      rawList = rawData.tickets;
    } else {
      rawList = [rawData];
    }
  }

  let sanitizedCount = 0;
  let ticketsCorrigidosCount = 0;

  // Processa e normaliza cada fechamento
  const sanitizedFechamentos: SavedFechamentoPrognostico[] = rawList.map((rawItem: any, idx: number) => {
    // Se o item for um ticket solto, normalizeSavedFechamento o encapsula com segurança
    const item = normalizeSavedFechamento(rawItem, idx);

    // 1. Universo de dezenas
    const universe = [...new Set(item.universoDezenas || [])].sort((a, b) => a - b);
    const universeSet = new Set(universe);

    // 2. Limpeza estrita de fixas
    const originalFixas = item.dezenasFixas || [];
    const clampedFixas = originalFixas
      .filter((d) => universeSet.has(d))
      .slice(0, 12)
      .sort((a, b) => a - b);

    const fixasChanged =
      originalFixas.length !== clampedFixas.length ||
      originalFixas.some((d, fIdx) => d !== clampedFixas[fIdx]);

    // 3. Integridade dos bilhetes
    let ticketsChanged = 0;
    const sanitizedTickets = (item.tickets || []).map((t, tIdx) => {
      const originalDez = Array.isArray(t.dezenas) ? t.dezenas : [];
      const validInUniv = originalDez.filter((d) => universeSet.has(d));

      if (validInUniv.length === 15 && originalDez.length === 15) {
        return t;
      }

      ticketsChanged++;
      ticketsCorrigidosCount++;

      // Completa com dezenas do universo até 15
      const available = universe.filter((d) => !validInUniv.includes(d));
      const corrected = [...validInUniv];
      for (const num of available) {
        if (corrected.length >= 15) break;
        corrected.push(num);
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

    if (fixasChanged || ticketsChanged > 0) {
      sanitizedCount++;
    }

    const audit = auditarTicketsGerados(sanitizedTickets);

    return {
      ...item,
      dezenasFixas: clampedFixas,
      tickets: sanitizedTickets,
      totalJogos: sanitizedTickets.length,
      custoTotal: sanitizedTickets.length * 3.5,
      auditoriaAnomalias: audit.resumo,
    };
  });

  // Extrai todos os bilhetes limpos
  const allTickets: GameTicket[] = sanitizedFechamentos.flatMap((f) => f.tickets);

  // Persistência segura e segmentada no localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      // 1. Fechamentos em lotosniper_saved_prognosticos e lotosniper_saved_fechamentos
      localStorage.setItem(PROGNOSTICOS_KEY, JSON.stringify(sanitizedFechamentos.slice(0, 50)));
      localStorage.setItem(FECHAMENTOS_KEY, JSON.stringify(sanitizedFechamentos.slice(0, 50)));

      // 2. Bilhetes limpos em lotosniper_saved_tickets
      localStorage.setItem(TICKETS_KEY, JSON.stringify(allTickets));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: sanitizedFechamentos })
        );
        window.dispatchEvent(
          new CustomEvent('lotosniper-saved-tickets-updated', { detail: allTickets })
        );
      }
    } catch (e) {
      console.warn('Erro ao persistir itens sanitizados no localStorage:', e);
    }
  }

  const result: any = sanitizedFechamentos;
  result.sanitizedCount = sanitizedCount;
  result.totalFechamentos = sanitizedFechamentos.length;
  result.ticketsCorrigidosCount = ticketsCorrigidosCount;
  result.data = sanitizedFechamentos;
  result.fechamentos = sanitizedFechamentos;

  return result as SanitizerReport;
}

export default sanitizarFechamentosSalvos;
