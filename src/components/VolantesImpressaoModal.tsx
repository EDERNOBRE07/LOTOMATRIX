import React, { useState } from 'react';
import { GameTicket } from '../types/lotofacil';
import { exportarParaCologaLGodoi } from '../services/exportadorCologaLGodoi';
import {
  Printer,
  X,
  FileText,
  Download,
  Check,
  Sparkles,
  Scissors,
  CheckCircle2,
  Layers,
  Settings,
} from 'lucide-react';

interface VolantesImpressaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: GameTicket[];
  fechamentoNome?: string;
}

export const VolantesImpressaoModal: React.FC<VolantesImpressaoModalProps> = ({
  isOpen,
  onClose,
  tickets,
  fechamentoNome = 'Fechamento LotoSniper',
}) => {
  const [printLayout, setPrintLayout] = useState<'a4' | 'cedula_oficial'>('a4');
  const [teimosinha, setTeimosinha] = useState<number | null>(null);
  const [cotasBolao, setCotasBolao] = useState<number | null>(null);
  const [copiedTxt, setCopiedTxt] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCologa = () => {
    exportarParaCologaLGodoi(tickets, fechamentoNome.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  // Divide os bilhetes em grupos de 3 por folha A4
  const JOGOS_POR_FOLHA = 3;
  const paginasA4: GameTicket[][] = [];
  for (let i = 0; i < tickets.length; i += JOGOS_POR_FOLHA) {
    paginasA4.push(tickets.slice(i, i + JOGOS_POR_FOLHA));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      {/* Container Principal do Modal (Ocultado durante window.print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Impressão de Volantes & Cédulas Caixa</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                  {tickets.length} {tickets.length === 1 ? 'Jogo' : 'Jogos'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Imprima em folhas A4 recortáveis (3 jogos por folha) ou diretamente nos volantes oficiais da Caixa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Controles e Configurações */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Seletor de Formato */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Layout:</span>
            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintLayout('a4')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  printLayout === 'a4'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Folha A4 (3 Volantes)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('cedula_oficial')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  printLayout === 'cedula_oficial'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Cédula Oficial (81×170mm)</span>
              </button>
            </div>
          </div>

          {/* Opções para Cédula Oficial (Teimosinha e Cotas) */}
          {printLayout === 'cedula_oficial' && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Teimosinha:</span>
                <select
                  value={teimosinha ?? ''}
                  onChange={(e) => setTeimosinha(e.target.value ? Number(e.target.value) : null)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs"
                >
                  <option value="">Não marcar</option>
                  <option value="3">3 concursos</option>
                  <option value="6">6 concursos</option>
                  <option value="12">12 concursos</option>
                  <option value="18">18 concursos</option>
                  <option value="24">24 concursos</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Cotas:</span>
                <select
                  value={cotasBolao ?? ''}
                  onChange={(e) => setCotasBolao(e.target.value ? Number(e.target.value) : null)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 rounded px-2 py-1 text-xs"
                >
                  <option value="">Aposta Individual</option>
                  <option value="2">2 cotas</option>
                  <option value="5">5 cotas</option>
                  <option value="10">10 cotas</option>
                  <option value="20">20 cotas</option>
                </select>
              </div>
            </div>
          )}

          {/* Ações Rápidas */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCologa}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Exporta arquivo .txt no formato posicional do Cologa e L-Godoi"
            >
              {copiedTxt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Baixado!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exportar Cologa / L-Godoi (.txt)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>

        {/* Pré-visualização na Tela */}
        <div className="p-6 overflow-y-auto bg-slate-950 flex flex-col items-center gap-6">
          <div className="text-center max-w-lg mb-1">
            <p className="text-xs text-slate-400">
              {printLayout === 'a4'
                ? `Exibindo ${paginasA4.length} folha(s) A4 contendo 3 volantes cada com marcação óptica preta de alta precisão e linhas de corte.`
                : `Exibindo ${tickets.length} cédula(s) com coordenadas alinhadas ao volante oficial da Caixa Econômica Federal (81×170mm).`}
            </p>
          </div>

          {/* Renderização Prévia dos Volantes A4 */}
          {printLayout === 'a4' && (
            <div className="space-y-6 w-full flex flex-col items-center">
              {paginasA4.map((folha, folhaIdx) => (
                <div
                  key={folhaIdx}
                  className="bg-white text-slate-900 rounded shadow-2xl p-4 w-full max-w-[760px] flex flex-col sm:flex-row justify-between gap-3 border border-slate-300"
                >
                  {folha.map((ticket) => {
                    const dezenasSet = new Set(ticket.dezenas);
                    return (
                      <div
                        key={ticket.id}
                        className="flex-1 border border-dashed border-slate-400 p-3 rounded flex flex-col items-center bg-white relative"
                      >
                        <div className="text-[9px] text-slate-400 font-mono mb-2 flex items-center gap-1">
                          <Scissors className="w-3 h-3 text-slate-400" />
                          <span>✄ - - CORTE AQUI - - ✄</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-3">
                          LotoSniper • Jogo #{ticket.index.toString().padStart(2, '0')}
                        </div>

                        {/* Grid 5x5 */}
                        <div className="grid grid-cols-5 gap-1.5">
                          {Array.from({ length: 25 }, (_, idx) => idx + 1).map((d) => {
                            const marcada = dezenasSet.has(d);
                            return (
                              <div
                                key={d}
                                className={`w-7 h-6 sm:w-8 sm:h-7 flex items-center justify-center font-mono text-[10px] font-bold rounded border ${
                                  marcada
                                    ? 'bg-black text-black border-black'
                                    : 'bg-white text-slate-600 border-slate-300'
                                }`}
                              >
                                {d.toString().padStart(2, '0')}
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-[9px] text-slate-400 font-mono mt-3">
                          ✄ - - - - - - - - - - - ✄
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Renderização Prévia Cédula Oficial */}
          {printLayout === 'cedula_oficial' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full justify-items-center">
              {tickets.map((ticket) => {
                const dezenasSet = new Set(ticket.dezenas);
                return (
                  <div
                    key={ticket.id}
                    className="w-[240px] bg-white text-slate-900 border border-slate-300 rounded p-4 shadow-xl flex flex-col items-center"
                  >
                    <div className="text-[10px] font-bold text-slate-600 mb-1">
                      Cédula Caixa • Jogo #{ticket.index.toString().padStart(2, '0')}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mb-3">
                      Alinhamento óptico (81×170mm)
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 my-2">
                      {Array.from({ length: 25 }, (_, idx) => idx + 1).map((d) => {
                        const marcada = dezenasSet.has(d);
                        return (
                          <div
                            key={d}
                            className={`w-7 h-5 flex items-center justify-center text-[9px] font-mono font-bold border rounded ${
                              marcada
                                ? 'bg-black text-white border-black'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            {marcada ? '■' : d.toString().padStart(2, '0')}
                          </div>
                        );
                      })}
                    </div>

                    {teimosinha && (
                      <div className="text-[9px] text-sky-700 font-bold mt-2">
                        Teimosinha: {teimosinha} concursos
                      </div>
                    )}
                    {cotasBolao && (
                      <div className="text-[9px] text-indigo-700 font-bold">
                        Bolão: {cotasBolao} cotas
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO PURA (Visível exclusivamente durante o comando window.print()) */}
      <div id="areaImpressaoVolantes" className="hidden print:block print:w-full print:m-0 print:p-0">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: ${printLayout === 'a4' ? 'A4 portrait' : '81mm 170mm'};
              margin: 0;
            }
            body {
              background: transparent !important;
              color: black !important;
            }
            .pagina-a4-print {
              width: 210mm;
              height: 297mm;
              padding: 10mm 15mm;
              display: flex;
              justify-content: space-between;
              page-break-after: always;
              box-sizing: border-box;
            }
            .volante-container-print {
              width: 56mm;
              height: 270mm;
              border: 0.2mm dashed #94a3b8;
              padding: 25mm 2mm 5mm 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              box-sizing: border-box;
            }
            .grid-lotofacil-print {
              display: grid;
              grid-template-columns: repeat(5, 9mm);
              grid-template-rows: repeat(5, 7.5mm);
              column-gap: 1.5mm;
              row-gap: 1.8mm;
              justify-content: center;
            }
            .celula-dezena-print {
              width: 9mm;
              height: 7.5mm;
              border: 0.15mm solid #cbd5e1;
              border-radius: 1mm;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 7.5pt;
              font-weight: bold;
              color: #64748b;
            }
            .celula-dezena-print.marcada {
              background-color: #000 !important;
              color: #000 !important;
              border: 0.2mm solid #000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .cedula-avulsa-print {
              width: 81mm;
              height: 170mm;
              position: relative;
              page-break-after: always;
            }
            .grid-jogo-oficial-print {
              position: absolute;
              top: 33.5mm;
              left: 10.5mm;
              width: 45mm;
              height: 36mm;
              display: grid;
              grid-template-columns: repeat(5, 9.0mm);
              grid-template-rows: repeat(5, 7.2mm);
            }
            .slot-dezena-print {
              width: 9.0mm;
              height: 7.2mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .slot-dezena-print.ativa::after {
              content: "";
              width: 4.2mm;
              height: 2.0mm;
              background-color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        ` }} />

        {printLayout === 'a4' ? (
          paginasA4.map((folha, fIdx) => (
            <div key={fIdx} className="pagina-a4-print">
              {folha.map((t) => {
                const tSet = new Set(t.dezenas);
                return (
                  <div key={t.id} className="volante-container-print">
                    <div style={{ fontSize: '7pt', color: '#94a3b8', marginBottom: '4mm' }}>
                      ✄ - - - CORTE AQUI - - - ✄
                    </div>
                    <div style={{ fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '6mm', color: '#334155' }}>
                      LotoSniper • Jogo #{t.index}
                    </div>
                    <div className="grid-lotofacil-print">
                      {Array.from({ length: 25 }, (_, i) => i + 1).map((d) => (
                        <div
                          key={d}
                          className={`celula-dezena-print ${tSet.has(d) ? 'marcada' : ''}`}
                        >
                          {String(d).padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '7pt', color: '#94a3b8', marginTop: 'auto', marginBottom: '2mm' }}>
                      ✄ - - - - - - - - - - - - ✄
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          tickets.map((t) => {
            const tSet = new Set(t.dezenas);
            return (
              <div key={t.id} className="cedula-avulsa-print">
                <div className="grid-jogo-oficial-print">
                  {Array.from({ length: 25 }, (_, i) => i + 1).map((d) => (
                    <div
                      key={d}
                      className={`slot-dezena-print ${tSet.has(d) ? 'ativa' : ''}`}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
