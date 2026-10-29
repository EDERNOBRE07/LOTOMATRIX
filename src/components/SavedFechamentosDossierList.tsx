import React, { useState, useEffect } from 'react';
import {
  SavedFechamentoPrognostico,
  getSavedFechamentos,
  deleteSavedFechamento,
  clearAllSavedFechamentos,
  formatTicketsForConferenciaInput,
  FIBONACCI_NUMBERS,
} from '../services/savedFechamentosStorage';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { soundService } from '../services/soundAlert';
import { MOLDURA, PRIMOS } from '../data/lotofacilData';
import { ExportPDFModal } from './ExportPDFModal';
import {
  FileText,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Download,
  Flame,
  Zap,
  ShieldCheck,
  Target,
  ArrowRight,
  Info,
  Printer,
} from 'lucide-react';

interface SavedFechamentosDossierListProps {
  latestDraw: LotofacilDraw;
  onGoToConferencia?: () => void;
  onSelectTicketsToInspect?: (tickets: GameTicket[]) => void;
}

export const SavedFechamentosDossierList: React.FC<SavedFechamentosDossierListProps> = ({
  latestDraw,
  onGoToConferencia,
  onSelectTicketsToInspect,
}) => {
  const [fechamentos, setFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );
  const [expandedCardId, setExpandedCardId] = useState<string | null>(() => {
    const list = getSavedFechamentos();
    return list.length > 0 ? list[0].id : null;
  });
  const [expandedTicketsCardId, setExpandedTicketsCardId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [selectedForPDF, setSelectedForPDF] = useState<SavedFechamentoPrognostico | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      const list = getSavedFechamentos();
      setFechamentos(list);
      if (list.length > 0 && !expandedCardId) {
        setExpandedCardId(list[0].id);
      }
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
  }, [expandedCardId]);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente excluir o fechamento salvo "${name}"?`)) {
      deleteSavedFechamento(id);
      showFeedback(`Fechamento "${name}" excluído com sucesso.`);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Atenção: Deseja apagar todos os fechamentos salvos nesta seção?')) {
      clearAllSavedFechamentos();
      showFeedback('Todos os fechamentos salvos foram removidos.');
    }
  };

  const handleLoadInConferencia = (fechamento: SavedFechamentoPrognostico) => {
    const formattedText = formatTicketsForConferenciaInput(fechamento.tickets);
    if (!formattedText) {
      showFeedback('Este fechamento não possui bilhetes válidos para carregar.');
      return;
    }

    // Disparar evento para ModuloConferenciaJogos preencher a Entrada de Jogos
    window.dispatchEvent(
      new CustomEvent('lotosniper-load-conference-games', {
        detail: {
          text: formattedText,
          tickets: fechamento.tickets,
          name: fechamento.tipoFechamento,
          concurso: fechamento.concurso,
        },
      })
    );

    // Mudar para a aba de conferência
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'conferencia' }));
    soundService.playGoldenZoneSuccessChime();

    if (onGoToConferencia) {
      onGoToConferencia();
    }
  };

  const handleDownloadTXT = (f: SavedFechamentoPrognostico) => {
    const headerLines = [
      '================================================================================',
      'LOTOSNIPER - DOSSIÊ TÉCNICO DE FECHAMENTO & PROGNÓSTICO',
      '================================================================================',
      `• Tipo de Fechamento: ${f.tipoFechamento}`,
      `• Modalidade / Matriz: ${f.modalidadeMatriz}`,
      `• Universo de Dezenas (${f.universoDezenas.length} números): ${f.universoDezenas.map((n) => n.toString().padStart(2, '0')).join(' ')}`,
      `• Dezenas Fixas: ${f.dezenasFixas.length > 0 ? f.dezenasFixas.map((n) => n.toString().padStart(2, '0')).join(' ') : 'Nenhuma dezena fixa'}`,
      `• Dezenas Excluídas: ${f.dezenasExcluidas.length > 0 ? f.dezenasExcluidas.map((n) => n.toString().padStart(2, '0')).join(' ') : 'Nenhuma dezena excluída'}`,
      '',
      '--------------------------------------------------------------------------------',
      '2. FILTROS OBRIGATÓRIOS (RESTRIÇÕES CANÔNICAS)',
      '--------------------------------------------------------------------------------',
      `• Faixa de Soma das 15 Dezenas: ${f.faixaSoma.min} a ${f.faixaSoma.max} (Zona de Ouro Canônica: ${f.faixaSoma.zonaOuro || '190 a 210'})`,
      `• Paridade Estrutural (Pares/Ímpares): ${f.paridade.minPares} a ${f.paridade.maxPares} Pares / ${15 - f.paridade.maxPares} a ${15 - f.paridade.minPares} Ímpares (Canônico: ${f.paridade.canonico || '7P/8I ou 8P/7I'})`,
      `• Sequência Máxima Consecutiva: Até ${f.maxConsecutivas} dezenas consecutivas`,
      `• Auditoria de Anomalias: ${f.auditoriaAnomalias}`,
      '',
      '--------------------------------------------------------------------------------',
      '3. FILTROS AVANÇADOS (PROBABILIDADE CONDICIONAL)',
      '--------------------------------------------------------------------------------',
      `• Repetidas do Concurso Anterior (#${f.repetidas.concursoRef || f.concurso}): ${f.repetidas.min} a ${f.repetidas.max} dezenas repetidas`,
      `• Dezenas na Moldura (16 externas): ${f.moldura.min} a ${f.moldura.max} dezenas [Moldura Oficial: 01, 02, 03, 04, 05, 06, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]`,
      `• Números Primos: ${f.primos.min} a ${f.primos.max} dezenas [Primos: 02, 03, 05, 07, 11, 13, 17, 19, 23]`,
      `• Sequência Fibonacci: ${f.fibonacci.min} a ${f.fibonacci.max} dezenas [Fibonacci: 01, 02, 03, 05, 08, 13, 21]`,
      '',
      '================================================================================',
      `BILHETES GERADOS (${f.tickets.length} JOGOS)`,
      '================================================================================',
      formatTicketsForConferenciaInput(f.tickets),
    ].join('\n');

    const blob = new Blob([headerLines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_fechamento_salvo_${f.concurso}_${f.totalJogos}_jogos.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFeedback('Arquivo TXT com Dossiê Técnico baixado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-200 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Header da Seção de Jogos Salvos */}
      <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">Jogos Salvos & Dossiê de Fechamentos</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  {fechamentos.length} Fechamento(s) Armazenado(s)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Cada prognóstico gerado em <strong>"Fechamentos & 14 Pontos"</strong> é catalogado com o tipo de fechamento, universo de dezenas e os filtros canônicos e avançados utilizados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fechamentos.length > 1 && (
              <button
                onClick={handleClearAll}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                title="Limpar todos os fechamentos salvos"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico</span>
              </button>
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Novo Fechamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Fechamentos Salvos */}
      {fechamentos.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">Nenhum Fechamento Salvo no Momento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Gere uma matriz na aba <strong>"Fechamentos & 14 Pontos"</strong> ou use o <strong>"Gerador Turbo"</strong> para salvar automaticamente seus prognósticos com dossiê técnico completo aqui.
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'fechamento' }))}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition"
          >
            <span>Ir para Fechamentos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {fechamentos.map((f, idx) => {
            const isExpanded = expandedCardId === f.id;
            const isTicketsExpanded = expandedTicketsCardId === f.id;

            return (
              <div
                key={f.id}
                className={`bg-slate-900/90 rounded-2xl border-2 transition-all shadow-xl ${
                  isExpanded
                    ? 'border-amber-500/60 shadow-amber-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-black text-sm shrink-0">
                      #{(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-white">{f.tipoFechamento}</h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          {f.modalidadeMatriz}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {f.totalJogos} Jogos (R$ {f.custoTotal.toFixed(2)})
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {f.dataCriacao}
                        </span>
                        <span>•</span>
                        <span>Concurso Base Caixa #{f.concurso}</span>
                        <span>•</span>
                        <span className="text-amber-400 font-bold">Universo: {f.universoDezenas.length} Dezenas</span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação Principais para Este Fechamento */}
                  <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                    {/* Botão Gerar PDF Oficial Gold */}
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playGoldenZoneSuccessChime();
                        setSelectedForPDF(f);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-500/25 flex items-center gap-1.5 active:scale-95"
                      title="Gerar PDF Oficial Gold formatado para impressão ou visualização externa"
                    >
                      <Printer className="w-4 h-4 text-slate-950" />
                      <span>Gerar PDF Gold</span>
                    </button>

                    {/* Botão Carregar Fechamento em Entrada de Jogos para Conferência */}
                    <button
                      type="button"
                      onClick={() => handleLoadInConferencia(f)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs transition cursor-pointer shadow-md shadow-sky-500/20 flex items-center gap-2 active:scale-95"
                      title="Carregar todos os bilhetes deste fechamento na Entrada de Jogos para Conferência"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Carregar na Conferência</span>
                    </button>

                    {/* Botão Exportar TXT */}
                    <button
                      type="button"
                      onClick={() => handleDownloadTXT(f)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                      title="Baixar arquivo TXT com Dossiê Técnico"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Botão Excluir Fechamento Salvo */}
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id, f.tipoFechamento)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition cursor-pointer"
                      title="Excluir este fechamento salvo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Botão Expandir / Recolher Dossiê */}
                    <button
                      type="button"
                      onClick={() => setExpandedCardId(isExpanded ? null : f.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
                      title={isExpanded ? 'Recolher detalhes' : 'Expandir dossiê'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Conteúdo do Dossiê Formatado Conforme Especificação */}
                {isExpanded && (
                  <div className="p-4 sm:p-6 space-y-6 bg-slate-950/60 font-mono text-xs">
                    {/* SEÇÃO 1: DADOS DO FECHAMENTO & ESTRATÉGIA */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider pb-1 border-b border-amber-500/30">
                        <Target className="w-4 h-4" />
                        <span>DADOS DO FECHAMENTO & ESTRATÉGIA</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 pt-1 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Tipo de Fechamento:</strong> {f.tipoFechamento}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Modalidade / Matriz:</strong> {f.modalidadeMatriz}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <div>
                            <strong className="text-white">Universo de Dezenas ({f.universoDezenas.length} números):</strong>{' '}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {f.universoDezenas.map((n) => (
                                <span
                                  key={n}
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-[11px] ${
                                    f.dezenasFixas.includes(n)
                                      ? 'bg-amber-400 text-slate-950 ring-1 ring-amber-300'
                                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                                  }`}
                                >
                                  {n.toString().padStart(2, '0')}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Dezenas Fixas:</strong>{' '}
                            {f.dezenasFixas.length > 0
                              ? f.dezenasFixas.map((d) => d.toString().padStart(2, '0')).join(' ')
                              : 'Nenhuma dezena fixa'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Dezenas Excluídas:</strong>{' '}
                            {f.dezenasExcluidas.length > 0
                              ? f.dezenasExcluidas.map((d) => d.toString().padStart(2, '0')).join(' ')
                              : 'Nenhuma dezena excluída'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 2: FILTROS OBRIGATÓRIOS (RESTRIÇÕES CANÔNICAS) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-wider pb-1 border-b border-cyan-500/30">
                        <ShieldCheck className="w-4 h-4" />
                        <span>2. FILTROS OBRIGATÓRIOS (RESTRIÇÕES CANÔNICAS)</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 pt-1 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Faixa de Soma das 15 Dezenas:</strong> {f.faixaSoma.min} a {f.faixaSoma.max} (Zona de Ouro Canônica: {f.faixaSoma.zonaOuro || '190 a 210'})
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Paridade Estrutural (Pares/Ímpares):</strong> {f.paridade.minPares} a {f.paridade.maxPares} Pares / {15 - f.paridade.maxPares} a {15 - f.paridade.minPares} Ímpares (Canônico: {f.paridade.canonico || '7P/8I ou 8P/7I'})
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Sequência Máxima Consecutiva:</strong> Até {f.maxConsecutivas} dezenas consecutivas
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Auditoria de Anomalias:</strong> {f.auditoriaAnomalias}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SEÇÃO 3: FILTROS AVANÇADOS (PROBABILIDADE CONDICIONAL) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider pb-1 border-b border-emerald-500/30">
                        <Sparkles className="w-4 h-4" />
                        <span>3. FILTROS AVANÇADOS (PROBABILIDADE CONDICIONAL)</span>
                      </div>
                      <div className="space-y-1.5 text-slate-300 pt-1 leading-relaxed">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Repetidas do Concurso Anterior (#{f.repetidas.concursoRef || f.concurso}):</strong> {f.repetidas.min} a {f.repetidas.max} dezenas repetidas
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Dezenas na Moldura (16 externas):</strong> {f.moldura.min} a {f.moldura.max} dezenas [Moldura Oficial: 01, 02, 03, 04, 05, 06, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Números Primos:</strong> {f.primos.min} a {f.primos.max} dezenas [Primos: 02, 03, 05, 07, 11, 13, 17, 19, 23]
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500">•</span>
                          <span>
                            <strong className="text-white">Sequência Fibonacci:</strong> {f.fibonacci.min} a {f.fibonacci.max} dezenas [Fibonacci: 01, 02, 03, 05, 08, 13, 21]
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botão para Inspecionar / Ocultar Bilhetes Gerados */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedTicketsCardId(isTicketsExpanded ? null : f.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isTicketsExpanded ? 'Ocultar Bilhetes' : `Inspecionar ${f.tickets.length} Bilhetes Gerados`}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLoadInConferencia(f)}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Carregar em Entrada de Jogos para Conferência</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Grid dos Bilhetes se expandido */}
                    {isTicketsExpanded && (
                      <div className="pt-3 border-t border-slate-800/80 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {f.tickets.map((t, tIdx) => (
                            <div
                              key={t.id || tIdx}
                              className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">
                                  #{(tIdx + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {t.dezenas.map((num) => (
                                    <span
                                      key={num}
                                      className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold bg-slate-800 text-slate-200"
                                    >
                                      {num.toString().padStart(2, '0')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                                S:{t.soma} | P:{t.pares}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Exportação e Impressão PDF Oficial Gold */}
      {selectedForPDF && (
        <ExportPDFModal
          isOpen={Boolean(selectedForPDF)}
          onClose={() => setSelectedForPDF(null)}
          tickets={selectedForPDF.tickets}
          savedFechamento={selectedForPDF}
          latestDraw={{
            ...latestDraw,
            concurso: selectedForPDF.concurso,
            data: selectedForPDF.dataConcurso || latestDraw.data,
          }}
          fechamentoMeta={{
            strategyName: selectedForPDF.tipoFechamento,
            modeName: selectedForPDF.modalidadeMatriz,
            concurso: selectedForPDF.concurso,
            dataConcurso: selectedForPDF.dataConcurso,
            selectedNumbers: selectedForPDF.universoDezenas,
            fixedNumbers: selectedForPDF.dezenasFixas,
            excludedNumbers: selectedForPDF.dezenasExcluidas,
            garantia: selectedForPDF.modalidadeMatriz,
          }}
        />
      )}
    </div>
  );
};
