import React from 'react';
import { ArrowLeft, Mail, ShieldCheck, FileText, Info, Cpu } from 'lucide-react';

export type PublicInfoRoute = '/sobre' | '/contato' | '/termos' | '/privacidade';

interface LegalInfoPagesProps {
  page: PublicInfoRoute;
  onNavigate: (path: '/' | PublicInfoRoute) => void;
}

export const LegalInfoPages: React.FC<LegalInfoPagesProps> = ({ page, onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: '/' | PublicInfoRoute) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <article className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-6 text-slate-200">
      <div>
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Estúdio LotoSniper</span>
        </a>
      </div>

      {page === '/sobre' && (
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Info className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sobre o LotoSniper
            </h1>
          </div>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            O <strong className="text-emerald-400">LotoSniper</strong> é uma plataforma brasileira de engenharia combinatória,
            estatística em tempo real e inteligência artificial aplicada à análise e construção de fechamentos para a Lotofácil.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                <span>Motor Combinatório Web Worker</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Processamento fora da thread principal com poda antecipada (Branch and Bound), garantia de 14 pontos,
                espalhamento bitwise por distância de Hamming e fixas rotativas K de N.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Filtros Estatísticos de Precisão</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Validação instantânea com intervalos posicionais D1–D15, múltiplos M3–M8, soma dos dígitos (63–87),
                geometria da cruz no volante 5×5, estratificação anti-cisne negro e ranking histórico.
              </p>
            </div>
          </div>
        </section>
      )}

      {page === '/contato' && (
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Mail className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Contato e Suporte LotoSniper
            </h1>
          </div>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Para dúvidas sobre fechamentos matemáticos, suporte técnico, parcerias institucionais ou integrações
            MCP/WebMCP, utilize nosso canal oficial de atendimento.
          </p>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-emerald-400">Canal Direto</h2>
            <p className="text-sm text-slate-200">
              E-mail:{' '}
              <a
                href="mailto:contato@lotosniper.com.br"
                className="text-emerald-400 hover:text-emerald-300 underline font-mono"
              >
                contato@lotosniper.com.br
              </a>
            </p>
            <p className="text-xs text-slate-400">
              Consulte também nossa documentação estruturada para agentes em{' '}
              <a href="/llms.txt" className="text-sky-400 underline">
                /llms.txt
              </a>
              .
            </p>
          </div>
        </section>
      )}

      {page === '/termos' && (
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Termos de Uso do LotoSniper
            </h1>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-1.5">
              <h2 className="text-base font-bold text-emerald-400">1. Natureza Analítica da Ferramenta</h2>
              <p>
                O LotoSniper oferece análises estatísticas, simulações históricas e geração matemática de matrizes
                combinatórias para a Lotofácil. A plataforma não realiza apostas nem possui vínculo oficial com a
                Caixa Econômica Federal.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-base font-bold text-emerald-400">2. Escopo de Garantias Combinatórias</h2>
              <p>
                As garantias matemáticas (ex.: 14 pontos) aplicam-se exclusivamente às propriedades combinatórias
                do universo selecionado, condicionadas à presença das dezenas sorteadas no conjunto base e aos filtros
                ativados pelo usuário.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-base font-bold text-emerald-400">3. Contato Legal</h2>
              <p>
                Questões relacionadas a estes termos podem ser enviadas para{' '}
                <a href="mailto:contato@lotosniper.com.br" className="text-emerald-400 underline">
                  contato@lotosniper.com.br
                </a>
                .
              </p>
            </section>
          </div>
        </section>
      )}

      {page === '/privacidade' && (
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Política de Privacidade do LotoSniper
            </h1>
          </div>

          <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-1.5">
              <h2 className="text-base font-bold text-emerald-400">1. Processamento Local</h2>
              <p>
                Seus jogos salvos, configurações de filtros e fechamentos são mantidos localmente no armazenamento do
                navegador (localStorage) e calculados em Web Workers locais no seu dispositivo.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-base font-bold text-emerald-400">2. Sincronização de Resultados e Privacidade</h2>
              <p>
                Não vendemos nem compartilhamos dados pessoais com terceiros. Requisições de sincronização com
                resultados da Lotofácil e análises preditivas utilizam apenas os parâmetros necessários à consulta.
              </p>
            </section>

            <section className="space-y-1.5">
              <h2 className="text-base font-bold text-emerald-400">3. Canal de Privacidade (LGPD)</h2>
              <p>
                Para exercer seus direitos de acesso ou exclusão de dados, escreva para{' '}
                <a href="mailto:contato@lotosniper.com.br" className="text-emerald-400 underline">
                  contato@lotosniper.com.br
                </a>
                .
              </p>
            </section>
          </div>
        </section>
      )}
    </article>
  );
};
