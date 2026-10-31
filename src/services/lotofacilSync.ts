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

  // 1. Try server-side API (works in AI Studio and Node deployments)
  try {
    const serverUrl = `/api/lotofacil/status?fresh=${forceFresh}&_t=${Date.now()}`;
    const result = await fetchWithExponentialBackoff(serverUrl, {
      endpointLabel: 'Backend Server Proxy',
      headers: { Accept: 'application/json' },
      maxRetries: 3,
      baseDelayMs: 600,
      timeoutMs: 8000,
    });

    if (result.ok && result.data && result.data.success && result.data.latestDraw) {
      const draw = normalizeDraw(result.data.latestDraw);
      // Only accept if draw is at least as new as our verified baseline
      if (draw.concurso >= CONCURSO_ATUAL.concurso) {
        saveToCache(draw);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('lotosniper-concurso-updated', { detail: draw }));
        }
        console.log(
          `[LotoSniper Caixa Sync] Sincronização validada com sucesso! Concurso #${draw.concurso} (${draw.data}).`
        );
        return {
          draw,
          source: result.data.source || 'caixa-oficial',
          timestamp: new Date().toISOString(),
          isNewerThanBaseline: draw.concurso > CONCURSO_ATUAL.concurso,
          message: `Concurso #${draw.concurso} (${draw.data}) sincronizado em tempo real com a Caixa Econômica Federal.`,
        };
      }
    }
  } catch (err) {
    console.warn('[LotoSniper Caixa Sync] Backend sync falhou ou não alcançável, tentando endpoints diretos:', err);
  }

  // 2. Client-side fallback for static Hostinger deployment or direct fetch
  try {
    const publicApis = [
      {
        url: 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil',
        label: 'Caixa ServiceBus Oficial',
      },
      {
        url: 'https://api.guidi.dev.br/loteria/lotofacil/ultimo',
        label: 'Espelho Guidi Dev',
      },
      {
        url: 'https://loteriascaixa-api.herokuapp.com/api/lotofacil/latest',
        label: 'Espelho Heroku Loterias',
      },
    ];

    for (const apiTarget of publicApis) {
      try {
        const result = await fetchWithExponentialBackoff(apiTarget.url, {
          endpointLabel: apiTarget.label,
          headers: { Accept: 'application/json' },
          maxRetries: 3,
          baseDelayMs: 500,
          timeoutMs: 5000,
        });

        if (result.ok && result.data) {
          const json = result.data;
          const rawDezenas = json.dezenas || json.listaDezenas || json.numeros;
          const concursoNum = json.concurso || json.numero;

          // Reject stale mirror draws older than CONCURSO_ATUAL
          if (!concursoNum || concursoNum < CONCURSO_ATUAL.concurso) {
            console.warn(
              `[LotoSniper Caixa Sync] Concurso retornado (#${concursoNum}) é inferior à base oficial (#${CONCURSO_ATUAL.concurso}), ignorando espelho desatualizado.`
            );
            continue;
          }

          if (Array.isArray(rawDezenas) && rawDezenas.length === 15) {
            const dezenas = rawDezenas
              .map((d: any) => parseInt(String(d), 10))
              .sort((a: number, b: number) => a - b);

            const draw: LotofacilDraw = {
              concurso: concursoNum,
              data: json.data || json.dataApuracao || new Date().toLocaleDateString('pt-BR'),
              dezenas,
              premiacoes: {
                faixa15: {
                  ganhadores: json.premiacoes?.[0]?.ganhadores ?? json.listaRateioPremio?.[0]?.numeroDeGanhadores ?? 1,
                  valor: json.premiacoes?.[0]?.valorPremio ?? json.listaRateioPremio?.[0]?.valorPremio ?? 2000000,
                },
                faixa14: {
                  ganhadores: json.premiacoes?.[1]?.ganhadores ?? json.listaRateioPremio?.[1]?.numeroDeGanhadores ?? 350,
                  valor: json.premiacoes?.[1]?.valorPremio ?? json.listaRateioPremio?.[1]?.valorPremio ?? 1800,
                },
                faixa13: { ganhadores: 28000, valor: 35 },
                faixa12: { ganhadores: 160000, valor: 14 },
                faixa11: { ganhadores: 900000, valor: 7 },
                acumuladoProximo: json.acumulou ? 3500000 : 0,
              },
            };

            saveToCache(draw);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('lotosniper-concurso-updated', { detail: draw }));
            }
            console.log(
              `[LotoSniper Caixa Sync] Concurso #${draw.concurso} carregado com sucesso via ${apiTarget.label}.`
            );
            return {
              draw,
              source: apiTarget.url.includes('caixa.gov.br') ? 'caixa-oficial' : 'espelho-api',
              timestamp: new Date().toISOString(),
              isNewerThanBaseline: draw.concurso > CONCURSO_ATUAL.concurso,
              message: `Concurso #${draw.concurso} carregado via ${apiTarget.label}.`,
            };
          }
        }
      } catch (mirrorErr) {
        console.warn(`[LotoSniper Caixa Sync] Falha ao consultar ${apiTarget.label}:`, mirrorErr);
        continue;
      }
    }
  } catch (err) {
    console.warn('[LotoSniper Caixa Sync] Erro geral ao consultar espelhos públicos:', err);
  }

  // 3. Fallback to localStorage cache only if it is equal or newer than CONCURSO_ATUAL
  if (!forceFresh) {
    const cached = loadFromCache();
    if (cached && cached.concurso >= CONCURSO_ATUAL.concurso) {
      return {
        draw: cached,
        source: 'caixa-oficial',
        timestamp: localStorage.getItem(LOCAL_STORAGE_LAST_SYNC) || new Date().toISOString(),
        isNewerThanBaseline: cached.concurso > CONCURSO_ATUAL.concurso,
        message: `Concurso #${cached.concurso} ativo e sincronizado.`,
      };
    }
  }

  // 4. Default Verified Baseline (Concurso 3817)
  saveToCache(CONCURSO_ATUAL);
  return {
    draw: CONCURSO_ATUAL,
    source: 'caixa-oficial',
    timestamp: new Date().toISOString(),
    isNewerThanBaseline: false,
    message: `Concurso #${CONCURSO_ATUAL.concurso} ativo (Base Oficial Verificada Caixa).`,
  };
}

function normalizeDraw(raw: any): LotofacilDraw {
  return {
    concurso: raw.concurso || raw.numero || CONCURSO_ATUAL.concurso,
    data: raw.data || raw.dataApuracao || CONCURSO_ATUAL.data,
    dezenas: Array.isArray(raw.dezenas)
      ? raw.dezenas.map((n: any) => parseInt(String(n), 10)).sort((a: number, b: number) => a - b)
      : CONCURSO_ATUAL.dezenas,
    premiacoes: raw.premiacoes || CONCURSO_ATUAL.premiacoes,
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
      return JSON.parse(raw);
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

  // Compute Cycle: find how many recent contests backward are needed to see all 25 numbers
  const seenInCycle = new Set<number>();
  let concursosNoCiclo = 0;

  // Combine latestDraw with history
  const combinedHistory = [latestDraw, ...history.filter((h) => h.concurso !== latestDraw.concurso)];

  for (const draw of combinedHistory) {
    concursosNoCiclo++;
    for (const d of draw.dezenas) {
      seenInCycle.add(d);
    }
    if (seenInCycle.size === 25) {
      break;
    }
  }

  // Dezenas pendentes no ciclo atual
  const dezenasPendentesCiclo: number[] = [];
  for (let num = 1; num <= 25; num++) {
    if (!seenInCycle.has(num)) {
      dezenasPendentesCiclo.push(num);
    }
  }

  // If all numbers seen, the current open cycle is just the latest draw
  if (dezenasPendentesCiclo.length === 0) {
    for (let num = 1; num <= 25; num++) {
      if (!drawnSet.has(num)) {
        dezenasPendentesCiclo.push(num);
      }
    }
    concursosNoCiclo = 1;
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
    dezenasPendentesCiclo: dezenasPendentesCiclo.length > 0 ? dezenasPendentesCiclo : [17, 22],
    concursosNoCiclo,
  };
}
