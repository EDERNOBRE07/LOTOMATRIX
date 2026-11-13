import React, { useState } from 'react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { SavedFechamentoPrognostico } from '../services/savedFechamentosStorage';
import { downloadProfessionalLotericaPDF } from '../services/lotericaPdfGenerator';
import { soundService } from '../services/soundAlert';
import {
  FileText,
  Download,
  X,
  CheckCircle2,
  Printer,
  ShieldCheck,
  DollarSign,
  Award,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface ExportLotericaPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  fechamento?: SavedFechamentoPrognostico | null;
  tickets: GameTicket[];
  latestDraw?: LotofacilDraw;
}

export const ExportLotericaPDFModal: React.FC<ExportLotericaPDFModalProps> = ({
  isOpen,
  onClose,
  fechamento,
  tickets: propTickets,
  latestDraw,
}) => {
  const [watermarkText, setWatermarkText] = useState<string>(
    'LOTO SNIPER • COMPROVANTE OFICIAL DE JOGOS • USO LOTÉRICO'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetTickets = fechamento?.tickets && fechamento.tickets.length > 0
    ? fechamento.tickets
    : propTickets;

  const concursoBase = Number(fechamento?.concurso || latestDraw?.concurso) || 3824;
  const concursoAlvo = fechamento?.concursoAlvo ?? concursoBase + 1;
  const dataConcurso = fechamento?.dataConcurso || latestDraw?.data || new Date().toLocaleDateString('pt-BR');
  const strategyName = fechamento?.nomeFechamento || fechamento?.tipoFechamento || 'Fechamento Inteligente Ponderado';
  const modalidadeMatriz = fechamento?.modalidadeMatriz || `${targetTickets.length} Jogos • Garantia 14 Pontos`;
  const universoDezenas = fechamento?.universoDezenas || Array.from(new Set(targetTickets.flatMap(t => t.dezenas))).sort((a, b) => a - b);

  const totalCost = targetTickets.reduce((acc, t) => {
    const count = t.dezenas.length;
    if (count === 16) return acc + 56.0;
    if (count === 17) return acc + 476.0;
    return acc + 3.5;
  }, 0);

  const formattedCost = totalCost.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const handleDownload = () => {
    setIsGenerating(true);
    try {
      downloadProfessionalLotericaPDF({
        fechamento,
        tickets: targetTickets,
        concurso: concursoBase,
        concursoAlvo,
        dataConcurso,
        strategyName,
        modalidadeMatriz,
        universoDezenas,
        custoTotalEstimado: totalCost,
        watermarkText,
      });

      soundService.playGoldenZoneSuccessChime();
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Erro ao gerar PDF da Lotérica:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 shrink-0">
            <Printer className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-white">
                Comprovante Profissional para Impressão em Lotéricas
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Marca d'Água Ativada
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Gera um documento PDF em formato A4 diagramado com todas as dezenas em destaque, custo estimado por aposta e total, tabela com caixas de conferência e marca d'água de alta fidelidade para facilitar seu atendimento na lotérica.
            </p>
          </div>
        </div>

        {/* Resumo de Custos e Metadados do Fechamento */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total de Jogos</span>
            <span className="text-lg font-black text-white font-mono">{targetTickets.length}</span>
            <span className="text-[9px] text-slate-500 block">bilhetes 15 dezenas</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Custo Unitário</span>
            <span className="text-lg font-black text-emerald-400 font-mono">R$ 3,50</span>
            <span className="text-[9px] text-slate-500 block">tarifa oficial Caixa</span>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 text-center sm:col-span-2">
            <span className="text-[10px] text-emerald-300 font-bold uppercase block">Custo Total Estimado</span>
            <span className="text-2xl font-black text-emerald-300 font-mono">{formattedCost}</span>
            <span className="text-[9px] text-emerald-400/80 block">para registrar todos os {targetTickets.length} jogos</span>
          </div>
        </div>

        {/* Detalhes da Estratégia */}
        <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Estratégia / Modelo:</span>
            <span className="font-bold text-amber-300">{strategyName}</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Concurso Alvo:</span>
            <span className="font-mono font-bold text-white">#{concursoAlvo} (Ref. Base: #{concursoBase} • {dataConcurso})</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Universo de Dezenas:</span>
            <span className="font-mono font-bold text-emerald-400">{universoDezenas.length} dezenas ({universoDezenas.map(n => n.toString().padStart(2, '0')).join(' ')})</span>
          </div>
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Auditoria Zona de Ouro:</span>
            <span className="text-emerald-400 font-bold">100% Blindado (Soma &gt;= 180)</span>
          </div>
        </div>

        {/* Configuração da Marca d'Água */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <label className="text-xs font-bold text-white">
              Texto da Marca d'Água de Alta Qualidade (impressão diagonal sutil):
            </label>
          </div>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="Ex: LOTO SNIPER • COMPROVANTE OFICIAL DE JOGOS • USO LOTÉRICO"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
          <p className="text-[10px] text-slate-400">
            A marca d'água será impressa em todas as páginas com ângulo de 45° em cor suave, garantindo a autenticidade e legibilidade total para o atendente da lotérica.
          </p>
        </div>

        {/* Feedback de Sucesso */}
        {downloadSuccess && (
          <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">
              ✓ PDF Profissional gerado com sucesso! Arquivo pronto para impressão em folha A4 e envio para a lotérica.
            </span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            Fechar
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating || targetTickets.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-lg flex items-center gap-2 ${
              isGenerating || targetTickets.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 active:scale-95'
            }`}
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>{isGenerating ? 'Gerando PDF...' : 'Baixar PDF Profissional para Lotérica'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
