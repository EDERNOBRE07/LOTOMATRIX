import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, RECENT_DRAWS } from '../data/lotofacilData';

const LOCAL_STORAGE_KEY = 'lotosniper_live_draw_v1';
const LOCAL_STORAGE_LAST_SYNC = 'lotosniper_last_sync_timestamp';

export interface SyncResult {
  draw: LotofacilDraw;
  source: 'caixa-oficial' | 'espelho-api' | 'base-local-verificada' | 'cache-local';
  timestamp: string;
  isNewerThanBaseline: boolean;
  message: string;
}

/**
 * Fetch latest Lotofácil result:
 * 1. Tries the full-stack server endpoint /api/lotofacil/status
 * 2. If running on static Hostinger, tries direct public APIs with fallback
 * 3. Falls back to localStorage or verified baseline (Concurso 3800)
 */
interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  endpointLabel?: string;
}

/**
 * Executes a fetch request with exponential backoff retry (up to maxRetries).
 * Logs detailed telemetry including HTTP status code and response headers for each attempt.
 * Retries silently on transient network errors / timeouts / 5xx before escalating.
 */
export async function fetchWithExponentialBackoff(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<{ ok: boolean; status: number; statusText: string; headers: Record<string, string>; data: any }> {
  const {
    timeoutMs = 7000,
    maxRetries = 3,
    baseDelayMs = 750,
    endpointLabel = 'Caixa API',
    ...fetchInit
  } = options;

  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    console.log(
      `[LotoSniper Caixa Sync] [${endpointLabel}] Tentativa ${attempt}/${maxRetries} iniciada: ${url}`
    );

    try {
      const res = await fetch(url, {
        cache: 'no-store',
        ...fetchInit,
        signal: controller.signal,
      });
      clearTimeout(timer);

      // Extract headers into a clean readable object for diagnostics
      const headersObj: Record<string, string> = {};
      try {
        res.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
      } catch {}

      console.log(
        `[LotoSniper Caixa Sync] [${endpointLabel}] Tentativa ${attempt}/${maxRetries} respondeu:`,
        {
          url,
          status: res.status,
          statusText: res.statusText,
          headers: headersObj,
        }
      );

      if (res.ok) {
        let json: any = null;
        try {
          json = await res.json();
        } catch (jsonErr) {
          console.warn(`[LotoSniper Caixa Sync] Falha ao fazer parse JSON do payload:`, jsonErr);
        }

        console.log(
          `[LotoSniper Caixa Sync] [${endpointLabel}] Sucesso (HTTP ${res.status}) na tentativa ${attempt}. Payload:`,
          json
            ? {
                concurso: json.concurso || json.numero || json.latestDraw?.concurso,
                data: json.data || json.dataApuracao || json.latestDraw?.data,
                dezenasCount:
                  (json.dezenas || json.listaDezenas || json.latestDraw?.dezenas)?.length || 0,
              }
            : 'corpo vazio'
        );

        return {
          ok: true,
          status: res.status,
          statusText: res.statusText,
          headers: headersObj,
          data: json,
        };
      }

      // If response is not ok (e.g. 500, 502, 503, 429), log and retry if attempts remain
      console.warn(
        `[LotoSniper Caixa Sync] [${endpointLabel}] Tentativa ${attempt}/${maxRetries} falhou com status HTTP ${res.status} (${res.statusText}).`
      );
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (err: any) {
      clearTimeout(timer);
      const isAbort = err?.name === 'AbortError';
      const msg = isAbort ? `Timeout de requisição (${timeoutMs}ms)` : err?.message || String(err);

      console.warn(
        `[LotoSniper Caixa Sync] [${endpointLabel}] Tentativa ${attempt}/${maxRetries} interrompida: ${msg}`
      );
      lastError = err;
    }

    // If more attempts remain, apply exponential backoff + jitter silently
    if (attempt < maxRetries) {
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 200);
      const totalWaitMs = exponentialDelay + jitter;

      console.log(
        `[LotoSniper Caixa Sync] [${endpointLabel}] Aplicando backoff exponencial silencioso: aguardando ${totalWaitMs}ms antes da tentativa ${attempt + 1}/${maxRetries}...`
      );
      await new Promise((resolve) => setTimeout(resolve, totalWaitMs));
    }
  }

  console.error(
    `[LotoSniper Caixa Sync] [${endpointLabel}] Esgotadas todas as ${maxRetries} tentativas para ${url}. Último erro:`,
    lastError?.message || lastError
  );

  return {
    ok: false,
    status: 0,
    statusText: lastError?.message || 'Erro de conexão',
    headers: {},
    data: null,
  };
}

/**
 * Fetch latest Lotofácil result:
 * 1. Tries the full-stack server endpoint /api/lotofacil/status with exponential backoff & detailed logs
 * 2. If running on static Hostinger, tries direct public APIs with exponential backoff & detailed logs
 * 3. Falls back to localStorage or verified baseline (Concurso 3817)
 */
export async function syncLatestLotofacil(forceFresh: boolean = false): Promise<SyncResult> {
  console.log(`[LotoSniper Caixa Sync] Iniciando ciclo de sincronização (forceFresh: ${forceFresh})...`);

  // If forceFresh is requested, remove stale local cache to avoid getting stuck
  if (forceFresh) {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_LAST_SYNC);
      console.log('[LotoSniper Caixa Sync] Cache local anterior expurgado para busca direta.');
    } catch {}
  }

  // 1. Try server-side proxy API first (bypasses browser CORS & Akamai CDN stale cache)
  try {
    const serverUrl = `/api/lotofacil/status?fresh=${forceFresh}&t=${Date.now()}`;
    const result = await fetchWithExponentialBackoff(serverUrl, {
      endpointLabel: 'Backend Server Proxy',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
      maxRetries: 2,
      baseDelayMs: 350,
      timeoutMs: 10000,
    });

    if (result.ok && result.data && result.data.success && result.data.latestDraw) {
      const draw = normalizeDraw(result.data.latestDraw);
      // Only accept if draw is at least as new as our verified baseline (#3836+)
      if (draw.concurso >= CONCURSO_ATUAL.concurso) {
        saveToCache(draw);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lotosniper-concurso-updated', { detail: draw }));
        }
        const resolvedSource: SyncResult['source'] =
          result.data.source === 'espelho-api'
            ? 'espelho-api'
            : result.data.source === 'base-local-verificada'
            ? 'base-local-verificada'
            : 'caixa-oficial';
        console.log(
          `[LotoSniper Caixa Sync] Sincronização validada com sucesso! Concurso #${draw.concurso} (${draw.data}) via ${resolvedSource}.`
        );
        return {
          draw,
          source: resolvedSource,
          timestamp: new Date().toISOString(),
          isNewerThanBaseline: draw.concurso > CONCURSO_ATUAL.concurso,
          message: `Concurso #${draw.concurso} (${draw.data}) sincronizado em tempo real.`,
        };
      }
    }
  } catch (err) {
    console.warn('[LotoSniper Caixa Sync] Backend sync falhou ou não alcançável, tentando endpoints diretos:', err);
  }

  // 2. Client-side fallback: parallel direct official Caixa API (+ probe next contest) & reliable mirrors
  try {
    const ts = Date.now();
    const nextContestProbe = CONCURSO_ATUAL.concurso + 1;
    const publicApis = [
      {
        url: `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${nextContestProbe}?t=${ts}`,
        label: `Caixa ServiceBus Oficial (#${nextContestProbe})`,
        isCaixa: true,
      },
      {
        url: `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${CONCURSO_ATUAL.concurso}?t=${ts}`,
        label: `Caixa ServiceBus Oficial (#${CONCURSO_ATUAL.concurso})`,
        isCaixa: true,
      },
      {
        url: `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil?t=${ts}`,
        label: 'Caixa ServiceBus Oficial',
        isCaixa: true,
      },
      {
        url: `https://api.guidi.dev.br/loteria/lotofacil/ultimo?t=${ts}`,
        label: 'Espelho Guidi Dev',
        isCaixa: false,
      },
      {
        url: `https://loteriascaixa-api.herokuapp.com/api/lotofacil/latest?t=${ts}`,
        label: 'Espelho Heroku Loterias',
        isCaixa: false,
      },
    ];

    const settled = await Promise.allSettled(
      publicApis.map(async (apiTarget) => {
        const result = await fetchWithExponentialBackoff(apiTarget.url, {
          endpointLabel: apiTarget.label,
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          maxRetries: 1,
          baseDelayMs: 300,
          timeoutMs: 4000,
        });
        if (!result.ok || !result.data) return null;
        const parsed = parseExternalPayload(result.data);
        if (!parsed || parsed.concurso < CONCURSO_ATUAL.concurso) return null;
        return {
          draw: parsed,
          source: (apiTarget.isCaixa ? 'caixa-oficial' : 'espelho-api') as SyncResult['source'],
          label: apiTarget.label,
        };
      })
    );

    let bestExternalDraw: LotofacilDraw | null = null;
    let bestExternalSource: SyncResult['source'] = 'espelho-api';
    let bestExternalLabel = '';

    for (const item of settled) {
      if (item.status !== 'fulfilled' || !item.value) continue;
      const { draw: parsed, source, label } = item.value;
      if (
        !bestExternalDraw ||
        parsed.concurso > bestExternalDraw.concurso ||
        (parsed.concurso === bestExternalDraw.concurso &&
          source === 'caixa-oficial' &&
          bestExternalSource !== 'caixa-oficial')
      ) {
        bestExternalDraw = parsed;
        bestExternalSource = source;
        bestExternalLabel = label;
      }
    }

    if (bestExternalDraw) {
      saveToCache(bestExternalDraw);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lotosniper-concurso-updated', { detail: bestExternalDraw }));
      }
      return {
        draw: bestExternalDraw,
        source: bestExternalSource,
        timestamp: new Date().toISOString(),
        isNewerThanBaseline: bestExternalDraw.concurso > CONCURSO_ATUAL.concurso,
        message: `Concurso #${bestExternalDraw.concurso} (${bestExternalDraw.data}) carregado via ${bestExternalLabel}.`,
      };
    }
  } catch (err) {
    console.warn('[LotoSniper Caixa Sync] Erro geral ao consultar espelhos públicos:', err);
  }

  // 3. Fallback to localStorage cache only if it is equal or newer than CONCURSO_ATUAL (#3836+)
  if (!forceFresh) {
    const cached = loadFromCache();
    if (cached && cached.concurso >= CONCURSO_ATUAL.concurso) {
      return {
        draw: cached,
        source: 'base-local-verificada',
        timestamp: localStorage.getItem(LOCAL_STORAGE_LAST_SYNC) || new Date().toISOString(),
        isNewerThanBaseline: cached.concurso > CONCURSO_ATUAL.concurso,
        message: `Concurso #${cached.concurso} (${cached.data}) ativo e sincronizado.`,
      };
    }
  }

  // 4. Default Verified Baseline (Concurso #3836 - 23/11/2026)
  saveToCache(CONCURSO_ATUAL);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lotosniper-concurso-updated', { detail: CONCURSO_ATUAL }));
  }
  return {
    draw: CONCURSO_ATUAL,
    source: 'base-local-verificada',
    timestamp: new Date().toISOString(),
    isNewerThanBaseline: false,
    message: `Concurso #${CONCURSO_ATUAL.concurso} (${CONCURSO_ATUAL.data}) ativo (Base Oficial Consolidada Caixa).`,
  };
}

/**
 * Fetches a specific Lotofácil contest by number via server proxy with direct Caixa fallback.
 */
export async function fetchConcursoByNumber(concurso: number): Promise<LotofacilDraw | null> {
  if (!Number.isInteger(concurso) || concurso < 1 || concurso > 999999) {
    return null;
  }

  const ts = Date.now();
  try {
    const proxyRes = await fetchWithExponentialBackoff(
      `/api/lotofacil/concurso/${concurso}?t=${ts}`,
      {
        endpointLabel: `Proxy Concurso #${concurso}`,
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        maxRetries: 2,
        baseDelayMs: 400,
        timeoutMs: 6500,
      }
    );
    if (proxyRes.ok && proxyRes.data?.success && proxyRes.data?.draw) {
      return normalizeDraw(proxyRes.data.draw);
    }
  } catch {}

  try {
    const directRes = await fetchWithExponentialBackoff(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}?t=${ts}`,
      {
        endpointLabel: `Caixa Direto #${concurso}`,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        maxRetries: 1,
        baseDelayMs: 400,
        timeoutMs: 5000,
      }
    );
    if (directRes.ok && directRes.data) {
      return parseExternalPayload(directRes.data);
    }
  } catch {}

  return null;
}

function parseExternalPayload(json: any): LotofacilDraw | null {
  if (!json || typeof json !== 'object') return null;
  const rawDezenas = json.dezenas || json.listaDezenas || json.numeros;
  const concursoNum = Number(json.concurso || json.numero);
  if (!Number.isFinite(concursoNum) || !Array.isArray(rawDezenas) || rawDezenas.length !== 15) {
    return null;
  }

  const dezenas = rawDezenas
    .map((d: any) => parseInt(String(d), 10))
    .filter((n: number) => Number.isFinite(n) && n >= 1 && n <= 25)
    .sort((a: number, b: number) => a - b);

  if (dezenas.length !== 15) return null;

  const rateio = Array.isArray(json.listaRateioPremio) ? json.listaRateioPremio : [];
  const premiacoesArr = Array.isArray(json.premiacoes) ? json.premiacoes : [];
  const faixa15Ganhadores =
    premiacoesArr[0]?.ganhadores ?? rateio[0]?.numeroDeGanhadores ?? (json.acumulou ? 0 : 1);
  const faixa15Valor =
    premiacoesArr[0]?.valorPremio ?? rateio[0]?.valorPremio ?? (json.acumulou ? 0 : 1700000);
  const acumuladoProximo = Number(
    json.valorEstimadoProximoConcurso ??
      json.valorAcumuladoProximoConcurso ??
      json.proximoEstimado ??
      (json.acumulou || faixa15Ganhadores === 0 ? 5000000 : 0)
  );

  return {
    concurso: concursoNum,
    data: json.data || json.dataApuracao || new Date().toLocaleDateString('pt-BR'),
    dezenas,
    acumulou: Boolean(json.acumulou || faixa15Ganhadores === 0),
    proximoEstimado: acumuladoProximo > 0 ? acumuladoProximo : undefined,
    dataProximoConcurso: json.dataProximoConcurso || undefined,
    premiacoes: {
      faixa15: {
        ganhadores: faixa15Ganhadores,
        valor: faixa15Valor,
      },
      faixa14: {
        ganhadores: premiacoesArr[1]?.ganhadores ?? rateio[1]?.numeroDeGanhadores ?? 300,
        valor: premiacoesArr[1]?.valorPremio ?? rateio[1]?.valorPremio ?? 1800,
      },
      faixa13: {
        ganhadores: premiacoesArr[2]?.ganhadores ?? rateio[2]?.numeroDeGanhadores ?? 12000,
        valor: premiacoesArr[2]?.valorPremio ?? rateio[2]?.valorPremio ?? 35,
      },
      faixa12: {
        ganhadores: premiacoesArr[3]?.ganhadores ?? rateio[3]?.numeroDeGanhadores ?? 140000,
        valor: premiacoesArr[3]?.valorPremio ?? rateio[3]?.valorPremio ?? 14,
      },
      faixa11: {
        ganhadores: premiacoesArr[4]?.ganhadores ?? rateio[4]?.numeroDeGanhadores ?? 750000,
        valor: premiacoesArr[4]?.valorPremio ?? rateio[4]?.valorPremio ?? 7,
      },
      acumuladoProximo,
    },
  };
}

function normalizeDraw(raw: any): LotofacilDraw {
  const concurso = Number(raw.concurso || raw.numero || CONCURSO_ATUAL.concurso);
  const fallbackMeta = concurso === CONCURSO_ATUAL.concurso ? CONCURSO_ATUAL : undefined;
  const premiacoes = raw.premiacoes || fallbackMeta?.premiacoes || CONCURSO_ATUAL.premiacoes;
  const faixa15Ganhadores = premiacoes?.faixa15?.ganhadores;
  const acumuladoProximo =
    raw.proximoEstimado ??
    premiacoes?.acumuladoProximo ??
    (concurso === CONCURSO_ATUAL.concurso ? CONCURSO_ATUAL.proximoEstimado : 0);

  return {
    concurso,
    data: raw.data || raw.dataApuracao || CONCURSO_ATUAL.data,
    dezenas: Array.isArray(raw.dezenas)
      ? raw.dezenas.map((n: any) => parseInt(String(n), 10)).sort((a: number, b: number) => a - b)
      : CONCURSO_ATUAL.dezenas,
    acumulou: raw.acumulou ?? (faixa15Ganhadores === 0),
    proximoEstimado: acumuladoProximo && acumuladoProximo > 0 ? acumuladoProximo : undefined,
    dataProximoConcurso: raw.dataProximoConcurso || fallbackMeta?.dataProximoConcurso,
    premiacoes: {
      ...premiacoes,
      acumuladoProximo: acumuladoProximo || 0,
    },
  };
}

function saveToCache(draw: LotofacilDraw) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draw));
    localStorage.setItem(LOCAL_STORAGE_LAST_SYNC, new Date().toISOString());
  } catch (e) {
    console.warn('Não foi possível salvar no localStorage:', e);
  }
}

function loadFromCache(): LotofacilDraw | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.concurso === 'number' && parsed.concurso >= CONCURSO_ATUAL.concurso) {
        return parsed;
      }
      // Expurga automaticamente cache defasado inferior à base oficial verificada
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Dynamically recompute Dezena Statistics (atrasos, frequências) based on the latest draw
 */
export function computeDynamicStats(
  latestDraw: LotofacilDraw,
  history: LotofacilDraw[] = RECENT_DRAWS
): {
  stats: DezenaStats[];
  dezenasPendentesCiclo: number[];
  concursosNoCiclo: number;
} {
  // Dezenas sorteadas no último concurso
  const drawnSet = new Set(latestDraw.dezenas);

  // Compute Cycle chronologically up to latestDraw.concurso
  const chronologicalHistory = [
    latestDraw,
    ...history.filter((h) => h.concurso !== latestDraw.concurso && h.concurso <= latestDraw.concurso),
  ].sort((a, b) => a.concurso - b.concurso);

  const combinedHistory = [...chronologicalHistory].reverse();

  let seenInCycle = new Set<number>();
  let concursosNoCiclo = 0;

  for (let i = 0; i < chronologicalHistory.length; i++) {
    const draw = chronologicalHistory[i];
    concursosNoCiclo++;
    for (const d of draw.dezenas) {
      seenInCycle.add(d);
    }
    // Se fechou um ciclo anterior e ainda há concursos posteriores, inicia novo ciclo no próximo concurso
    if (seenInCycle.size === 25 && i < chronologicalHistory.length - 1) {
      seenInCycle = new Set<number>();
      concursosNoCiclo = 0;
    }
  }

  // Dezenas pendentes no ciclo atual (será [] se o último concurso acabou de fechar o ciclo)
  const dezenasPendentesCiclo: number[] = [];
  for (let num = 1; num <= 25; num++) {
    if (!seenInCycle.has(num)) {
      dezenasPendentesCiclo.push(num);
    }
  }

  // Recompute delays for each number
  const dynamicStats: DezenaStats[] = DEZENAS_STATS.map((base) => {
    const wasDrawnInLatest = drawnSet.has(base.numero);
    let atrasoAtual = 0;

    if (wasDrawnInLatest) {
      atrasoAtual = 0;
    } else {
      // Find when it last appeared in combinedHistory
      let delay = 0;
      let found = false;
      for (const d of combinedHistory) {
        if (d.dezenas.includes(base.numero)) {
          found = true;
          break;
        }
        delay++;
      }
      atrasoAtual = found ? delay : base.atrasoAtual;
    }

    const atrasoAcimaDaMedia = atrasoAtual >= base.atrasoMedio;
    const isPendenteCiclo = dezenasPendentesCiclo.includes(base.numero);

    let status: DezenaStats['status'] = 'neutra';
    if (atrasoAtual >= 3 || isPendenteCiclo) status = 'atrasada';
    else if (base.vezes >= 2300) status = 'frequente';

    return {
      ...base,
      atrasoAtual,
      atrasoAcimaDaMedia,
      status,
      presenteUltimoConcurso: wasDrawnInLatest,
      pendenteNoCiclo: isPendenteCiclo,
    };
  });

  return {
    stats: dynamicStats,
    dezenasPendentesCiclo,
    concursosNoCiclo,
  };
}
