import React, { useState } from 'react';
import {
  Globe,
  Server,
  UploadCloud,
  FileCode,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  Terminal,
  AlertTriangle,
  Wrench,
} from 'lucide-react';

export const HostingerGuideTab: React.FC = () => {
  const [copiedHtaccess, setCopiedHtaccess] = useState(false);
  const [copiedBuildCommand, setCopiedBuildCommand] = useState(false);

  const htaccessCode = `# LotoSniper - Hostinger SPA Configuration (Apache / LiteSpeed)
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Forçar HTTPS
  RewriteCond %{HTTPS} !=on
  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # Redirecionar todas as rotas para o index.html (SPA)
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar Compressão Gzip para Carregamento Ultrarrápido
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json image/svg+xml
</IfModule>

# Cache de Ativos Estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>`;

  const handleCopyHtaccess = () => {
    navigator.clipboard.writeText(htaccessCode);
    setCopiedHtaccess(true);
    setTimeout(() => setCopiedHtaccess(false), 2000);
  };

  const handleCopyBuild = () => {
    navigator.clipboard.writeText('npm run build');
    setCopiedBuildCommand(true);
    setTimeout(() => setCopiedBuildCommand(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 rounded-2xl border border-emerald-500/30 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Implantação na Hostinger Corrigida e Verificada</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Guia Definitivo de Publicação do LotoSniper na Hostinger
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              O LotoSniper foi configurado para compilar sem erros (com a dependência peer{' '}
              <code className="text-emerald-400">react-is</code> instalada e caminhos relativos{' '}
              <code className="text-emerald-400">base: './'</code>), pronto para rodar em qualquer
              hospedagem compartilhada, Cloud ou VPS da Hostinger com zero atrito.
            </p>
          </div>
        </div>
      </div>

      {/* Resolution of the Build Issue Alert Card */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 text-xs text-slate-300 space-y-2.5 shadow-lg">
        <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Diagnóstico e Correção da Compilação (Recharts + React 19)</span>
        </div>
        <p className="leading-relaxed">
          <strong>Causa do erro anterior:</strong> A biblioteca Recharts requer o pacote{' '}
          <code className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">react-is</code>{' '}
          como dependência direta em ambientes com React 19. Sem ele, o Vite/Rolldown falha ao tentar resolver{' '}
          <code className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">recharts/es6/util/ReactUtils.js</code>.
        </p>
        <p className="leading-relaxed">
          <strong>O que foi corrigido:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-200 pl-1">
          <li>
            Instalamos <code className="text-emerald-300 font-mono">react-is: ^19.3.0</code> em{' '}
            <code className="text-slate-300 font-mono">package.json</code>.
          </li>
          <li>
            Configuramos <code className="text-emerald-300 font-mono">base: './'</code> no{' '}
            <code className="text-slate-300 font-mono">vite.config.ts</code> para garantir que os
            arquivos JS/CSS sejam carregados sem tela branca em qualquer subpasta ou domínio na Hostinger.
          </li>
          <li>
            Configuramos a geração automática do arquivo{' '}
            <code className="text-emerald-300 font-mono">.htaccess</code> direto na pasta{' '}
            <code className="text-slate-300 font-mono">dist/</code>.
          </li>
          <li>
            Testamos a compilação completa com <code className="text-emerald-300 font-mono">npm run build</code>{' '}
            com código de saída 0 (sucesso absoluto).
          </li>
        </ul>
      </div>

      {/* 4-Step Visual Process */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1 */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-bold text-sm flex items-center justify-center mb-3">
              01
            </div>
            <h3 className="font-bold text-white text-sm">Gerar a Build</h3>
            <p className="text-xs text-slate-400 mt-1">
              Execute no terminal para gerar a pasta <strong className="text-white">dist/</strong> minificada.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <code className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2 py-1 rounded">
              npm run build
            </code>
            <button
              onClick={handleCopyBuild}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
              title="Copiar comando"
            >
              {copiedBuildCommand ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 font-mono font-bold text-sm flex items-center justify-center mb-3">
              02
            </div>
            <h3 className="font-bold text-white text-sm">Acessar o hPanel</h3>
            <p className="text-xs text-slate-400 mt-1">
              No painel da Hostinger, abra o <strong>Gerenciador de Arquivos</strong> (File Manager)
              do seu domínio.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400">
            Navegue até: <strong className="text-white">public_html/</strong>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono font-bold text-sm flex items-center justify-center mb-3">
              03
            </div>
            <h3 className="font-bold text-white text-sm">Enviar os Arquivos</h3>
            <p className="text-xs text-slate-400 mt-1">
              Apague arquivos padrão (ex: default.php) e envie todo o conteúdo de{' '}
              <strong className="text-white">dist/</strong> para <strong className="text-white">public_html</strong>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-purple-300">
            index.html + assets/ + .htaccess
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold text-sm flex items-center justify-center mb-3">
              04
            </div>
            <h3 className="font-bold text-white text-sm">Pronto e Online!</h3>
            <p className="text-xs text-slate-400 mt-1">
              O LotoSniper carrega instantaneamente no seu navegador, puxando o último sorteio da Lotofácil automaticamente.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-amber-300 font-semibold">
            Zero Erro 404 no F5
          </div>
        </div>
      </div>

      {/* Code Box: .htaccess */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Arquivo .htaccess Embutido Automaticamente na pasta public/
            </h3>
          </div>

          <button
            onClick={handleCopyHtaccess}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition cursor-pointer"
          >
            {copiedHtaccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar .htaccess</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Este arquivo já foi criado na pasta <code className="text-emerald-400">public/.htaccess</code> e é
          copiado automaticamente para a pasta <code className="text-emerald-400">dist/</code> a cada execução de{' '}
          <code className="text-emerald-400">npm run build</code>.
        </p>

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {htaccessCode}
        </pre>
      </div>

      {/* Full-Stack Node.js Option on Hostinger */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Opção Node.js Full-Stack (Hostinger Cloud ou VPS)</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Caso seu plano da Hostinger suporte aplicações Node.js (painel de aplicações ou VPS), você pode rodar o backend
          completo com a inteligência artificial do Gemini:
        </p>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
          <p className="text-slate-500"># 1. Definir a chave secreta nas variáveis de ambiente:</p>
          <p className="text-emerald-300">GEMINI_API_KEY="SUA_CHAVE_AQUI"</p>
          <p className="text-slate-500 mt-2"># 2. Comando de inicialização no painel:</p>
          <p className="text-white">npm start</p>
        </div>
      </div>
    </div>
  );
};
