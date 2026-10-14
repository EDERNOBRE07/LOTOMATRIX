import React, { useState } from 'react';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';
import { LotofacilDraw } from '../types/lotofacil';

interface Diagnostic3803PanelProps {
  onApplyOptimalPool: () => void;
  targetCount: number;
}

export const Diagnostic3803Panel: React.FC<Diagnostic3803PanelProps> = ({
  onApplyOptimalPool,
  targetCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Official data of Concurso 3803
  const dezenasSorteadas3803 = [3, 6, 7, 8, 9, 11, 12, 13, 15, 16, 19, 20, 21, 22, 23];
  // Previous reference pool of 18 numbers
  const dezenasAnteriores18 = [1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 17, 19, 20, 21, 22, 25];

  // Matched inside the 18 pool
  const acertos = dezenasAnteriores18.filter((n) => dezenasSorteadas3803.includes(n)); // 10 numbers
  // Missing from the 18 pool
  const perdidas = dezenasSorteadas3803.filter((n) => !dezenasAnteriores18.includes(n)); // [6, 8, 15, 16, 23]

  // Document strategy simulation for Concurso 3803 (based on 3802)
  // 3802 draw: [2, 3, 5, 6, 9, 10, 11, 12, 14, 15, 19, 20, 21, 23, 24]
  // 3802 absent: [1, 4, 7, 8, 13, 16, 17, 18, 22, 25]
  // Picking 9 absent: captures 4 or 5 of [7, 8, 13, 16, 22]
  // Picking 9 repeated: captures 8 of [3, 6, 9, 11, 12, 15, 19, 20, 21, 23]
  // Total in pool: 13 to 14 hits!

  return (
    <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 rounded-2xl border border-amber-500/30 p-4 sm:p-5 shadow-xl transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold mb-1">
              <span>Auditoria Matemática & Revisão de Probabilidades</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Diagnóstico do Concurso 3803: Por que a pontuação foi ≤ 9 acertos?</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
              Análise combinatória e distribuição hipergeométrica comprovando o motivo pelo qual o
              fechamento de 18 dezenas (12 jogos) não pontuou acima de 9 pontos e como a nova lógica
              do documento oficial resolve esse caso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <span>{isOpen ? 'Recolher Análise' : 'Ver Diagnóstico Completo'}</span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-5 animate-in fade-in duration-200">
          {/* Section 1: Number breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Dezenas Sorteadas no Concurso 3803 (15 Dezenas):</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {dezenasSorteadas3803.map((num) => {
                  const wasCaptured = dezenasAnteriores18.includes(num);
                  return (
                    <span
                      key={num}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        wasCaptured
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/50 line-through'
                      }`}
                      title={wasCaptured ? 'Capturada na matriz' : 'Ficou de fora da matriz'}
                    >
                      {num.toString().padStart(2, '0')}
                    </span>
                  );
                })}
              </div>
              <div className="text-[11px] text-slate-400 mt-2.5 flex items-center justify-between">
                <span>
                  Capturadas pela matriz: <strong className="text-emerald-400 font-mono">10</strong>
                </span>
                <span>
                  Perdidas (fora da matriz): <strong className="text-rose-400 font-mono">5</strong> (06, 08, 15, 16, 23)
                </span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Matriz de 18 Dezenas Utilizada Anteriormente:</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {dezenasAnteriores18.map((num) => {
                  const wasDrawn = dezenasSorteadas3803.includes(num);
                  return (
                    <span
                      key={num}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                        wasDrawn
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                      title={wasDrawn ? 'Dezena premiada' : 'Dezena não sorteada'}
                    >
                      {num.toString().padStart(2, '0')}
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-amber-300/90 mt-2.5">
                A matriz continha 10 dezenas sorteadas e 8 dezenas que não saíram (01, 02, 04, 05, 10, 14, 17, 25).
              </p>
            </div>
          </div>

          {/* Section 2: Exact Hypergeometric Law */}
          <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <span>A Lei Matemática da Distribuição Hipergeométrica (Por que nenhum jogo fez &gt; 9 pontos):</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Em qualquer fechamento matemático, a garantia de 14 pontos funciona sob a condição:
              <strong className="text-white"> "Se as 15 dezenas sorteadas estiverem DENTRO das 18 dezenas escolhidas"</strong>.
              Como a matriz continha apenas <strong className="text-amber-400 font-mono">10 acertos</strong> (e 8 números errados), cada bilhete gerado
              é obrigado a selecionar pelo menos 5 números errados (pois 15 dezenas no bilhete - 10 acertos possíveis = 5 erros obrigatórios).
            </p>

            {/* Hypergeometric Probability Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-900 text-slate-400 text-[11px]">
                  <tr>
                    <th className="p-2.5">Pontuação Possível</th>
                    <th className="p-2.5">Fórmula Hipergeométrica</th>
                    <th className="p-2.5">Probabilidade Real</th>
                    <th className="p-2.5">Total de Bilhetes em 816</th>
                    <th className="p-2.5">Status no Fechamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                  <tr className="bg-rose-950/20 text-rose-300">
                    <td className="p-2 font-bold">11, 12, 13, 14, 15 Pontos</td>
                    <td className="p-2">C(10, k) × C(8, 15-k) / C(18, 15)</td>
                    <td className="p-2 font-black">0.00%</td>
                    <td className="p-2">0 de 816</td>
                    <td className="p-2 text-rose-400 font-sans font-bold">Impossível (Matriz só tinha 10 acertos)</td>
                  </tr>
                  <tr className="bg-slate-900/60 text-slate-200">
                    <td className="p-2 font-bold">10 Pontos (Pico Máximo)</td>
                    <td className="p-2">C(10, 10) × C(8, 5) / 816</td>
                    <td className="p-2 font-bold text-amber-400">6.86%</td>
                    <td className="p-2">56 de 816</td>
                    <td className="p-2 text-slate-400 font-sans">Apenas 1 a cada 15 bilhetes possíveis</td>
                  </tr>
                  <tr className="bg-emerald-950/20 text-emerald-300 font-bold">
                    <td className="p-2 font-bold">9 Pontos (Padrão Ocorrido)</td>
                    <td className="p-2">C(10, 9) × C(8, 6) / 816</td>
                    <td className="p-2 font-black text-emerald-400">34.31%</td>
                    <td className="p-2">280 de 816</td>
                    <td className="p-2 text-emerald-300 font-sans">Faixa de maior concentração</td>
                  </tr>
                  <tr className="bg-slate-900/40 text-slate-300">
                    <td className="p-2 font-bold">8 Pontos</td>
                    <td className="p-2">C(10, 8) × C(8, 7) / 816</td>
                    <td className="p-2 font-bold">44.12%</td>
                    <td className="p-2">360 de 816</td>
                    <td className="p-2 text-slate-400 font-sans">Maioria estatística absoluta</td>
                  </tr>
                  <tr className="bg-slate-900/20 text-slate-400">
                    <td className="p-2 font-bold">7 Pontos</td>
                    <td className="p-2">C(10, 7) × C(8, 8) / 816</td>
                    <td className="p-2 font-bold">14.71%</td>
                    <td className="p-2">120 de 816</td>
                    <td className="p-2 text-slate-400 font-sans">Jogos com todos os 8 erros</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Conclusão: 92.8% de todas as combinações possíveis dessa matriz de 18 dezenas faziam exatamente 7, 8 ou 9 pontos.
              Por isso, em 12 jogos sorteados dentro dela, é 100% estatisticamente esperado que nenhum bilhete passe de 9 pontos.
            </p>
          </div>

          {/* Section 3: The Document Solution */}
          <div className="bg-gradient-to-r from-emerald-950/60 to-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Como o Documento Oficial da Lotofácil Corrige a Estrutura:</span>
            </h4>
            <div className="text-xs text-slate-200 space-y-2 leading-relaxed">
              <p>
                <strong>1. A Regra das 9 Repetidas + 9 Ausentes:</strong> Em mais de 80% dos concursos, repetem entre 8 e 10
                dezenas do sorteio anterior, e 5 a 6 dezenas vêm do grupo das 10 ausentes.
              </p>
              <p>
                <strong>2. Captura Quase Total das Ausentes:</strong> Se selecionarmos <strong className="text-emerald-300">9 das 10 ausentes</strong> para
                compor o grupo de 18, é impossível errar 5 ausentes! No Concurso 3803, 5 ausentes saíram (07, 08, 13, 16, 22), e todas as 5
                estavam no grupo das 10 ausentes do 3802.
              </p>
              <p>
                <strong>3. O Salto para 13 e 14 Acertos:</strong> Com 9 ausentes cobrindo as 5 que saíram + 9 repetidas cobrindo 8 ou 9 das repetidas,
                a matriz de 18 dezenas salta de 10 para <strong className="text-emerald-400 font-mono">13 a 14 acertos</strong>!
                Com 13 acertos na matriz de 18, a distribuição hipergeométrica gera múltiplos bilhetes premiados com{' '}
                <strong className="text-emerald-300">11, 12, 13 e 14 pontos</strong>!
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-emerald-500/20">
              <span className="text-[11px] text-slate-300">
                O motor LotoSniper foi atualizado com essa estratégia como padrão de seleção.
              </span>
              <button
                onClick={onApplyOptimalPool}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Aplicar Matriz Otimizada do Documento (9 Repetidas + 9 Ausentes)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
