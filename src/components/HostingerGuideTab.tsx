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
} from 'lucide-react';

export const HostingerGuideTab: React.FC = () => {
  const [copiedHtaccess, setCopiedHtaccess] = useState(false);
  const [copiedBuildCommand, setCopiedBuildCommand] = useState(false);

  const htaccessCode = `# LotoMatrix Pro - Hostinger SPA Configuration
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

# Habilitar Compressão Gzip para Carregamento Instantâneo
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 rounded-2xl border border-indigo-500/20 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Publicação Web Hostinger (hPanel / Hospedagem Compartilhada ou Cloud)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Como Publicar o LotoMatrix Pro no seu Domínio da Hostinger
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              O LotoMatrix Pro foi concebido com arquitetura híbrida de alta resiliência: toda a
              matemática combinatória, fechamentos de 14 pontos, filtros canônicos e conferidor
              executam nativamente no navegador do usuário, permitindo publicação direta em
              qualquer plano de hospedagem da Hostinger.
            </p>
          </div>
        </div>
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
              Gere os arquivos compilados e minificados prontos para a web.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
            <code className="text-[11px] font-mono text-emerald-300 bg-slate-950 px-2 py-1 rounded">
              npm run build
            </code>
            <button
              onClick={handleCopyBuild}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
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
            Pasta: <strong className="text-white">public_html/</strong>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono font-bold text-sm flex items-center justify-center mb-3">
              03
            </div>
            <h3 className="font-bold text-white text-sm">Fazer Upload</h3>
            <p className="text-xs text-slate-400 mt-1">
              Envie o conteúdo gerado dentro da pasta <strong className="text-white">dist/</strong>{' '}
              diretamente para a raiz <strong className="text-white">public_html</strong>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-purple-300">
            index.html + assets/
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold text-sm flex items-center justify-center mb-3">
              04
            </div>
            <h3 className="font-bold text-white text-sm">Criar o .htaccess</h3>
            <p className="text-xs text-slate-400 mt-1">
              Crie o arquivo <code className="text-white">.htaccess</code> em public_html para
              garantir navegação fluida sem erro 404.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-amber-300 font-semibold">
            Código pronto abaixo
          </div>
        </div>
      </div>

      {/* Code Box: .htaccess */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Conteúdo do Arquivo .htaccess (Hostinger Apache / LiteSpeed)
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

        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
          {htaccessCode}
        </pre>
      </div>

      {/* Full-Stack Node.js Option on Hostinger (VPS or Cloud) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Opção Full-Stack Node.js (Para IA Gemini no Hostinger Cloud / VPS)</span>
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Caso você tenha um plano <strong>Hostinger Cloud</strong> ou <strong>VPS</strong> com
          suporte a Node.js, você pode rodar o servidor <code className="text-emerald-400">server.ts</code>{' '}
          diretamente:
        </p>

        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
          <p className="text-slate-500"># 1. Configurar variável de ambiente no painel Node.js:</p>
          <p className="text-emerald-300">GEMINI_API_KEY="SUA_CHAVE_AQUI"</p>
          <p className="text-slate-500 mt-2"># 2. Comando de inicialização:</p>
          <p className="text-white">npm start</p>
        </div>
      </div>
    </div>
  );
};
