import type { Request, Response } from 'express';

export type PublicPagePath = '/' | '/sobre' | '/contato' | '/termos' | '/privacidade';

export interface PageDescriptor {
  path: PublicPagePath;
  title: string;
  description: string;
  h1: string;
  markdown: string;
  ssrMainHtml: string;
  schemaType: 'WebPage' | 'AboutPage' | 'ContactPage';
}

export const SITE_BRAND = 'LotoSniper';
export const CONTACT_EMAIL = 'contato@lotosniper.com.br';
export const DEFAULT_CANONICAL_ORIGIN = 'https://lotosniper.com.br';

export const SAME_AS_LINKS = [
  'https://github.com/lotosniper',
  'https://www.instagram.com/lotosniper',
  'https://www.youtube.com/@lotosniper',
];

export const PUBLIC_PAGE_PATHS: PublicPagePath[] = [
  '/',
  '/sobre',
  '/contato',
  '/termos',
  '/privacidade',
];

export function resolveBaseUrl(req?: Request): string {
  const host = req?.get('host') || '';
  if (host.includes('lotosniper.com.br')) {
    return DEFAULT_CANONICAL_ORIGIN;
  }
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  return DEFAULT_CANONICAL_ORIGIN;
}

export function normalizeRoutePath(rawPath: string): string {
  const clean = rawPath.split('?')[0].split('#')[0] || '/';
  if (clean.length > 1 && clean.endsWith('/')) {
    return clean.slice(0, -1);
  }
  return clean;
}

export function isKnownPublicPagePath(rawPath: string): rawPath is PublicPagePath {
  const normalized = normalizeRoutePath(rawPath);
  return (PUBLIC_PAGE_PATHS as string[]).includes(normalized);
}

/**
 * Checks whether the HTTP client explicitly prefers text/markdown over text/html.
 */
export function prefersMarkdown(req: Request): boolean {
  const acceptHeader = String(req.headers.accept || '').toLowerCase();
  if (!acceptHeader || (!acceptHeader.includes('text/markdown') && !acceptHeader.includes('text/x-markdown'))) {
    return false;
  }

  let markdownQ = -1;
  let htmlQ = -1;

  for (const part of acceptHeader.split(',')) {
    const [rawType, ...params] = part.trim().split(';');
    const type = rawType.trim();
    let q = 1.0;
    for (const param of params) {
      const [k, v] = param.trim().split('=');
      if (k === 'q' && v !== undefined) {
        const parsed = Number.parseFloat(v);
        if (!Number.isNaN(parsed)) q = parsed;
      }
    }
    if (type === 'text/markdown' || type === 'text/x-markdown') {
      markdownQ = Math.max(markdownQ, q);
    } else if (type === 'text/html') {
      htmlQ = Math.max(htmlQ, q);
    }
  }

  if (markdownQ <= 0) return false;
  if (htmlQ < 0) return true;
  return markdownQ >= htmlQ;
}

export function buildRobotsTxt(baseUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Content-Signal: search=yes, ai-train=no',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

export function buildSitemapXml(baseUrl: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/sobre`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${baseUrl}/contato`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${baseUrl}/termos`, changefreq: 'yearly', priority: '0.5' },
    { loc: `${baseUrl}/privacidade`, changefreq: 'yearly', priority: '0.5' },
    { loc: `${baseUrl}/llms.txt`, changefreq: 'weekly', priority: '0.6' },
  ];

  const urlNodes = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlNodes}\n</urlset>\n`;
}

export function buildLlmsTxt(baseUrl: string): string {
  return `# LotoSniper

> Plataforma brasileira de engenharia combinatória, estatística em tempo real e IA preditiva para análise e fechamentos matemáticos da Lotofácil.

O LotoSniper aplica poda combinatória (Branch and Bound), máscaras bitwise para validação instantânea, garantia matemática de 14 pontos e sincronização com resultados oficiais da Caixa Econômica Federal.

## Páginas Principais

- [Página Inicial e Estúdio Combinatório](${baseUrl}/): Estúdio completo de fechamentos da Lotofácil, estatísticas de ciclo, mapa de calor 5×5, simulador e conferidor.
- [Sobre o LotoSniper](${baseUrl}/sobre): Arquitetura matemática, filtros D1–D15, múltiplos M3–M8, geometria da cruz e metodologia combinatória.
- [Contato e Suporte](${baseUrl}/contato): Canal oficial de atendimento via ${CONTACT_EMAIL} e informações institucionais.
- [Termos de Uso](${baseUrl}/termos): Regras de utilização, isenção de responsabilidade lotérica e diretrizes estatísticas.
- [Política de Privacidade](${baseUrl}/privacidade): Tratamento de dados locais no navegador, transparência e segurança.

## Capacidades para Agentes (MCP & Negociação de Conteúdo)

- [MCP Server Card](${baseUrl}/.well-known/mcp/server-card.json): Descritor SEP-1649 com ferramentas para validar bilhetes, gerar fechamentos e consultar o último concurso.
- [Sitemap XML](${baseUrl}/sitemap.xml): Índice estruturado de todas as URLs públicas da plataforma.
- Negociação Markdown: Envie \`Accept: text/markdown\` em qualquer página pública para receber conteúdo limpo em Markdown.
`;
}

export function buildMcpServerCard(baseUrl: string) {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server-card.schema.json',
    version: '1.0',
    protocolVersion: '2025-11-25',
    serverInfo: {
      name: 'lotosniper-mcp',
      title: 'LotoSniper Combinatorial & Lotofácil Engine',
      version: '1.0.0',
    },
    name: 'lotosniper-mcp',
    description:
      'Servidor MCP do LotoSniper para validação estatística de bilhetes da Lotofácil, geração de fechamentos matemáticos com garantia de 14 pontos e consulta ao último concurso sincronizado.',
    documentationUrl: `${baseUrl}/llms.txt`,
    homepage: `${baseUrl}/`,
    transport: {
      type: 'streamable-http',
      endpoint: `${baseUrl}/api/mcp`,
    },
    capabilities: {
      tools: {
        listChanged: false,
      },
    },
    tools: [
      {
        name: 'lotosniper_get_latest_draw',
        description:
          'Retorna o último concurso da Lotofácil sincronizado pela plataforma, incluindo número do concurso, data e as 15 dezenas sorteadas.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'lotosniper_validate_ticket',
        description:
          'Valida um bilhete de 15 dezenas (1 a 25) da Lotofácil contra os filtros posicionais D1-D15, múltiplos M3-M8, soma dos dígitos (63-87), geometria da cruz, soma total, primos e moldura.',
        inputSchema: {
          type: 'object',
          properties: {
            dezenas: {
              type: 'array',
              description: 'Lista ordenada ou não de 15 dezenas inteiras distintas entre 1 e 25.',
              items: { type: 'integer', minimum: 1, maximum: 25 },
              minItems: 15,
              maxItems: 15,
            },
          },
          required: ['dezenas'],
          additionalProperties: false,
        },
      },
      {
        name: 'lotosniper_generate_closure',
        description:
          'Gera uma matriz combinatória de fechamento da Lotofácil com filtros de alta precisão e controle de distância Hamming.',
        inputSchema: {
          type: 'object',
          properties: {
            pool: {
              type: 'array',
              description: 'Conjunto base de 16 a 22 dezenas distintas (entre 1 e 25).',
              items: { type: 'integer', minimum: 1, maximum: 25 },
              minItems: 16,
              maxItems: 22,
            },
            maxTickets: {
              type: 'integer',
              description: 'Quantidade máxima de jogos gerados na matriz (1 a 50).',
              minimum: 1,
              maximum: 50,
            },
          },
          required: ['pool'],
          additionalProperties: false,
        },
      },
    ],
    contact: {
      email: CONTACT_EMAIL,
      url: `${baseUrl}/contato`,
    },
  };
}

export function setAgentLinkHeaders(res: Response, pagePath: PublicPagePath): void {
  res.setHeader('Vary', 'Accept');
  res.setHeader(
    'Link',
    [
      '</llms.txt>; rel="alternate"; type="text/plain"; title="LLMs.txt"',
      `<${pagePath}>; rel="alternate"; type="text/markdown"; title="Markdown"`,
      '</sitemap.xml>; rel="sitemap"; type="application/xml"',
      '</.well-known/mcp/server-card.json>; rel="describedby"; type="application/json"; title="MCP Server Card"',
    ].join(', ')
  );
}

function buildFooterLinksHtml(): string {
  return `
  <footer class="border-t border-slate-900 bg-slate-950 py-6 px-4 text-xs text-slate-400">
    <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
      <p>LotoSniper — Engenharia Combinatória e IA para Lotofácil.</p>
      <nav aria-label="Links institucionais e legais" class="flex flex-wrap items-center gap-4">
        <a href="/">Início</a>
        <a href="/sobre">Sobre</a>
        <a href="/contato">Contato</a>
        <a href="/termos">Termos de Uso</a>
        <a href="/privacidade">Privacidade</a>
        <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>
      </nav>
    </div>
  </footer>`;
}

export function getPageDescriptor(pagePath: PublicPagePath, baseUrl: string): PageDescriptor {
  switch (pagePath) {
    case '/sobre':
      return {
        path: '/sobre',
        title: 'Sobre o LotoSniper – Metodologia Matemática e IA',
        description:
          'Conheça os algoritmos combinatórios do LotoSniper: fechamentos de 14 pontos, poda Branch and Bound, filtros D1-D15, M3-M8 e IA preditiva.',
        h1: 'Sobre o LotoSniper',
        schemaType: 'AboutPage',
        markdown: `# Sobre o LotoSniper

> Arquitetura matemática, validação bitwise e inteligência estatística para otimizar apostas na Lotofácil.

## Missão e Tecnologia

O **LotoSniper** nasceu para transformar a forma como apostadores e pesquisadores estruturam jogos da Lotofácil (universo de C(25,15) = 3.268.760 combinações possíveis). Em vez de palpites aleatórios, a plataforma aplica matemática combinatória rigorosa.

## Pilares do Motor Combinatório

- **Poda Antecipada (Branch and Bound)**: Eliminação em tempo real de subárvores improváveis durante a geração em Web Worker dedicado.
- **Filtros Posicionais D1 a D15**: Validação histórica de posição por bola ordenada com cobertura superior a 95%.
- **Múltiplos M3 a M8 & Soma dos Dígitos (63–87)**: Máscaras bitwise estáticas que reduzem milhões de combinações fora da curva estatística.
- **Geometria da Cruz & Equilíbrio Histórico**: Controle espacial do volante 5×5 e estratificação anti-cisne negro (75/15/10).
- **Espalhamento Hamming & Fixas Rotativas (K de N)**: Diversificação matemática entre bilhetes para maximizar cobertura de 14 e 15 pontos.

## Links Relacionados

- [Voltar ao Estúdio LotoSniper](${baseUrl}/)
- [Contato e Suporte](${baseUrl}/contato)
- [Termos de Uso](${baseUrl}/termos)
- [Política de Privacidade](${baseUrl}/privacidade)
`,
        ssrMainHtml: `<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800 px-4 py-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
      <a href="/" class="font-mono font-black text-emerald-400">LOTOSNIPER</a>
      <nav aria-label="Navegação principal" class="flex gap-4 text-sm text-slate-300">
        <a href="/">Início</a>
        <a href="/sobre">Sobre</a>
        <a href="/contato">Contato</a>
      </nav>
    </div>
  </header>
  <main class="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-6">
    <h1 class="text-2xl font-bold text-white">Sobre o LotoSniper</h1>
    <p class="text-slate-300">O LotoSniper é uma plataforma brasileira de engenharia combinatória, estatística em tempo real e IA preditiva desenvolvida para estruturar fechamentos da Lotofácil com rigor matemático.</p>
    <section class="space-y-2">
      <h2 class="text-lg font-semibold text-emerald-400">Arquitetura Matemática e Filtros</h2>
      <ul class="list-disc pl-5 text-slate-300 space-y-1">
        <li>Fechamentos com garantia matemática de 14 pontos e espalhamento por distância de Hamming.</li>
        <li>Filtros posicionais D1 a D15 e máscaras bitwise de múltiplos M3 a M8 com poda antecipada.</li>
        <li>Validação de soma dos dígitos (63–87), geometria da cruz no volante 5×5 e histórico de ciclos.</li>
      </ul>
    </section>
  </main>
  ${buildFooterLinksHtml()}
</div>`,
      };

    case '/contato':
      return {
        path: '/contato',
        title: 'Contato – LotoSniper Suporte e Parcerias',
        description:
          'Entre em contato com a equipe do LotoSniper para suporte técnico, dúvidas sobre fechamentos da Lotofácil, integrações MCP ou parcerias.',
        h1: 'Contato e Suporte LotoSniper',
        schemaType: 'ContactPage',
        markdown: `# Contato e Suporte LotoSniper

> Canal oficial de atendimento da plataforma LotoSniper.

## Canais Diretos

- **E-mail Oficial**: [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})
- **Website**: [${baseUrl}/](${baseUrl}/)
- **Documentação para Agentes**: [${baseUrl}/llms.txt](${baseUrl}/llms.txt)

## Horário e Escopo de Atendimento

Atendemos solicitações relacionadas a suporte técnico do estúdio de fechamentos, sincronização de concursos da Lotofácil, relatórios de erro e parcerias institucionais.

## Páginas Relacionadas

- [Estúdio LotoSniper](${baseUrl}/)
- [Sobre a Plataforma](${baseUrl}/sobre)
- [Termos de Uso](${baseUrl}/termos)
- [Política de Privacidade](${baseUrl}/privacidade)
`,
        ssrMainHtml: `<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800 px-4 py-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
      <a href="/" class="font-mono font-black text-emerald-400">LOTOSNIPER</a>
      <nav aria-label="Navegação principal" class="flex gap-4 text-sm text-slate-300">
        <a href="/">Início</a>
        <a href="/sobre">Sobre</a>
        <a href="/contato">Contato</a>
      </nav>
    </div>
  </header>
  <main class="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-6">
    <h1 class="text-2xl font-bold text-white">Contato e Suporte LotoSniper</h1>
    <p class="text-slate-300">Precisa de suporte técnico, informações sobre integrações MCP/WebMCP ou parcerias com o LotoSniper? Fale diretamente com nossa equipe.</p>
    <section class="space-y-2">
      <h2 class="text-lg font-semibold text-emerald-400">Canal Oficial</h2>
      <p class="text-slate-300">E-mail de atendimento: <a href="mailto:${CONTACT_EMAIL}" class="text-emerald-400 underline">${CONTACT_EMAIL}</a></p>
      <p class="text-slate-400 text-sm">Respondemos solicitações técnicas, dúvidas sobre filtros matemáticos e questões legais em dias úteis.</p>
    </section>
  </main>
  ${buildFooterLinksHtml()}
</div>`,
      };

    case '/termos':
      return {
        path: '/termos',
        title: 'Termos de Uso – LotoSniper Lotofácil',
        description:
          'Leia os Termos de Uso do LotoSniper: natureza matemática e educacional dos fechamentos, ausência de vínculo com a Caixa e responsabilidade.',
        h1: 'Termos de Uso do LotoSniper',
        schemaType: 'WebPage',
        markdown: `# Termos de Uso do LotoSniper

> Condições gerais de uso da plataforma analítica e combinatória LotoSniper.

## 1. Natureza da Ferramenta

O LotoSniper é uma ferramenta de análise estatística, combinatória e simulação matemática aplicada à Lotofácil. A plataforma **não realiza apostas oficiais** e **não possui vínculo com a Caixa Econômica Federal**.

## 2. Garantias Combinatórias

As garantias matemáticas (como fechamentos de 14 pontos) aplicam-se estritamente às condições combinatórias da matriz selecionada quando as dezenas sorteadas estão contidas no universo escolhido, sem prometer ganhos financeiros certos em sorteios aleatórios.

## 3. Contato

Dúvidas sobre estes termos podem ser enviadas para [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}).
`,
        ssrMainHtml: `<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800 px-4 py-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
      <a href="/" class="font-mono font-black text-emerald-400">LOTOSNIPER</a>
      <nav aria-label="Navegação principal" class="flex gap-4 text-sm text-slate-300">
        <a href="/">Início</a>
        <a href="/sobre">Sobre</a>
        <a href="/contato">Contato</a>
      </nav>
    </div>
  </header>
  <main class="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-6">
    <h1 class="text-2xl font-bold text-white">Termos de Uso do LotoSniper</h1>
    <p class="text-slate-300">O LotoSniper é uma ferramenta analítica de matemática combinatória e estatística para Lotofácil. Não intermediamos apostas oficiais nem possuímos vínculo institucional com a Caixa Econômica Federal.</p>
    <section class="space-y-2">
      <h2 class="text-lg font-semibold text-emerald-400">Escopo das Garantias Matemáticas</h2>
      <p class="text-slate-300">Fechamentos de 14 pontos garantem cobertura condicional caso as dezenas sorteadas estejam no grupo base utilizado e não tenham sido podadas por filtros opcionais. Dúvidas: <a href="mailto:${CONTACT_EMAIL}" class="text-emerald-400 underline">${CONTACT_EMAIL}</a>.</p>
    </section>
  </main>
  ${buildFooterLinksHtml()}
</div>`,
      };

    case '/privacidade':
      return {
        path: '/privacidade',
        title: 'Política de Privacidade – LotoSniper',
        description:
          'Política de Privacidade do LotoSniper: armazenamento local de jogos salvos, ausência de venda de dados pessoais e transparência LGPD.',
        h1: 'Política de Privacidade do LotoSniper',
        schemaType: 'WebPage',
        markdown: `# Política de Privacidade do LotoSniper

> Compromisso com transparência, privacidade e segurança de dados no LotoSniper.

## 1. Armazenamento Local

Os bilhetes gerados, preferências de filtros e fechamentos salvos são armazenados localmente no navegador do usuário (\`localStorage\`) e processados em Web Workers locais sempre que possível.

## 2. Sincronização e IA

Consultas de resultados oficiais da Lotofácil e análises preditivas utilizam rotas de API sem venda ou compartilhamento comercial de dados pessoais com terceiros.

## 3. Direitos do Titular (LGPD)

Para solicitações sobre privacidade ou remoção de registros, escreva para [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}).
`,
        ssrMainHtml: `<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800 px-4 py-4">
    <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
      <a href="/" class="font-mono font-black text-emerald-400">LOTOSNIPER</a>
      <nav aria-label="Navegação principal" class="flex gap-4 text-sm text-slate-300">
        <a href="/">Início</a>
        <a href="/sobre">Sobre</a>
        <a href="/contato">Contato</a>
      </nav>
    </div>
  </header>
  <main class="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-6">
    <h1 class="text-2xl font-bold text-white">Política de Privacidade do LotoSniper</h1>
    <p class="text-slate-300">O LotoSniper prioriza processamento local no navegador (Web Workers e localStorage) para proteger suas matrizes e preferências de jogo, em conformidade com a LGPD.</p>
    <section class="space-y-2">
      <h2 class="text-lg font-semibold text-emerald-400">Contato do Encarregado (DPO)</h2>
      <p class="text-slate-300">Solicitações sobre privacidade ou exclusão de dados podem ser enviadas para <a href="mailto:${CONTACT_EMAIL}" class="text-emerald-400 underline">${CONTACT_EMAIL}</a>.</p>
    </section>
  </main>
  ${buildFooterLinksHtml()}
</div>`,
      };

    case '/':
    default:
      return {
        path: '/',
        title: 'LotoSniper – Fechamentos e IA para Lotofácil',
        description:
          'Gere fechamentos matemáticos da Lotofácil com garantia de 14 pontos, filtros combinatórios, estatísticas em tempo real e IA preditiva.',
        h1: 'LotoSniper — Fechamentos Matemáticos e IA para Lotofácil',
        schemaType: 'WebPage',
        markdown: `# LotoSniper — Fechamentos Matemáticos e IA para Lotofácil

> Gere fechamentos matemáticos da Lotofácil com garantia de 14 pontos, filtros combinatórios, estatísticas em tempo real e IA preditiva.

## Principais Funcionalidades

- **Estúdio de Fechamentos**: Matrizes combinatórias de 14 pontos com espalhamento Hamming, fixas rotativas (K de N) e estratificação anti-cisne negro (75/15/10).
- **Filtros Matemáticos de Alta Precisão**: Intervalos posicionais D1–D15, múltiplos M3–M8 em máscara bitwise, soma dos dígitos (63–87), geometria da cruz e ranking histórico.
- **Estatísticas e Mapa de Calor 5×5**: Análise de ciclos das 25 dezenas, atrasos, moldura, primos, Fibonacci e tendências recentes da Caixa.
- **Simulador & Conferidor Oficial**: Auditoria de bilhetes contra resultados oficiais e backtesting histórico.
- **IA Preditiva**: Ranqueamento probabilístico de dezenas com fallback determinístico.

## Páginas e Contato

- [Sobre o LotoSniper](${baseUrl}/sobre)
- [Contato e Suporte](${baseUrl}/contato) — [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})
- [Termos de Uso](${baseUrl}/termos)
- [Política de Privacidade](${baseUrl}/privacidade)
- [LLMs.txt](${baseUrl}/llms.txt)
- [MCP Server Card](${baseUrl}/.well-known/mcp/server-card.json)
`,
        ssrMainHtml: `<div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
  <header class="border-b border-slate-800 px-4 py-4">
    <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-black text-emerald-400 font-mono">LOTOSNIPER</h1>
        <p class="text-xs text-slate-400">Fechamentos Matemáticos, Estatística Avançada e IA para Lotofácil</p>
      </div>
      <nav aria-label="Navegação principal" class="flex flex-wrap gap-4 text-sm text-slate-300">
        <a href="/">Estúdio</a>
        <a href="/sobre">Sobre</a>
        <a href="/contato">Contato</a>
        <a href="/termos">Termos</a>
        <a href="/privacidade">Privacidade</a>
      </nav>
    </div>
  </header>
  <main class="flex-1 max-w-5xl mx-auto px-4 py-8 space-y-6">
    <section class="space-y-2">
      <h2 class="text-lg font-bold text-white">Motor Combinatório para Lotofácil (Alvo 14 e 15 Pontos)</h2>
      <p class="text-slate-300">O LotoSniper aplica matemática combinatória em Web Worker dedicado para gerar fechamentos econômicos da Lotofácil sobre o universo de C(25,15) = 3.268.760 combinações.</p>
    </section>
    <section class="space-y-2">
      <h2 class="text-lg font-bold text-emerald-400">Recursos e Filtros de Alta Precisão</h2>
      <ul class="list-disc pl-5 text-slate-300 space-y-1">
        <li>Fechamentos matemáticos com garantia de 14 pontos, espalhamento por distância de Hamming e fixas rotativas K de N.</li>
        <li>Filtros posicionais D1 a D15, múltiplos M3 a M8 bitwise, soma dos dígitos (63–87) e geometria da cruz no volante 5×5.</li>
        <li>Sincronização com resultados oficiais da Caixa, estatísticas de ciclo, mapa de calor, simulador histórico e conferidor automático.</li>
      </ul>
    </section>
  </main>
  ${buildFooterLinksHtml()}
</div>`,
      };
  }
}

export function buildStructuredDataJsonLd(page: PageDescriptor, baseUrl: string): string {
  const canonicalUrl = page.path === '/' ? `${baseUrl}/` : `${baseUrl}${page.path}`;

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: SITE_BRAND,
      alternateName: 'LotoSniper AI Pro',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/pwa-512x512.png`,
        width: 512,
        height: 512,
      },
      description:
        'Plataforma brasileira de engenharia combinatória e inteligência artificial para análise estatística e fechamentos da Lotofácil.',
      email: CONTACT_EMAIL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: CONTACT_EMAIL,
        availableLanguage: ['Portuguese'],
      },
      sameAs: SAME_AS_LINKS,
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: SITE_BRAND,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${baseUrl}/#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${baseUrl}/#webapp`,
      name: SITE_BRAND,
      url: `${baseUrl}/`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'All',
      inLanguage: 'pt-BR',
      description:
        'Motor combinatório para Lotofácil com fechamentos de 14 pontos, filtros posicionais D1-D15, múltiplos M3-M8, mapas de calor e IA preditiva.',
      publisher: { '@id': `${baseUrl}/#organization` },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'BRL',
      },
    },
    {
      '@type': page.schemaType,
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: page.title,
      description: page.description,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${baseUrl}/#website` },
      about: { '@id': `${baseUrl}/#webapp` },
    },
  ];

  if (page.path === '/') {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${baseUrl}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'O que é o LotoSniper?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'O LotoSniper é uma plataforma de análise estatística, inteligência artificial e engenharia combinatória para gerar fechamentos otimizados da Lotofácil.',
          },
        },
        {
          '@type': 'Question',
          name: 'Quais filtros matemáticos o LotoSniper utiliza?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Inclui filtros posicionais D1-D15, máscaras de múltiplos M3-M8, soma dos dígitos (63-87), geometria da cruz, ranking histórico, espalhamento Hamming e fixas rotativas.',
          },
        },
        {
          '@type': 'Question',
          name: 'Como entrar em contato com a equipe do LotoSniper?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: `O suporte oficial atende pelo e-mail ${CONTACT_EMAIL} e pela página ${baseUrl}/contato.`,
          },
        },
      ],
    });
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

export function applySsrMetadataAndBody(
  templateHtml: string,
  pagePath: PublicPagePath,
  baseUrl: string
): string {
  const page = getPageDescriptor(pagePath, baseUrl);
  const canonicalUrl = page.path === '/' ? `${baseUrl}/` : `${baseUrl}${page.path}`;
  const jsonLd = buildStructuredDataJsonLd(page, baseUrl);

  let html = templateHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeAttr(page.description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeAttr(page.title)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeAttr(page.description)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeAttr(page.title)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeAttr(page.description)}" />`
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`
  );
  html = html.replace(
    /<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">${jsonLd}</script>`
  );
  html = html.replace(
    /<!--SSR_ROOT_START-->[\s\S]*?<!--SSR_ROOT_END-->/,
    `<!--SSR_ROOT_START-->${page.ssrMainHtml}<!--SSR_ROOT_END-->`
  );

  return html;
}

export function buildNotFoundHtml(requestedPath: string, baseUrl: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>404 — Página não encontrada | LotoSniper</title>
  <meta name="description" content="A página solicitada não foi encontrada no LotoSniper." />
  <link rel="canonical" href="${escapeAttr(baseUrl)}/" />
</head>
<body class="bg-slate-950 text-slate-100 antialiased">
  <main style="max-width:640px;margin:64px auto;padding:0 16px;font-family:system-ui,sans-serif;">
    <h1>404 — Página não encontrada</h1>
    <p>O endereço <code>${escapeHtml(requestedPath)}</code> não existe no LotoSniper.</p>
    <nav aria-label="Páginas disponíveis">
      <ul>
        <li><a href="/">Ir para a página inicial do LotoSniper</a></li>
        <li><a href="/sobre">Sobre o LotoSniper</a></li>
        <li><a href="/contato">Contato (${CONTACT_EMAIL})</a></li>
        <li><a href="/termos">Termos de Uso</a></li>
        <li><a href="/privacidade">Política de Privacidade</a></li>
      </ul>
    </nav>
  </main>
</body>
</html>`;
}

export function buildNotFoundMarkdown(requestedPath: string, baseUrl: string): string {
  return `# 404 — Página não encontrada

O endereço \`${requestedPath}\` não existe no LotoSniper.

- [Página Inicial](${baseUrl}/)
- [Sobre](${baseUrl}/sobre)
- [Contato](${baseUrl}/contato)
- [LLMs.txt](${baseUrl}/llms.txt)
`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(input: string): string {
  return escapeHtml(input).replace(/"/g, '&quot;');
}
