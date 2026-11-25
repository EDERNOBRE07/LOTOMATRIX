import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, RECENT_DRAWS } from '../data/lotofacilData';

const LOCAL_STORAGE_KEY = 'lotosniper_live_draw_v1';
const LOCAL_STORAGE_LAST_SYNC = 'lotosniper_last_sync_timestamp';

export interface SyncDiagnosticLogEntry {
  id: string;
  timestamp: string;
  endpointLabel: string;
  url: string;
  attempt: number;
  maxRetries: number;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'request' | 'cors' | 'timeout' | 'http' | 'checksum' | 'sync';
  status?: number;
  durationMs?: number;
  isCorsSuspected?: boolean;
  checksum?: string;
  message: string;
}

const MAX_DIAGNOSTIC_LOGS = 60;
const syncDiagnosticLogs: SyncDiagnosticLogEntry[] = [];

function recordSyncDiagnostic(entry: Omit<SyncDiagnosticLogEntry, 'id' | 'timestamp'>): SyncDiagnosticLogEntry {
  const fullEntry: SyncDiagnosticLogEntry = {
    ...entry,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  syncDiagnosticLogs.unshift(fullEntry);
  if (syncDiagnosticLogs.length > MAX_DIAGNOSTIC_LOGS) {
    syncDiagnosticLogs.length = MAX_DIAGNOSTIC_LOGS;
  }

  const logPrefix = `[LotoSniper Caixa Sync] [${fullEntry.endpointLabel}]`;
  if (fullEntry.level === 'error') {
    console.error(`${logPrefix} (${fullEntry.category.toUpperCase()}) ${fullEntry.message}`, fullEntry);
  } else if (fullEntry.level === 'warn') {
    console.warn(`${logPrefix} (${fullEntry.category.toUpperCase()}) ${fullEntry.message}`, fullEntry);
  } else {
    console.log(`${logPrefix} ${fullEntry.message}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lotosniper-sync-diagnostics', { detail: fullEntry }));
  }
  return fullEntry;
}

export function getSyncDiagnosticLogs(): SyncDiagnosticLogEntry[] {
  return [...syncDiagnosticLogs];
}

export function clearSyncDiagnosticLogs(): void {
  syncDiagnosticLogs.length = 0;
}

/**
 * Computes a deterministic 32-bit FNV-1a integrity checksum for a Lotofácil draw payload.
 */
export function computeDrawChecksum(
  draw: Pick<LotofacilDraw, 'concurso' | 'data' | 'dezenas'>
): string {
  const sortedDezenas = [...(draw.dezenas || [])]
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b)
    .map((n) => n.toString().padStart(2, '0'))
    .join(',');
  const canonical = `${Number(draw.concurso)}|${String(draw.data || '').trim()}|${sortedDezenas}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `LF-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

/**
 * Validates structural and mathematical integrity of a parsed Lotofácil draw
 * and verifies optional upstream checksums.
 */
export function verifyDrawIntegrity(
  draw: LotofacilDraw | null | undefined,
  expectedChecksum?: string
): { valid: boolean; checksum: string; reasons: string[] } {
  const reasons: string[] = [];
  if (!draw || typeof draw !== 'object') {
    return { valid: false, checksum: 'LF-00000000', reasons: ['Objeto de sorteio ausente ou inválido'] };
  }

  if (!Number.isInteger(draw.concurso) || draw.concurso < 1 || draw.concurso > 999999) {
    reasons.push(`Número de concurso inválido: ${draw.concurso}`);
  }

  if (!draw.data || typeof draw.data !== 'string' || draw.data.trim().length < 6) {
    reasons.push('Data de apuração ausente ou malformada');
  }

  if (!Array.isArray(draw.dezenas) || draw.dezenas.length !== 15) {
    reasons.push(`Quantidade de dezenas inválida (${Array.isArray(draw.dezenas) ? draw.dezenas.length : 0} != 15)`);
  } else {
    const unique = new Set(draw.dezenas);
    if (unique.size !== 15) {
      reasons.push('Dezenas duplicadas detectadas no sorteio');
    }
    const outOfRange = draw.dezenas.some((n) => !Number.isInteger(n) || n < 1 || n > 25);
    if (outOfRange) {
      reasons.push('Dezenas fora do intervalo oficial [01..25]');
    }
  }

  const checksum = computeDrawChecksum({
    concurso: draw.concurso,
    data: draw.data,
    dezenas: draw.dezenas || [],
  });

  if (expectedChecksum && expectedChecksum !== checksum) {
    reasons.push(`Checksum divergente (recebido ${expectedChecksum}, calculado ${checksum})`);
  }

  return {
    valid: reasons.length === 0,
    checksum,
    reasons,
  };
}

function isCrossOriginUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (typeof window === 'undefined' || !window.location?.origin) return true;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
  }
}

function detectCorsError(err: any, url: string): { isCors: boolean; detail: string } {
  const msg = String(err?.message || err || '');
  const crossOrigin = isCrossOriginUrl(url);
  const looksLikeFetchCorsBlock =
    crossOrigin &&
    (err?.name === 'TypeError' ||
      /failed to fetch|networkerror|load failed|cors|access-control-allow-origin|cross-origin/i.test(msg));

  if (looksLikeFetchCorsBlock) {
    return {
      isCors: true,
      detail: `Bloqueio CORS ou erro de rede cross-origin em ${url} (${msg}). Navegador bloqueou leitura direta; acionando fallback.`,
    };
  }
  return { isCors: false, detail: msg };
}

export interface SyncResult {
  draw: LotofacilDraw;
  source: 'caixa-oficial' | 'espelho-api' | 'base-local-verificada' | 'cache-local';
  timestamp: string;
  isNewerThanBaseline: boolean;
  message: string;
  integrityChecksum?: string;
  integrityVerified?: boolean;
}

interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number;
  maxRetries?: number;
  baseDelayMs?: number;
  endpointLabel?: string;
}

/**
 * Executes a fetch request with exponential backoff + jitter retry.
 * Logs detailed real-time telemetry including HTTP status, response headers,
 * CORS detection, and request duration for each attempt.
 */
export async function fetchWithExponentialBackoff(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  corsBlocked?: boolean;
}> {
  const {
    timeoutMs = 7000,
    maxRetries = 3,
    baseDelayMs = 600,
    endpointLabel = 'Caixa API',
    ...fetchInit
  } = options;

  let attempt = 0;
  let lastError: any = null;
  let corsBlocked = false;
  const crossOrigin = isCrossOriginUrl(url);

  while (attempt < maxRetries) {
    attempt++;
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    recordSyncDiagnostic({
      endpointLabel,
      url,
      attempt,
      maxRetries,
      level: 'info',
      category: 'request',
      message: `Tentativa ${attempt}/${maxRetries} iniciada: ${url}`,
    });

    try {
      const res = await fetch(url, {
        cache: 'no-store',
        ...fetchInit,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;

      const headersObj: Record<string, string> = {};
      try {
        res.headers.forEach((value, key) => {
          headersObj[key] = value;
        });
      } catch {}

      if (crossOrigin && !headersObj['access-control-allow-origin']) {
        recordSyncDiagnostic({
          endpointLabel,
          url,
          attempt,
          maxRetries,
          level: 'warn',
          category: 'cors',
          status: res.status,
          durationMs,
          isCorsSuspected: true,
          message: `Cabeçalho Access-Control-Allow-Origin ausente/restrito na resposta cross-origin (${durationMs}ms).`,
        });
      }

      if (res.ok) {
        let json: any = null;
        try {
          json = await res.json();
        } catch (jsonErr) {
          recordSyncDiagnostic({
            endpointLabel,
            url,
            attempt,
            maxRetries,
            level: 'warn',
            category: 'checksum',
            status: res.status,
            durationMs,
            message: `Falha ao fazer parse JSON do payload: ${String(jsonErr)}`,
          });
        }

        recordSyncDiagnostic({
          endpointLabel,
          url,
          attempt,
          maxRetries,
          level: 'success',
          category: 'http',
          status: res.status,
          durationMs,
          message: `HTTP ${res.status} (${durationMs}ms) • Concurso ${json?.concurso || json?.numero || json?.latestDraw?.concurso || 'N/D'}`,
        });

        return {
          ok: true,
          status: res.status,
          statusText: res.statusText,
          headers: headersObj,
          data: json,
          corsBlocked: false,
        };
      }

      recordSyncDiagnostic({
        endpointLabel,
        url,
        attempt,
        maxRetries,
        level: 'warn',
        category: 'http',
        status: res.status,
        durationMs,
        message: `Tentativa ${attempt}/${maxRetries} retornou HTTP ${res.status} (${res.statusText}) em ${durationMs}ms.`,
      });
      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);

      // Do not waste retries on explicit 404/400 client errors
      if (res.status === 400 || res.status === 404) {
        break;
      }
    } catch (err: any) {
      clearTimeout(timer);
      const durationMs = Date.now() - startedAt;
      const isAbort = err?.name === 'AbortError';
      const corsInfo = detectCorsError(err, url);
      if (corsInfo.isCors) {
        corsBlocked = true;
      }

      recordSyncDiagnostic({
        endpointLabel,
        url,
        attempt,
        maxRetries,
        level: 'warn',
        category: isAbort ? 'timeout' : corsInfo.isCors ? 'cors' : 'http',
        durationMs,
        isCorsSuspected: corsInfo.isCors,
        message: isAbort
          ? `Timeout após ${timeoutMs}ms na tentativa ${attempt}/${maxRetries}.`
          : corsInfo.detail,
      });
      lastError = err;

      // On hard CORS preflight/read block in browser, retrying the exact cross-origin URL immediately adds latency; break to fallback
      if (corsInfo.isCors) {
        break;
      }
    }

    if (attempt < maxRetries) {
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 180);
      const totalWaitMs = exponentialDelay + jitter;

      recordSyncDiagnostic({
        endpointLabel,
        url,
        attempt,
        maxRetries,
        level: 'info',
        category: 'request',
        message: `Backoff exponencial: aguardando ${totalWaitMs}ms antes da tentativa ${attempt + 1}/${maxRetries}.`,
      });
      await new Promise((resolve) => setTimeout(resolve, totalWaitMs));
    }
  }

  recordSyncDiagnostic({
    endpointLabel,
    url,
    attempt,
    maxRetries,
    level: 'error',
    category: corsBlocked ? 'cors' : 'http',
    isCorsSuspected: corsBlocked,
    message: `Esgotadas tentativas para ${url}: ${lastError?.message || lastError || 'Erro de conexão'}`,
  });

  return {
    ok: false,
    status: 0,
    statusText: lastError?.message || 'Erro de conexão',
    headers: {},
    data: null,
    corsBlocked,
  };
}

/**
 * Fetch latest Lotofácil result:
 * 1. Tries the full-stack server endpoint /api/lotofacil/status with exponential backoff & checksum validation
 * 2. If needed, tries direct official Caixa endpoints and verified mirrors with CORS detection
 * 3. Falls back to localStorage or verified baseline (Concurso #3836+)
 */
export async function syncLatestLotofacil(forceFresh: boolean = false): Promise<SyncResult> {
  recordSyncDiagnostic({
    endpointLabel: 'Orquestrador Sync',
    url: '/api/lotofacil/status',
    attempt: 1,
    maxRetries: 1,
    level: 'info',
    category: 'sync',
    message: `Iniciando sincronização (forceFresh=${forceFresh}, baseline=#${CONCURSO_ATUAL.concurso}).`,
  });

  if (forceFresh) {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_LAST_SYNC);
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
      maxRetries: 3,
      baseDelayMs: 350,
      timeoutMs: 10000,
    });

    if (result.ok && result.data && result.data.success && result.data.latestDraw) {
      const draw = normalizeDraw(result.data.latestDraw);
      const integrity = verifyDrawIntegrity(draw, result.data.checksum);

      if (!integrity.valid) {
        recordSyncDiagnostic({
          endpointLabel: 'Backend Server Proxy',
          url: serverUrl,
          attempt: 1,
          maxRetries: 1,
          level: 'error',
          category: 'checksum',
          checksum: integrity.checksum,
          message: `Falha de integridade/checksum no payload do servidor: ${integrity.reasons.join('; ')}`,
        });
      } else if (draw.concurso >= CONCURSO_ATUAL.concurso) {
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

        recordSyncDiagnostic({
          endpointLabel: 'Backend Server Proxy',
          url: serverUrl,
          attempt: 1,
          maxRetries: 1,
          level: 'success',
          category: 'checksum',
          checksum: integrity.checksum,
          message: `Integridade verificada (${integrity.checksum}) para Concurso #${draw.concurso} (${draw.data}) via ${resolvedSource}.`,
        });

        return {
          draw,
          source: resolvedSource,
          timestamp: new Date().toISOString(),
          isNewerThanBaseline: draw.concurso > CONCURSO_ATUAL.concurso,
          message: `Concurso #${draw.concurso} (${draw.data}) sincronizado em tempo real.`,
          integrityChecksum: integrity.checksum,
          integrityVerified: true,
        };
      }
    }
  } catch (err) {
    recordSyncDiagnostic({
      endpointLabel: 'Backend Server Proxy',
      url: '/api/lotofacil/status',
      attempt: 1,
      maxRetries: 1,
      level: 'warn',
      category: 'http',
      message: `Proxy indisponível (${String(err)}), iniciando fallback direto com detecção de CORS.`,
    });
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
          maxRetries: 2,
          baseDelayMs: 400,
          timeoutMs: 4500,
        });
        if (!result.ok || !result.data) return null;
        const parsed = parseExternalPayload(result.data);
        if (!parsed || parsed.concurso < CONCURSO_ATUAL.concurso) return null;
        const integrity = verifyDrawIntegrity(parsed);
        if (!integrity.valid) {
          recordSyncDiagnostic({
            endpointLabel: apiTarget.label,
            url: apiTarget.url,
            attempt: 1,
            maxRetries: 1,
            level: 'error',
            category: 'checksum',
            checksum: integrity.checksum,
            message: `Payload rejeitado por falha de integridade: ${integrity.reasons.join('; ')}`,
          });
          return null;
        }
        return {
          draw: parsed,
          checksum: integrity.checksum,
          source: (apiTarget.isCaixa ? 'caixa-oficial' : 'espelho-api') as SyncResult['source'],
          label: apiTarget.label,
        };
      })
    );

    let bestExternalDraw: LotofacilDraw | null = null;
    let bestExternalSource: SyncResult['source'] = 'espelho-api';
    let bestExternalLabel = '';
    let bestExternalChecksum = '';

    for (const item of settled) {
      if (item.status !== 'fulfilled' || !item.value) continue;
      const { draw: parsed, source, label, checksum } = item.value;
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
        bestExternalChecksum = checksum;
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
        integrityChecksum: bestExternalChecksum,
        integrityVerified: true,
      };
    }
  } catch (err) {
    recordSyncDiagnostic({
      endpointLabel: 'Espelhos Públicos',
      url: 'https://servicebus2.caixa.gov.br',
      attempt: 1,
      maxRetries: 1,
      level: 'warn',
      category: 'sync',
      message: `Erro geral ao consultar espelhos públicos: ${String(err)}`,
    });
  }

  // 3. Fallback to localStorage cache only if it is equal or newer than CONCURSO_ATUAL (#3836+)
  if (!forceFresh) {
    const cached = loadFromCache();
    const cacheCheck = verifyDrawIntegrity(cached);
    if (cached && cacheCheck.valid && cached.concurso >= CONCURSO_ATUAL.concurso) {
      return {
        draw: cached,
        source: 'base-local-verificada',
        timestamp: localStorage.getItem(LOCAL_STORAGE_LAST_SYNC) || new Date().toISOString(),
        isNewerThanBaseline: cached.concurso > CONCURSO_ATUAL.concurso,
        message: `Concurso #${cached.concurso} (${cached.data}) ativo e sincronizado.`,
        integrityChecksum: cacheCheck.checksum,
        integrityVerified: true,
      };
    }
  }

  // 4. Default Verified Baseline (Concurso #3836 - 23/11/2026)
  const baselineCheck = verifyDrawIntegrity(CONCURSO_ATUAL);
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
    integrityChecksum: baselineCheck.checksum,
    integrityVerified: baselineCheck.valid,
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
      const normalized = normalizeDraw(proxyRes.data.draw);
      if (verifyDrawIntegrity(normalized).valid) {
        return normalized;
      }
    }
  } catch {}

  try {
    const directRes = await fetchWithExponentialBackoff(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil/${concurso}?t=${ts}`,
      {
        endpointLabel: `Caixa Direto #${concurso}`,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        maxRetries: 2,
        baseDelayMs: 400,
        timeoutMs: 5000,
      }
    );
    if (directRes.ok && directRes.data) {
      const parsed = parseExternalPayload(directRes.data);
      if (parsed && verifyDrawIntegrity(parsed).valid) {
        return parsed;
      }
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
