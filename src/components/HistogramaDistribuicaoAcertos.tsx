import React from 'react';
import { HistogramaAcertos } from '../services/tabelasCoberturaLJCR';
import { BarChart3, FileText, Award, Percent } from 'lucide-react';

interface HistogramaDistribuicaoAcertosProps {
  histograma: HistogramaAcertos;
  totalCenarios: number;
  garantiaAlvo?: string;
  onExportPdf?: () => void;
  className?: string;
}

export const HistogramaDistribuicaoAcertos: React.FC<HistogramaDistribuicaoAcertosProps> = ({
  histograma,
  totalCenarios,
  garantiaAlvo,
  onExportPdf,
  className = '',
}) => {
  const getPercent = (count: number) => {
    if (totalCenarios <= 0) return 0;
    return (count / totalCenarios) * 100;
  };

  const rows: {
    pontos: string;
    faixa: number;
    count: number;
    percent: number;
    color: string;
    barColor: string;
    badgeColor: string;
    descricao: string;
  }[] = [
    {
      pontos: '15 Pontos',
      faixa: 15,
      count: histograma[15],
      percent: getPercent(histograma[15]),
      color: 'text-amber-400',
      barColor: 'bg-amber-400',
      badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      descricao: 'Jackpot Máximo',
    },
    {
      pontos: '14 Pontos',
      faixa: 14,
      count: histograma[14],
      percent: getPercent(histograma[14]),
      color: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      descricao: 'Garantia Principal',
    },
    {
      pontos: '13 Pontos',
      faixa: 13,
      count: histograma[13],
      percent: getPercent(histograma[13]),
      color: 'text-sky-400',
      barColor: 'bg-sky-500',
      badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
      descricao: 'Faixa Fixa R$ 35,00',
    },
    {
      pontos: '12 Pontos',
      faixa: 12,
      count: histograma[12],
      percent: getPercent(histograma[12]),
      color: 'text-indigo-400',
      barColor: 'bg-indigo-500',
      badgeColor: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      descricao: 'Faixa Fixa R$ 14,00',
    },
    {
      pontos: '11 Pontos',
      faixa: 11,
      count: histograma[11],
      percent: getPercent(histograma[11]),
      color: 'text-slate-300',
      barColor: 'bg-slate-400',
      badgeColor: 'bg-slate-700/50 text-slate-300 border-slate-600',
      descricao: 'Faixa Fixa R$ 7,00',
    },
    {
      pontos: 'Abaixo de 11',
      faixa: 0,
      count: histograma.abaixo11,
      percent: getPercent(histograma.abaixo11),
      color: 'text-slate-500',
      barColor: 'bg-slate-700',
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
      descricao: 'Sem premiação',
    },
  ];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Distribuição Teórica de Acertos Máximos
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dispersão condicional calculada sobre todos os{' '}
            <strong className="text-white font-mono">{totalCenarios.toLocaleString('pt-BR')}</strong> cenários{' '}
            <span className="font-mono text-sky-400">C(V, 15)</span>.
          </p>
        </div>

        {onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Exportar Relatório PDF</span>
          </button>
        )}
      </div>

      {/* Grid de Barras de Distribuição */}
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.pontos} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-bold font-mono ${row.color}`}>{row.pontos}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${row.badgeColor}`}>
                  {row.descricao}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-400 text-[11px]">
                  {row.count.toLocaleString('pt-BR')} cenários
                </span>
                <span className={`font-black ${row.color} w-16 text-right`}>
                  {row.percent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${row.barColor}`}
                style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
