import { CONCURSO_ATUAL } from '../data/lotofacilData';
import {
  DEFAULT_FILTERS,
  generateFechamentoCovering,
  validateFilters,
} from '../services/combinatorics';

export interface WebMCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>, client?: unknown) => Promise<unknown>;
}

interface NavigatorWithModelContext extends Navigator {
  modelContext?: {
    registerTool?: (tool: WebMCPToolDefinition) => void;
    provideContext?: (context: { tools: WebMCPToolDefinition[] }) => void;
  };
}

let webMcpRegistered = false;

export function buildLotoSniperWebMCPTools(): WebMCPToolDefinition[] {
  return [
    {
      name: 'lotosniper_get_latest_draw',
      description:
        'Consulta o último resultado oficial conhecido da Lotofácil no LotoSniper, retornando número do concurso, data e as 15 dezenas sorteadas.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        try {
          const resp = await fetch('/api/lotofacil/latest');
          if (resp.ok) {
            const payload = await resp.json();
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(payload),
                },
              ],
            };
          }
        } catch {
          // Fallback to bundled latest draw snapshot
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                concurso: CONCURSO_ATUAL.concurso,
                data: CONCURSO_ATUAL.data,
                dezenas: CONCURSO_ATUAL.dezenas,
                source: 'local-snapshot',
              }),
            },
          ],
        };
      },
    },
    {
      name: 'lotosniper_validate_ticket',
      description:
        'Valida um bilhete de 15 dezenas da Lotofácil (1 a 25) contra os filtros estatísticos D1-D15, múltiplos M3-M8, soma dos dígitos (63-87), geometria da cruz, soma total, primos e moldura.',
      inputSchema: {
        type: 'object',
        properties: {
          dezenas: {
            type: 'array',
            description: 'Lista de 15 dezenas inteiras distintas entre 1 e 25.',
            items: { type: 'integer', minimum: 1, maximum: 25 },
            minItems: 15,
            maxItems: 15,
          },
        },
        required: ['dezenas'],
        additionalProperties: false,
      },
      execute: async (args) => {
        const raw = Array.isArray(args?.dezenas) ? args.dezenas : [];
        const dezenas = [...new Set(raw.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 25))].sort(
          (a, b) => a - b
        );
        if (dezenas.length !== 15) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  valid: false,
                  error: 'Informe exatamente 15 dezenas distintas entre 1 e 25.',
                }),
              },
            ],
          };
        }

        const result = validateFilters(dezenas, DEFAULT_FILTERS, CONCURSO_ATUAL.dezenas);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                dezenas,
                passed: result.isValid,
                violations: result.violations,
                metrics: result.metrics,
              }),
            },
          ],
        };
      },
    },
    {
      name: 'lotosniper_generate_closure',
      description:
        'Gera uma matriz combinatória de fechamento da Lotofácil com garantia de 14 pontos, controle de distância Hamming e filtros matemáticos.',
      inputSchema: {
        type: 'object',
        properties: {
          pool: {
            type: 'array',
            description: 'Conjunto base de 16 a 22 dezenas distintas entre 1 e 25.',
            items: { type: 'integer', minimum: 1, maximum: 25 },
            minItems: 16,
            maxItems: 22,
          },
          maxTickets: {
            type: 'integer',
            description: 'Quantidade máxima de bilhetes na matriz (1 a 50).',
            minimum: 1,
            maximum: 50,
          },
        },
        required: ['pool'],
        additionalProperties: false,
      },
      execute: async (args) => {
        const rawPool = Array.isArray(args?.pool) ? args.pool : [];
        const pool = [...new Set(rawPool.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 25))].sort(
          (a, b) => a - b
        );
        const maxTickets = Math.min(50, Math.max(1, Number(args?.maxTickets || 10)));

        if (pool.length < 16 || pool.length > 22) {
          return {
            isError: true,
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'O pool deve conter entre 16 e 22 dezenas distintas (1 a 25).',
                }),
              },
            ],
          };
        }

        const tickets = generateFechamentoCovering(
          pool,
          14,
          maxTickets,
          DEFAULT_FILTERS,
          CONCURSO_ATUAL.dezenas
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                pool,
                ticketCount: tickets.length,
                tickets: tickets.map((t) => ({
                  index: t.index,
                  dezenas: t.dezenas,
                  soma: t.soma,
                  pares: t.pares,
                  primos: t.primos,
                  moldura: t.moldura,
                })),
              }),
            },
          ],
        };
      },
    },
  ];
}

export function registerLotoSniperWebMCPTools(): boolean {
  if (webMcpRegistered || typeof navigator === 'undefined') {
    return false;
  }

  const nav = navigator as NavigatorWithModelContext;
  const modelContext = nav.modelContext;
  if (!modelContext) {
    return false;
  }

  const tools = buildLotoSniperWebMCPTools();

  if (typeof modelContext.registerTool === 'function') {
    let anyRegistered = false;
    for (const tool of tools) {
      try {
        modelContext.registerTool(tool);
        anyRegistered = true;
      } catch {
        // Ignore duplicate registration errors across re-mounts
      }
    }
    webMcpRegistered = anyRegistered;
    return anyRegistered;
  }

  if (typeof modelContext.provideContext === 'function') {
    try {
      modelContext.provideContext({ tools });
      webMcpRegistered = true;
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
