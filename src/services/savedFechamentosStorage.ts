import { GameTicket, FilterCriteria, LotofacilDraw } from '../types/lotofacil';
import { MOLDURA, PRIMOS } from '../data/lotofacilData';
import { VALOR_APOSTA_LOTOFACIL, auditarTicketsGerados, analyzeTicket } from './combinatorics';

export const FIBONACCI_NUMBERS = [1, 2, 3, 5, 8, 13, 21];

export interface SavedFechamentoPrognostico {
  id: string;
  timestamp: number;
  dataCriacao: string;
  concurso: number;
  concursoAlvo?: number;
  dataConcurso?: string;
  nomeFechamento?: string;
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

export function resolveConcursoBase(
  concurso?: number | string | null,
  fallback: number = 3824
): number {
  const num = Number(concurso);
  return Number.isFinite(num) && num > 0 ? Math.trunc(num) : fallback;
}

export function resolveConcursoAlvo(
  concursoBase?: number | string | null,
  explicitAlvo?: number | string | null,
  fallbackBase: number = 3824
): number {
  const alvoNum = Number(explicitAlvo);
  if (Number.isFinite(alvoNum) && alvoNum > 0) {
    return Math.trunc(alvoNum);
  }
  return resolveConcursoBase(concursoBase, fallbackBase) + 1;
}

export function getBackupConcursoAlvo(
  fechamentos: Array<{ concurso?: number; concursoAlvo?: number }> = [],
  fallbackBase: number = 3824
): number {
  if (!Array.isArray(fechamentos) || fechamentos.length === 0) {
    return resolveConcursoAlvo(fallbackBase);
  }
  let maxAlvo = 0;
  for (const f of fechamentos) {
    const alvo = resolveConcursoAlvo(f?.concurso, f?.concursoAlvo, fallbackBase);
    if (alvo > maxAlvo) maxAlvo = alvo;
  }
  return maxAlvo > 0 ? maxAlvo : resolveConcursoAlvo(fallbackBase);
}

export function formatBackupJsonFilename(
  concursoAlvo: number,
  dataFormatada: string = new Date().toISOString().slice(0, 10)
): string {
  const safeAlvo = Number.isFinite(Number(concursoAlvo)) && Number(concursoAlvo) > 0
    ? Math.trunc(Number(concursoAlvo))
    : 3825;
  return `lotosniper_concurso_${safeAlvo}_${dataFormatada}.json`;
}

export function stripConcursoAlvoPrefix(rawTitle?: string | null): string {
  const str = String(rawTitle || '').trim();
  if (!str) return '';
  return str
    .replace(/^Concurso Alvo #\d+\s*\(Base #\d+\)\s*•\s*/i, '')
    .replace(/^⚡\s*/, '')
    .trim();
}

export function buildStandardFilterSummary(item: {
  faixaSoma?: { min?: number; max?: number };
  paridade?: { minPares?: number; maxPares?: number };
  moldura?: { min?: number; max?: number };
  primos?: { min?: number; max?: number };
  fibonacci?: { min?: number; max?: number };
  repetidas?: { min?: number; max?: number };
  dezenasFixas?: number[];
  dezenasExcluidas?: number[];
}): string {
  const tokens: string[] = [
    `Soma ${item.faixaSoma?.min ?? 180}-${item.faixaSoma?.max ?? 215}`,
    `Pares ${item.paridade?.minPares ?? 6}-${item.paridade?.maxPares ?? 9}`,
    `Moldura ${item.moldura?.min ?? 8}-${item.moldura?.max ?? 12}`,
    `Primos ${item.primos?.min ?? 4}-${item.primos?.max ?? 6}`,
    `Fib ${item.fibonacci?.min ?? 3}-${item.fibonacci?.max ?? 5}`,
    `Rep ${item.repetidas?.min ?? 6}-${item.repetidas?.max ?? 10}`,
  ];
  if (Array.isArray(item.dezenasFixas) && item.dezenasFixas.length > 0) {
    tokens.push(`Fixas: [${[...item.dezenasFixas].sort((a, b) => a - b).join(',')}]`);
  }
  if (Array.isArray(item.dezenasExcluidas) && item.dezenasExcluidas.length > 0) {
    tokens.push(`Excl: [${[...item.dezenasExcluidas].sort((a, b) => a - b).join(',')}]`);
  }
  return `Filtros: ${tokens.join(' | ')}`;
}

export function formatStandardFechamentoTitle(params: {
  concursoBase: number;
  concursoAlvo?: number;
  tipoFechamento?: string;
  modalidadeMatriz?: string;
  universoCount: number;
  totalJogos: number;
  garantia?: string;
  filterSummary?: string;
}): string {
  const concursoBase = resolveConcursoBase(params.concursoBase);
  const concursoAlvo = resolveConcursoAlvo(concursoBase, params.concursoAlvo);

  // Extrai somente o nome limpo da estratégia caso já venha formatado
  let tipoClean = stripConcursoAlvoPrefix(params.tipoFechamento);
  if (tipoClean.includes(' • ')) {
    tipoClean = tipoClean.split(' • ')[0].trim();
  }
  if (!tipoClean) {
    tipoClean = 'Fechamento Clássico';
  }

  let garantiaText = String(params.garantia || '').trim();
  if (!garantiaText && params.modalidadeMatriz) {
    const matchGar = String(params.modalidadeMatriz).match(/Garantia[^)\]]*/i);
    if (matchGar) {
      garantiaText = matchGar[0].trim();
    }
  }
  if (!garantiaText) {
    garantiaText = 'Garantia 14 se 15';
  } else if (!/^garantia/i.test(garantiaText)) {
    garantiaText = `Garantia ${garantiaText}`;
  }

  const resumoMatriz = `${params.universoCount} Dezenas (${params.totalJogos} Jogos • ${garantiaText})`;
  const resumoFiltros = params.filterSummary || 'Filtros: Soma 180-215 | Pares 6-9 | Moldura 8-12 | Primos 4-6 | Fib 3-5 | Rep 6-10';

  return `Concurso Alvo #${concursoAlvo} (Base #${concursoBase}) • ${tipoClean} • ${resumoMatriz} [${resumoFiltros}]`;
}

const STORAGE_KEY = 'lotosniper_saved_prognosticos';
const INITIALIZED_KEY = 'lotosniper_prognosticos_initialized';
const TOMBSTONES_KEY = 'lotosniper_deleted_fechamento_ids';

/**
 * Retorna o conjunto de IDs de fechamentos que foram deletados pelo usuário.
 * Isso impede que sincronizações de rede tragam de volta (resurrect) fechamentos já excluídos.
 */
export function getDeletedFechamentoIds(): Set<string> {
  try {
    const raw = localStorage.getItem(TOMBSTONES_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

/**
 * Registra IDs excluídos no tombstone persistente.
 */
export function recordDeletedFechamentoIds(ids: string[]): void {
  try {
    const current = getDeletedFechamentoIds();
    ids.forEach((id) => current.add(id));
    const arr = Array.from(current).slice(-500); // Mantém até 500 tombstones
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(arr));
  } catch {}
}

/**
 * Remove o ID do tombstone se o usuário criar ou re-salvar explicitamente o fechamento.
 */
export function unmarkDeletedFechamentoId(id: string): void {
  try {
    const current = getDeletedFechamentoIds();
    if (current.has(id)) {
      current.delete(id);
      localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(Array.from(current)));
    }
  } catch {}
}

export function normalizeSavedFechamento(
  item: any,
  fallbackIndex: number = 0
): SavedFechamentoPrognostico {
  if (!item || typeof item !== 'object') {
    return createInitialSampleFechamento();
  }

  const id = item.id ? String(item.id) : `fechamento-${Date.now()}-${fallbackIndex}`;
  const concurso = resolveConcursoBase(item.concurso, 3824);
  const concursoAlvo = resolveConcursoAlvo(concurso, item.concursoAlvo);
  const dataConcurso = item.dataConcurso ? String(item.dataConcurso) : '';
  const dataCriacao = item.dataCriacao ? String(item.dataCriacao) : new Date().toLocaleString('pt-BR');

  // Tipo de fechamento com fallback estrito e garantia de string
  const rawTipo =
    item.tipoFechamento ||
    item.nome ||
    item.name ||
    item.strategyName ||
    item.modeName ||
    item.modalidadeMatriz ||
    'Fechamento Clássico';
  const strippedTipo = stripConcursoAlvoPrefix(String(rawTipo));
  const tipoFechamento = (strippedTipo.includes(' • ') ? strippedTipo.split(' • ')[0].trim() : strippedTipo) || 'Fechamento Clássico';

  const rawModalidade =
    item.modalidadeMatriz ||
    item.garantia ||
    'Matriz Pro (Garantia 14 se 15)';
  const modalidadeMatriz = String(rawModalidade);

  // Extração segura de tickets
  let rawTickets: any[] = [];
  if (Array.isArray(item.tickets)) {
    rawTickets = item.tickets;
  } else if (Array.isArray(item.jogos)) {
    rawTickets = item.jogos;
  } else if (Array.isArray(item.dezenas) && item.dezenas.length >= 15) {
    // O próprio objeto era um ticket individual salvo erroneamente
    rawTickets = [item];
  }

  const tickets: GameTicket[] = rawTickets.map((t: any, idx: number) => {
    const rawDez = Array.isArray(t?.dezenas)
      ? t.dezenas
      : Array.isArray(t?.numbers)
      ? t.numbers
      : [];
    const dezenas = rawDez
      .filter((n: any) => typeof n === 'number' && n >= 1 && n <= 25)
      .sort((a: number, b: number) => a - b);
    const validDez =
      dezenas.length === 15
        ? dezenas
        : dezenas.length > 0
        ? dezenas.slice(0, 15)
        : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    const soma = typeof t?.soma === 'number' ? t.soma : validDez.reduce((a: number, b: number) => a + b, 0);
    const pares = typeof t?.pares === 'number' ? t.pares : validDez.filter((n: number) => n % 2 === 0).length;
    const impares = typeof t?.impares === 'number' ? t.impares : 15 - pares;
    const primos =
      typeof t?.primos === 'number'
        ? t.primos
        : validDez.filter((n: number) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
    const moldura =
      typeof t?.moldura === 'number'
        ? t.moldura
        : validDez.filter((n: number) => MOLDURA.includes(n)).length;

    return {
      id: t?.id ? String(t.id) : `ticket-${idx + 1}`,
      index: typeof t?.index === 'number' ? t.index : idx + 1,
      dezenas: validDez,
      soma,
      pares,
      impares,
      primos,
      moldura,
      fibonacci:
        typeof t?.fibonacci === 'number'
          ? t.fibonacci
          : validDez.filter((n: number) => FIBONACCI_NUMBERS.includes(n)).length,
      miolo: 15 - moldura,
      repetidas: typeof t?.repetidas === 'number' ? t.repetidas : 9,
      maxConsecutivas: typeof t?.maxConsecutivas === 'number' ? t.maxConsecutivas : 4,
      scoreIA: typeof t?.scoreIA === 'number' ? t.scoreIA : 92,
      auditoriaAnomalias: t?.auditoriaAnomalias || 'Conforme filtros',
      ...(Array.isArray(t?.tags) ? { tags: t.tags.map((tag: any) => String(tag)) } : {}),
    };
  });

  // Universo de dezenas
  let universoDezenas: number[] = Array.isArray(item.universoDezenas)
    ? item.universoDezenas.filter((n: any) => typeof n === 'number' && n >= 1 && n <= 25)
    : Array.isArray(item.selectedNumbers)
    ? item.selectedNumbers.filter((n: any) => typeof n === 'number' && n >= 1 && n <= 25)
    : [];

  if (universoDezenas.length === 0 && tickets.length > 0) {
    const set = new Set<number>();
    tickets.forEach((t) => t.dezenas.forEach((d) => set.add(d)));
    universoDezenas = Array.from(set).sort((a, b) => a - b);
  }
  if (universoDezenas.length === 0) {
    universoDezenas = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 22, 23, 24, 25];
  }

  const dezenasFixas: number[] = Array.isArray(item.dezenasFixas)
    ? item.dezenasFixas.filter((n: any) => typeof n === 'number' && universoDezenas.includes(n))
    : [];

  const dezenasExcluidas: number[] = Array.isArray(item.dezenasExcluidas)
    ? item.dezenasExcluidas.filter((n: any) => typeof n === 'number')
    : [];

  const totalJogos =
    typeof item.totalJogos === 'number' && item.totalJogos > 0
      ? item.totalJogos
      : tickets.length > 0
      ? tickets.length
      : 1;

  const custoTotal =
    typeof item.custoTotal === 'number' && item.custoTotal > 0
      ? item.custoTotal
      : totalJogos * VALOR_APOSTA_LOTOFACIL;

  const faixaSoma = {
    min: typeof item.faixaSoma?.min === 'number' ? item.faixaSoma.min : 180,
    max: typeof item.faixaSoma?.max === 'number' ? item.faixaSoma.max : 215,
    zonaOuro: item.faixaSoma?.zonaOuro ? String(item.faixaSoma.zonaOuro) : '190 a 210',
  };

  const paridade = {
    minPares: typeof item.paridade?.minPares === 'number' ? item.paridade.minPares : 6,
    maxPares: typeof item.paridade?.maxPares === 'number' ? item.paridade.maxPares : 9,
    canonico: item.paridade?.canonico ? String(item.paridade.canonico) : '7P/8I ou 8P/7I',
  };

  const repetidas = {
    min: typeof item.repetidas?.min === 'number' ? item.repetidas.min : 8,
    max: typeof item.repetidas?.max === 'number' ? item.repetidas.max : 10,
    concursoRef:
      typeof item.repetidas?.concursoRef === 'number'
        ? item.repetidas.concursoRef
        : concurso,
  };

  const moldura = {
    min: typeof item.moldura?.min === 'number' ? item.moldura.min : 8,
    max: typeof item.moldura?.max === 'number' ? item.moldura.max : 11,
  };

  const primos = {
    min: typeof item.primos?.min === 'number' ? item.primos.min : 4,
    max: typeof item.primos?.max === 'number' ? item.primos.max : 7,
  };

  const fibonacci = {
    min: typeof item.fibonacci?.min === 'number' ? item.fibonacci.min : 3,
    max: typeof item.fibonacci?.max === 'number' ? item.fibonacci.max : 6,
  };

  const maxConsecutivas =
    typeof item.maxConsecutivas === 'number' ? item.maxConsecutivas : 5;

  const auditoriaAnomalias =
    typeof item.auditoriaAnomalias === 'string'
      ? item.auditoriaAnomalias
      : `${totalJogos}/${totalJogos} bilhetes dentro da faixa`;

  const filterSummary = buildStandardFilterSummary({
    faixaSoma,
    paridade,
    moldura,
    primos,
    fibonacci,
    repetidas,
    dezenasFixas,
    dezenasExcluidas,
  });

  const nomeFechamento = formatStandardFechamentoTitle({
    concursoBase: concurso,
    concursoAlvo,
    tipoFechamento,
    modalidadeMatriz,
    universoCount: universoDezenas.length,
    totalJogos,
    filterSummary,
  });

  return {
    id,
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
    dataCriacao,
    concurso,
    concursoAlvo,
    dataConcurso,
    nomeFechamento,
    tipoFechamento,
    modalidadeMatriz,
    universoDezenas,
    dezenasFixas,
    dezenasExcluidas,
    faixaSoma,
    paridade,
    maxConsecutivas,
    auditoriaAnomalias,
    repetidas,
    moldura,
    primos,
    fibonacci,
    tickets,
    totalJogos,
    custoTotal,
  };
}

export function getSavedFechamentos(): SavedFechamentoPrognostico[] {
  try {
    const isInitialized = localStorage.getItem(INITIALIZED_KEY) === 'true';
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!isInitialized) {
      localStorage.setItem(INITIALIZED_KEY, 'true');
      const sample = createInitialSampleFechamento();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
      return [sample];
    }

    if (!raw) return [];
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    let needsRepair = false;
    const normalized = parsed
      .filter((p) => p && typeof p === 'object')
      .map((item, idx) => {
        if (!item.tipoFechamento || !Array.isArray(item.tickets) || !item.modalidadeMatriz || !item.concursoAlvo || !item.nomeFechamento) {
          needsRepair = true;
        }
        return normalizeSavedFechamento(item, idx);
      });

    // Se encontramos dados corrompidos ou não normalizados, corrigimos imediatamente no localStorage
    if (needsRepair && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        localStorage.setItem('lotosniper_saved_fechamentos', JSON.stringify(normalized));
      } catch {}
    }

    const sorted = [...normalized].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted;
  } catch (err) {
    console.warn('[LotoSniper] Erro ao carregar fechamentos salvos:', err);
    return [];
  }
}

export async function syncWithMySQLHostinger(): Promise<{
  connected: boolean;
  database: string;
  user: string;
  site: string;
  totalSaved: number;
  message: string;
}> {
  try {
    const res = await fetch('/api/mysql/status');
    if (res.ok) {
      const statusData = await res.json();

      // Envia os fechamentos locais para o MySQL
      const localList = getSavedFechamentos();
      for (const f of localList) {
        try {
          await fetch('/api/mysql/fechamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(f),
          });
        } catch {}
      }

      // Busca fechamentos remotos do MySQL e mescla
      try {
        const fetchRes = await fetch('/api/mysql/fechamentos');
        if (fetchRes.ok) {
          const fetchJson = await fetchRes.json();
          if (fetchJson.success && Array.isArray(fetchJson.fechamentos) && fetchJson.fechamentos.length > 0) {
            const remote = fetchJson.fechamentos;
            const deletedIds = getDeletedFechamentoIds();

            // Purgar no servidor qualquer fechamento que foi previamente deletado localmente
            const ghosts = remote.filter((r: any) => deletedIds.has(r.id));
            if (ghosts.length > 0) {
              fetch('/api/mysql/fechamentos', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: ghosts.map((g: any) => g.id) }),
              }).catch(() => {});
            }

            // Apenas adiciona ao local fechamentos remotos que NÃO foram deletados e não constam no local
            const existingIds = new Set(localList.map((x) => x.id));
            const toAdd = remote.filter((r: any) => !existingIds.has(r.id) && !deletedIds.has(r.id));
            if (toAdd.length > 0) {
              const merged = [...localList, ...toAdd];
              localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: merged }));
              }
            }
          }
        }
      } catch {}

      return {
        connected: !!statusData.connected,
        database: statusData.database || 'u376010332_LotoSniper',
        user: statusData.user || 'u376010332_LotoSniper',
        site: statusData.site || 'lotosniper.com.br',
        totalSaved: statusData.totalSaved || localList.length,
        message: statusData.statusText || 'Sincronizado com Hostinger MySQL',
      };
    }
  } catch (err: any) {
    console.warn('[MySQL Sync] Erro ao sincronizar com backend MySQL:', err);
  }

  return {
    connected: false,
    database: 'u376010332_LotoSniper',
    user: 'u376010332_LotoSniper',
    site: 'lotosniper.com.br',
    totalSaved: getSavedFechamentos().length,
    message: 'Armazenamento em cache local ativo (Pronto para sincronização MySQL Hostinger)',
  };
}

/**
 * Computa um hash canônico determinístico para a matriz de apostas de um fechamento.
 * Cada aposta tem suas dezenas ordenadas e todos os bilhetes são ordenados em ordem lexicográfica.
 */
export function computeFechamentoHash(tickets: GameTicket[]): string {
  if (!tickets || tickets.length === 0) return '';
  return tickets
    .map((t) => [...t.dezenas].sort((a, b) => a - b).join('-'))
    .sort()
    .join('|');
}

/**
 * Verifica se um fechamento é duplicado antes da persistência:
 * 1. Verifica se já existe um fechamento com hash idêntico
 * 2. Verifica se 100% dos tickets já existem salvos em outros fechamentos
 */
export function checkFechamentoDuplicateStatus(tickets: GameTicket[]): {
  isDuplicate: boolean;
  reason?: 'IDENTICAL_HASH' | 'ALL_TICKETS_EXIST';
  message?: string;
  existingClosureId?: string;
  repeatedCount: number;
  totalTickets: number;
} {
  if (!tickets || tickets.length === 0) {
    return { isDuplicate: false, repeatedCount: 0, totalTickets: 0 };
  }

  const newHash = computeFechamentoHash(tickets);
  const list = getSavedFechamentos();
  const savedTicketsSet = getAllSavedTicketsSet();

  // 1. Verificação por Hash Idêntico
  for (const saved of list) {
    const savedHash = computeFechamentoHash(saved.tickets || []);
    if (savedHash && savedHash === newHash) {
      return {
        isDuplicate: true,
        reason: 'IDENTICAL_HASH',
        message: `Fechamento idêntico já cadastrado (${saved.tipoFechamento || saved.id}).`,
        existingClosureId: saved.id,
        repeatedCount: tickets.length,
        totalTickets: tickets.length,
      };
    }
  }

  // 2. Verificação de 100% dos bilhetes já salvos
  let repeatedTickets = 0;
  for (const t of tickets) {
    if (t.dezenas && t.dezenas.length === 15) {
      const key = [...t.dezenas].sort((a, b) => a - b).join('-');
      if (savedTicketsSet.has(key)) {
        repeatedTickets++;
      }
    }
  }

  if (repeatedTickets === tickets.length && tickets.length > 0) {
    return {
      isDuplicate: true,
      reason: 'ALL_TICKETS_EXIST',
      message: '100% dos bilhetes deste fechamento já estão salvos em outros fechamentos.',
      repeatedCount: repeatedTickets,
      totalTickets: tickets.length,
    };
  }

  return {
    isDuplicate: false,
    repeatedCount: repeatedTickets,
    totalTickets: tickets.length,
  };
}

export function saveFechamentoPrognostico(
  fechamento: SavedFechamentoPrognostico,
  options: { force?: boolean } = {}
): { success: boolean; isDuplicate?: boolean; reason?: string } {
  try {
    localStorage.setItem(INITIALIZED_KEY, 'true');
    const list = getSavedFechamentos();

    // Sanitização estrita de universoDezenas e dezenasFixas
    const universe = [...new Set(fechamento.universoDezenas || [])].sort((a, b) => a - b);
    const universeSet = new Set(universe);
    const rawFixas = (fechamento.dezenasFixas || []).filter((d) => universeSet.has(d));
    const maxFixas = Math.min(12, Math.max(0, universe.length - 3));
    fechamento.dezenasFixas = rawFixas.slice(0, maxFixas).sort((a, b) => a - b);
    fechamento.universoDezenas = universe;
    fechamento.auditoriaAnomalias = auditarTicketsGerados(fechamento.tickets || []).resumo;

    // Garantia explícita do Concurso Alvo e Nomenclatura Padronizada
    const concursoBase = resolveConcursoBase(fechamento.concurso);
    const concursoAlvo = resolveConcursoAlvo(concursoBase, fechamento.concursoAlvo);
    fechamento.concurso = concursoBase;
    fechamento.concursoAlvo = concursoAlvo;
    if (!fechamento.nomeFechamento || !fechamento.nomeFechamento.startsWith(`Concurso Alvo #${concursoAlvo}`)) {
      fechamento.nomeFechamento = formatStandardFechamentoTitle({
        concursoBase,
        concursoAlvo,
        tipoFechamento: fechamento.tipoFechamento,
        modalidadeMatriz: fechamento.modalidadeMatriz,
        universoCount: universe.length,
        totalJogos: fechamento.totalJogos || fechamento.tickets?.length || 0,
        filterSummary: buildStandardFilterSummary(fechamento),
      });
    }

    // Verificação de Hash / Duplicidade contra registros existentes
    if (!options.force) {
      const check = checkFechamentoDuplicateStatus(fechamento.tickets);
      if (check.isDuplicate) {
        console.warn(`[LotoSniper Anti-Duplicata] Bloqueio de salvamento: ${check.message}`);
        return {
          success: false,
          isDuplicate: true,
          reason: check.message,
        };
      }
    }

    // Prepend new prognostic
    unmarkDeletedFechamentoId(fechamento.id);
    const updated = [fechamento, ...list.filter((f) => f.id !== fechamento.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 200))); // Keep up to 200
    localStorage.setItem('lotosniper_saved_fechamentos', JSON.stringify(updated.slice(0, 200)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: updated }));
      window.dispatchEvent(
        new CustomEvent('lotosniper-fechamento-saved-alert', {
          detail: {
            id: fechamento.id,
            title: '✓ Fechamento Salvo com Sucesso!',
            name: fechamento.nomeFechamento || fechamento.tipoFechamento,
            totalJogos: fechamento.totalJogos || fechamento.tickets?.length || 24,
            garantia: fechamento.modalidadeMatriz,
            concurso: fechamento.concurso,
            concursoAlvo: fechamento.concursoAlvo,
            timestamp: fechamento.timestamp,
          },
        })
      );
    }

    // Grava de forma assíncrona no Banco de Dados MySQL da Hostinger (u376010332_LotoSniper)
    fetch('/api/mysql/fechamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fechamento),
    })
      .then((r) => r.json())
      .then((res) => {
        console.log('[Hostinger MySQL] Fechamento salvo no banco MySQL:', res);
      })
      .catch((err) => {
        console.warn('[Hostinger MySQL] Sincronização offline, mantido em cache local seguro:', err);
      });

    return { success: true, isDuplicate: false };
  } catch (e: any) {
    console.error('Falha ao salvar fechamento:', e);
    return { success: false, reason: e?.message || 'Erro ao persistir fechamento' };
  }
}

export function deleteSavedFechamento(id: string): SavedFechamentoPrognostico[] {
  try {
    localStorage.setItem(INITIALIZED_KEY, 'true');
    recordDeletedFechamentoIds([id]);
    const list = getSavedFechamentos();
    const updated = list.filter((f) => f.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: updated }));
    }

    // Exclui de forma assíncrona no Banco de Dados MySQL da Hostinger e no cache local
    fetch(`/api/mysql/fechamentos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
      .then((r) => r.json())
      .then((res) => {
        console.log(`[Hostinger MySQL] Fechamento ${id} deletado no banco:`, res);
      })
      .catch((err) => {
        console.warn(`[Hostinger MySQL] Exclusão offline gravada no tombstone para o ID ${id}:`, err);
      });

    return updated;
  } catch (e) {
    console.error('Falha ao excluir fechamento salvo:', e);
    return [];
  }
}

export function deleteMultipleSavedFechamentos(ids: string[]): SavedFechamentoPrognostico[] {
  try {
    localStorage.setItem(INITIALIZED_KEY, 'true');
    recordDeletedFechamentoIds(ids);
    const idsSet = new Set(ids);
    const list = getSavedFechamentos();
    const updated = list.filter((f) => !idsSet.has(f.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: updated }));
    }

    // Exclui em lote no Banco de Dados MySQL da Hostinger
    fetch('/api/mysql/fechamentos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((res) => {
        console.log(`[Hostinger MySQL] ${ids.length} fechamentos excluídos em lote no banco:`, res);
      })
      .catch((err) => {
        console.warn('[Hostinger MySQL] Erro ao deletar múltiplos fechamentos:', err);
      });

    return updated;
  } catch (e) {
    console.error('Falha ao excluir múltiplos fechamentos salvos:', e);
    return [];
  }
}

/**
 * Retorna um Set com todas as combinações de 15 dezenas já salvas em Meus Jogos
 * Formato da chave canônica: "1-2-3-4-5-6-7-8-9-10-11-12-13-14-15"
 */
export function getAllSavedTicketsSet(): Set<string> {
  const set = new Set<string>();
  try {
    const list = getSavedFechamentos();
    for (const f of list) {
      if (Array.isArray(f.tickets)) {
        for (const t of f.tickets) {
          if (Array.isArray(t.dezenas) && t.dezenas.length === 15) {
            const sortedKey = [...t.dezenas].sort((a, b) => a - b).join('-');
            set.add(sortedKey);
          }
        }
      }
    }
  } catch {}
  return set;
}

export interface DuplicateFechamentosReport {
  totalFechamentos: number;
  duplicateCount: number;
  duplicateClosureIds: string[];
  redundantTicketsCount: number;
  uniqueTicketCount: number;
  totalTicketsCount: number;
  uniqueMatrixCount: number;
  diversityRatePercent: number;
  redundancyRatePercent: number;
  hasLowVarianceAlert: boolean;
  duplicateReasons: Record<string, string>;
}

/**
 * Diagnostica fechamentos idênticos ou que contenham 100% de tickets repetidos já salvos
 */
export function getDuplicateFechamentosReport(): DuplicateFechamentosReport {
  const list = getSavedFechamentos();
  const seenMatrixSignatures = new Map<string, string>(); // signature -> first id
  const duplicateClosureIds: string[] = [];
  const duplicateReasons: Record<string, string> = {};
  const seenTickets = new Set<string>();
  let redundantTicketsCount = 0;
  let totalTicketsCount = 0;

  // Primeiro passo: Identifica matrizes exatamente idênticas (mesmo hash canônico)
  for (const f of list) {
    const hash = computeFechamentoHash(f.tickets || []);
    if (hash.length > 0) {
      if (seenMatrixSignatures.has(hash)) {
        duplicateClosureIds.push(f.id);
        duplicateReasons[f.id] = `Matriz 100% idêntica ao fechamento ${seenMatrixSignatures.get(hash)}`;
      } else {
        seenMatrixSignatures.set(hash, f.id);
      }
    }
  }

  // Segundo passo: Para os fechamentos não marcados por hash idêntico,
  // verifica se 100% dos seus bilhetes já existem no conjunto acumulado dos fechamentos anteriores
  const cumulativeTickets = new Set<string>();
  for (const f of list) {
    const tickets = f.tickets || [];
    totalTicketsCount += tickets.length;

    let ticketsInThisClosureExisting = 0;
    for (const t of tickets) {
      if (Array.isArray(t.dezenas) && t.dezenas.length === 15) {
        const key = [...t.dezenas].sort((a, b) => a - b).join('-');
        if (cumulativeTickets.has(key)) {
          ticketsInThisClosureExisting++;
        }
        if (seenTickets.has(key)) {
          redundantTicketsCount++;
        } else {
          seenTickets.add(key);
        }
      }
    }

    // Se todos os bilhetes deste fechamento já existiam antes e ele ainda não foi marcado
    if (
      tickets.length > 0 &&
      ticketsInThisClosureExisting === tickets.length &&
      !duplicateClosureIds.includes(f.id)
    ) {
      duplicateClosureIds.push(f.id);
      duplicateReasons[f.id] = 'Todos os 100% dos bilhetes já foram salvos em outros fechamentos anteriores';
    }

    // Adiciona os bilhetes deste fechamento ao cumulativo
    for (const t of tickets) {
      if (Array.isArray(t.dezenas) && t.dezenas.length === 15) {
        cumulativeTickets.add([...t.dezenas].sort((a, b) => a - b).join('-'));
      }
    }
  }

  const uniqueMatrixCount = seenMatrixSignatures.size;
  const total = list.length;
  const diversityRatePercent = total > 0 ? Math.round((uniqueMatrixCount / total) * 100) : 100;
  const redundancyRatePercent =
    totalTicketsCount > 0 ? Math.round((redundantTicketsCount / totalTicketsCount) * 100) : 0;
  const hasLowVarianceAlert = diversityRatePercent < 80 || duplicateClosureIds.length > 0;

  return {
    totalFechamentos: total,
    duplicateCount: duplicateClosureIds.length,
    duplicateClosureIds,
    redundantTicketsCount,
    uniqueTicketCount: seenTickets.size,
    totalTicketsCount,
    uniqueMatrixCount,
    diversityRatePercent,
    redundancyRatePercent,
    hasLowVarianceAlert,
    duplicateReasons,
  };
}

/**
 * Remove automaticamente todos os fechamentos duplicados mantendo apenas os originais únicos
 */
export function removeDuplicateFechamentos(): {
  removedCount: number;
  remainingCount: number;
  details: string;
} {
  const report = getDuplicateFechamentosReport();
  if (report.duplicateClosureIds.length === 0) {
    return {
      removedCount: 0,
      remainingCount: report.totalFechamentos,
      details: 'Nenhum fechamento duplicado encontrado.',
    };
  }
  const updated = deleteMultipleSavedFechamentos(report.duplicateClosureIds);
  return {
    removedCount: report.duplicateClosureIds.length,
    remainingCount: updated.length,
    details: `${report.duplicateClosureIds.length} fechamento(s) cópias/redundantes removidos com sucesso.`,
  };
}

export function clearAllSavedFechamentos(): void {
  try {
    localStorage.setItem(INITIALIZED_KEY, 'true');
    const existing = getSavedFechamentos();
    if (existing.length > 0) {
      recordDeletedFechamentoIds(existing.map((f) => f.id));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: [] }));
    }

    // Exclui todos os registros no Banco de Dados MySQL da Hostinger e limpa o cache
    fetch('/api/mysql/fechamentos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
      .then((r) => r.json())
      .then((res) => {
        console.log('[Hostinger MySQL] Todos os fechamentos foram removidos do banco MySQL:', res);
      })
      .catch((err) => {
        console.warn('[Hostinger MySQL] Erro ao limpar todos os fechamentos no backend:', err);
      });
  } catch (e) {
    console.error('Falha ao limpar todos os fechamentos salvos:', e);
  }
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

  const sampleConcurso = 3815;
  const sampleConcursoAlvo = sampleConcurso + 1;
  const sampleFaixaSoma = { min: 175, max: 220, zonaOuro: '190 a 210' };
  const sampleParidade = { minPares: 7, maxPares: 8, canonico: '7P/8I ou 8P/7I' };
  const sampleMoldura = { min: 8, max: 11 };
  const samplePrimos = { min: 4, max: 7 };
  const sampleFibonacci = { min: 3, max: 5 };
  const sampleRepetidas = { min: 8, max: 10, concursoRef: sampleConcurso };
  const sampleTipo = 'Gerador Turbo (Força Bruta 14 Pts • 17ms)';
  const sampleModalidade = '21 Dezenas Amplo (18 Jogos • Garantia 14 se 15)';

  return {
    id: 'fechamento-amplo-21-turbo',
    timestamp: Date.now() - 3600000,
    dataCriacao: new Date(Date.now() - 3600000).toLocaleString('pt-BR'),
    concurso: sampleConcurso,
    concursoAlvo: sampleConcursoAlvo,
    dataConcurso: '24/10/2026',
    nomeFechamento: formatStandardFechamentoTitle({
      concursoBase: sampleConcurso,
      concursoAlvo: sampleConcursoAlvo,
      tipoFechamento: sampleTipo,
      modalidadeMatriz: sampleModalidade,
      universoCount: universo.length,
      totalJogos: 18,
      garantia: 'Garantia 14 se 15',
      filterSummary: buildStandardFilterSummary({
        faixaSoma: sampleFaixaSoma,
        paridade: sampleParidade,
        moldura: sampleMoldura,
        primos: samplePrimos,
        fibonacci: sampleFibonacci,
        repetidas: sampleRepetidas,
        dezenasFixas: [1, 2],
      }),
    }),
    tipoFechamento: sampleTipo,
    modalidadeMatriz: sampleModalidade,
    universoDezenas: universo,
    dezenasFixas: [1, 2],
    dezenasExcluidas: [],
    faixaSoma: sampleFaixaSoma,
    paridade: sampleParidade,
    maxConsecutivas: 5,
    auditoriaAnomalias: 'Todos os bilhetes foram auditados com 0 anomalias estatísticas',
    repetidas: sampleRepetidas,
    moldura: sampleMoldura,
    primos: samplePrimos,
    fibonacci: sampleFibonacci,
    tickets: sampleTickets,
    totalJogos: 18,
    custoTotal: 18 * VALOR_APOSTA_LOTOFACIL,
  };
}

/**
 * Converts a list of tickets into text formatted for "Entrada de Jogos para Conferência"
 */
export function formatTicketsForConferenciaInput(tickets: GameTicket[]): string {
  if (!tickets || !Array.isArray(tickets) || tickets.length === 0) return '';
  return tickets
    .map((t, idx) => {
      const rawDez = Array.isArray(t?.dezenas) ? t.dezenas : ((t as any)?.numbers || []);
      const dezenasStr = rawDez
        .map((n: number) => Number(n).toString().padStart(2, '0'))
        .join(' - ');
      return `Jogo ${(t?.index ?? idx + 1).toString().padStart(2, '0')}: ${dezenasStr}`;
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

  const universe = [...new Set(universoDezenas)].sort((a, b) => a - b);
  const universeSet = new Set(universe);
  const rawFixas = (dezenasFixas || []).filter((d) => universeSet.has(d));
  const maxFixas = Math.min(12, Math.max(0, universe.length - 3));
  const sanitizedFixas = rawFixas.slice(0, maxFixas).sort((a, b) => a - b);
  const auditRes = auditarTicketsGerados(tickets);

  const concursoBase = resolveConcursoBase(concurso, 3824);
  const concursoAlvo = Number(concursoBase) + 1;
  const faixaSomaObj = {
    min: filters?.somaMin ?? 180,
    max: filters?.somaMax ?? 220,
    zonaOuro: '190 a 210',
  };
  const paridadeObj = {
    minPares: filters?.paresMin ?? 6,
    maxPares: filters?.paresMax ?? 9,
    canonico: '6 a 9 Pares (Banda Flexível)',
  };
  const repetidasObj = {
    min: filters?.repetidasMin ?? 6,
    max: filters?.repetidasMax ?? 11,
    concursoRef: concursoBase,
  };
  const molduraObj = {
    min: filters?.molduraMin ?? 8,
    max: filters?.molduraMax ?? 11,
  };
  const primosObj = {
    min: filters?.primosMin ?? 4,
    max: filters?.primosMax ?? 7,
  };
  const fibonacciObj = {
    min: filters?.fibonacciMin ?? 3,
    max: filters?.fibonacciMax ?? 5,
  };
  const sanitizedExcluidas = [...dezenasExcluidas].sort((a, b) => a - b);

  const nomePadronizado = formatStandardFechamentoTitle({
    concursoBase,
    concursoAlvo,
    tipoFechamento,
    modalidadeMatriz,
    universoCount: universe.length,
    totalJogos,
    filterSummary: buildStandardFilterSummary({
      faixaSoma: faixaSomaObj,
      paridade: paridadeObj,
      moldura: molduraObj,
      primos: primosObj,
      fibonacci: fibonacciObj,
      repetidas: repetidasObj,
      dezenasFixas: sanitizedFixas,
      dezenasExcluidas: sanitizedExcluidas,
    }),
  });

  const prognostico: SavedFechamentoPrognostico = {
    id: `fechamento-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    dataCriacao: now.toLocaleString('pt-BR'),
    concurso: concursoBase,
    concursoAlvo,
    dataConcurso,
    nomeFechamento: nomePadronizado,
    tipoFechamento: stripConcursoAlvoPrefix(tipoFechamento) || tipoFechamento,
    modalidadeMatriz,
    universoDezenas: universe,
    dezenasFixas: sanitizedFixas,
    dezenasExcluidas: sanitizedExcluidas,
    faixaSoma: faixaSomaObj,
    paridade: paridadeObj,
    maxConsecutivas: filters?.maxConsecutivas ?? 6,
    auditoriaAnomalias: auditRes.resumo,
    repetidas: repetidasObj,
    moldura: molduraObj,
    primos: primosObj,
    fibonacci: fibonacciObj,
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
  concursoBase?: number;
  concursoAlvo?: number;
  nomeArquivo?: string;
  totalFechamentos: number;
  fechamentos: SavedFechamentoPrognostico[];
}

export function triggerAutoBackupSnapshot(concursoBaseFallback?: number): void {
  try {
    const list = getSavedFechamentos();
    const snapshotsRaw = localStorage.getItem(BACKUP_SNAPSHOTS_KEY);
    const snapshots: BackupSnapshot[] = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];

    const concursoBase = resolveConcursoBase(concursoBaseFallback ?? list[0]?.concurso, 3824);
    const concursoAlvo = Number(concursoBase) + 1;
    const dataFormatada = new Date().toISOString().slice(0, 10);
    const nomeArquivo = formatBackupJsonFilename(concursoAlvo, dataFormatada);

    const newSnapshot: BackupSnapshot = {
      id: `snap-${Date.now()}`,
      data: new Date().toLocaleString('pt-BR'),
      timestamp: Date.now(),
      concursoBase,
      concursoAlvo,
      nomeArquivo,
      totalFechamentos: list.length,
      fechamentos: list,
    };

    // Mantém os 5 snapshots mais recentes
    const updated = [newSnapshot, ...snapshots.slice(0, 4)];
    localStorage.setItem(BACKUP_SNAPSHOTS_KEY, JSON.stringify(updated));
    localStorage.setItem('lotosniper_last_backup_filename', nomeArquivo);
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

export function exportBackupJSON(concursoBaseFallback?: number): void {
  const list = getSavedFechamentos();
  const concursoBase = resolveConcursoBase(concursoBaseFallback ?? list[0]?.concurso, 3824);
  const concursoAlvo = Number(concursoBase) + 1;
  const dataFormatada = new Date().toISOString().slice(0, 10);
  const fileName = formatBackupJsonFilename(concursoAlvo, dataFormatada);

  const backupData = {
    app: 'LotoSniper AI Pro',
    versao: '2026.5',
    concursoBase,
    concursoAlvo,
    nomeArquivo: fileName,
    dataExportacao: new Date().toISOString(),
    totalFechamentos: list.length,
    fechamentos: list,
  };

  try {
    localStorage.setItem('lotosniper_last_backup_filename', fileName);
  } catch {}

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Utilitário de Migração & Sanitização Forense
 * Percorre o array de fechamentos no LocalStorage (ou backup passado como argumento):
 * - Aplica a sanitização estrita de 'dezenasFixas' (removendo dezenas fora do universo e limitando a no máximo 12 fixas).
 * - Corrige a integridade de qualquer ticket que contenha dezenas inválidas fora do 'universoDezenas',
 *   substituindo números estranhos por dezenas válidas do universo e recalculando as métricas estatísticas.
 * - Recomputa a auditoria de anomalias com auditarTicketsGerados.
 * - Persiste as correções no LocalStorage e dispara evento de sincronização em tempo real.
 */
import { sanitizarFechamentosSalvos } from './sanitizer';
export { sanitizarFechamentosSalvos };
export type { SanitizerReport } from './sanitizer';

export function inspectBackupJSONPreview(jsonString: string): {
  valid: boolean;
  app?: string;
  versao?: string;
  dataExportacao?: string;
  totalFechamentos: number;
  totalTickets: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.fechamentos)
      ? parsed.fechamentos
      : Array.isArray(parsed?.meusJogos?.fechamentosSalvos)
      ? parsed.meusJogos.fechamentosSalvos
      : null;

    if (!list || list.length === 0) {
      return {
        valid: false,
        totalFechamentos: 0,
        totalTickets: 0,
        error: 'Nenhum fechamento válido encontrado no arquivo JSON.',
      };
    }

    const totalTickets = list.reduce(
      (acc: number, item: any) =>
        acc + (Array.isArray(item?.tickets) ? item.tickets.length : Array.isArray(item?.jogos) ? item.jogos.length : Array.isArray(item?.dezenas) ? 1 : 0),
      0
    );

    return {
      valid: true,
      app: parsed?.app ? String(parsed.app) : 'LotoSniper AI Pro',
      versao: parsed?.versao ? String(parsed.versao) : undefined,
      dataExportacao: parsed?.dataExportacao || parsed?.dataHoraFormatada || undefined,
      totalFechamentos: list.length,
      totalTickets,
    };
  } catch {
    return {
      valid: false,
      totalFechamentos: 0,
      totalTickets: 0,
      error: 'Arquivo JSON inválido ou corrompido.',
    };
  }
}

export function restoreBackupJSON(
  jsonString: string,
  mode: 'merge' | 'replace' = 'merge'
): {
  success: boolean;
  count: number;
  totalAfter?: number;
  totalTickets?: number;
  sanitizedCount?: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    let fechamentosToRestore = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.fechamentos)
      ? parsed.fechamentos
      : Array.isArray(parsed?.meusJogos?.fechamentosSalvos)
      ? parsed.meusJogos.fechamentosSalvos
      : null;

    // Retrocompatibilidade com backups gerados por handleExportBackup (savedTickets)
    if ((!fechamentosToRestore || fechamentosToRestore.length === 0) && Array.isArray(parsed?.savedTickets) && parsed.savedTickets.length > 0) {
      const concursoBase = resolveConcursoBase(
        parsed?.concursoReferencia ?? parsed?.concursoBase ?? parsed?.fechamentoMeta?.concurso,
        3824
      );
      const concursoAlvo = resolveConcursoAlvo(concursoBase, parsed?.concursoAlvo);
      const universo = Array.from(
        new Set<number>(parsed.savedTickets.flatMap((t: any) => (Array.isArray(t?.dezenas) ? t.dezenas : [])))
      ).sort((a, b) => a - b);
      fechamentosToRestore = [
        {
          id: `backup-${Date.now()}`,
          timestamp: parsed?.exportedAt ? new Date(parsed.exportedAt).getTime() || Date.now() : Date.now(),
          dataCriacao: new Date().toLocaleString('pt-BR'),
          concurso: concursoBase,
          concursoAlvo,
          dataConcurso: parsed?.dataConcurso || '',
          tipoFechamento: parsed?.fechamentoMeta?.strategyName || parsed?.fechamentoMeta?.modeName || 'Fechamento Importado (Backup JSON)',
          modalidadeMatriz: parsed?.fechamentoMeta?.modeName || `${universo.length} Dezenas (${parsed.savedTickets.length} Jogos)`,
          universoDezenas: universo,
          tickets: parsed.savedTickets,
        },
      ];
    }

    if (!fechamentosToRestore || fechamentosToRestore.length === 0) {
      return { success: false, count: 0, error: 'Nenhum fechamento válido encontrado no arquivo.' };
    }

    // Lê os registros atuais ANTES de sanitizar para preservar mesclagem real
    const current = mode === 'merge' ? getSavedFechamentos() : [];

    // Aplica sanitização forense estrita em memória sem sobrescrever o localStorage prematuramente
    const { fechamentos: sanitizedFechamentos, sanitizedCount } = sanitizarFechamentosSalvos(
      fechamentosToRestore,
      { persist: false }
    );

    // Garante que IDs restaurados sejam removidos da lista de tombstones
    sanitizedFechamentos.forEach((f) => unmarkDeletedFechamentoId(f.id));

    let finalList: SavedFechamentoPrognostico[];
    if (mode === 'replace') {
      finalList = sanitizedFechamentos;
    } else {
      const importedIds = new Set(sanitizedFechamentos.map((f) => f.id));
      finalList = [
        ...sanitizedFechamentos,
        ...current.filter((f) => !importedIds.has(f.id)),
      ];
    }

    // Ordena do mais recente para o mais antigo e persiste até 200 fechamentos
    finalList = finalList
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, 200);

    const allTickets = finalList.flatMap((f) => (Array.isArray(f.tickets) ? f.tickets : []));

    localStorage.setItem(INITIALIZED_KEY, 'true');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalList));
    localStorage.setItem('lotosniper_saved_fechamentos', JSON.stringify(finalList));
    localStorage.setItem('lotosniper_saved_tickets', JSON.stringify(allTickets));

    // Também restaura tags se presentes no formato completo v2
    if (parsed?.meusJogos?.ticketTags && typeof parsed.meusJogos.ticketTags === 'object') {
      try {
        localStorage.setItem('lotosniper_ticket_tags', JSON.stringify(parsed.meusJogos.ticketTags));
      } catch {}
    }

    triggerAutoBackupSnapshot();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-saved-fechamentos-updated', { detail: finalList }));
      window.dispatchEvent(new CustomEvent('lotosniper-saved-tickets-updated', { detail: allTickets }));
      window.dispatchEvent(new CustomEvent('lotosniper-backup-restored', { detail: { fechamentos: finalList } }));
    }

    return {
      success: true,
      count: sanitizedFechamentos.length,
      totalAfter: finalList.length,
      totalTickets: allTickets.length,
      sanitizedCount,
    };
  } catch (e) {
    return { success: false, count: 0, error: 'Arquivo JSON inválido ou corrompido.' };
  }
}
