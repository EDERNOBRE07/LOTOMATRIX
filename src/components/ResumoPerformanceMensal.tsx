import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Check, TrendingUp, TrendingDown, Calendar, FileText } from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { formatCurrencyBRL, getTicketCostBRL } from '../services/ticketRoiAudit';

interface ResumoPerformanceMensalProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
}

interface MonthlyComparisonRow {
  concurso: number;
  data: string;
  jogosCount: number;
  custoRodada: number;
  custoAcumulado: number;
  retornoRodada: number;
  retornoAcumulado: number;
  lucroAcumulado: number;
  roiAcumuladoPercent: number;
  melhorAcerto: number;
  premiadosRodada: number;
}

function parseBrDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = String(dateStr).trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map((p) => parseInt(p, 10));
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
}

export const ResumoPerformanceMensal: React.FC<ResumoPerformanceMensalProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState<boolean>(false);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  useEffect(() => {
    const refresh = () => setRefreshNonce((n) => n + 1);
    window.addEventListener('lotosniper-saved-fechamentos-updated', refresh);
    window.addEventListener('lotosniper-saved-tickets-updated', refresh);
    window.addEventListener('lotosniper-backup-restored', refresh);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', refresh);
      window.removeEventListener('lotosniper-saved-tickets-updated', refresh);
      window.removeEventListener('lotosniper-backup-restored', refresh);
    };
  }, []);

  // Reúne todos os bilhetes salvos + fechamentos (desduplicados por assinatura)
  const consolidatedTickets = useMemo<GameTicket[]>(() => {
    void refreshNonce;
    const map = new Map<string, GameTicket>();
    const fechamentos = getSavedFechamentos();

    fechamentos.forEach((f) => {
      (f.tickets || []).forEach((t) => {
        if (!Array.isArray(t.dezenas) || t.dezenas.length < 15) return;
        const sig = [...t.dezenas].sort((a, b) => a - b).join('-');
        if (!map.has(sig)) map.set(sig, t);
      });
    });

    (savedTickets || []).forEach((t) => {
      if (!Array.isArray(t.dezenas) || t.dezenas.length < 15) return;
      const sig = [...t.dezenas].sort((a, b) => a - b).join('-');
      if (!map.has(sig)) map.set(sig, t);
    });

    return Array.from(map.values());
  }, [savedTickets, refreshNonce]);

  // Filtra os concursos dos últimos 30 dias (em ordem cronológica para cálculo acumulado)
  const monthlyRows = useMemo<MonthlyComparisonRow[]>(() => {
    const all100 = getHistorical100Draws(latestDraw);
    const anchorDate = parseBrDate(latestDraw.data) || new Date();
    const cutoff = new Date(anchorDate);
    cutoff.setDate(cutoff.getDate() - 30);

    let draws30Days = all100.filter((d) => {
      const dt = parseBrDate(d.data);
      return dt ? dt >= cutoff && dt <= anchorDate : false;
    });

    if (draws30Days.length < 8) {
      draws30Days = all100.slice(0, 25);
    }

    const chronological = [...draws30Days].reverse();
    let runningCost = 0;
    let runningReturn = 0;

    const custoBaseBatch = consolidatedTickets.reduce(
      (acc, t) => acc + getTicketCostBRL(t, VALOR_APOSTA_LOTOFACIL),
      0
    );

    return chronological.map((draw) => {
      let retornoRodada = 0;
      let melhorAcerto = 0;
      let premiadosRodada = 0;

      for (const ticket of consolidatedTickets) {
        const hits = countMatches(ticket.dezenas, draw.dezenas);
        if (hits > melhorAcerto) melhorAcerto = hits;
        if (hits >= 11) {
          premiadosRodada++;
          if (hits === 15) retornoRodada += draw.premiacoes?.faixa15?.valor || 1800000;
          else if (hits === 14) retornoRodada += draw.premiacoes?.faixa14?.valor || 1500;
          else if (hits === 13) retornoRodada += draw.premiacoes?.faixa13?.valor || 35;
          else if (hits === 12) retornoRodada += draw.premiacoes?.faixa12?.valor || 14;
          else retornoRodada += draw.premiacoes?.faixa11?.valor || 7;
        }
      }

      runningCost += custoBaseBatch;
      runningReturn += retornoRodada;
      const lucroAcumulado = runningReturn - runningCost;
      const roiAcumuladoPercent =
        runningCost > 0 ? ((runningReturn - runningCost) / runningCost) * 100 : 0;

      return {
        concurso: draw.concurso,
        data: draw.data,
        jogosCount: consolidatedTickets.length,
        custoRodada: custoBaseBatch,
        custoAcumulado: runningCost,
        retornoRodada,
        retornoAcumulado: runningReturn,
        lucroAcumulado,
        roiAcumuladoPercent,
        melhorAcerto,
        premiadosRodada,
      };
    });
  }, [latestDraw, consolidatedTickets]);

  const totals = useMemo(() => {
    const last = monthlyRows[monthlyRows.length - 1];
    const totalPremiados = monthlyRows.reduce((acc, r) => acc + r.premiadosRodada, 0);
    const melhorGeral = monthlyRows.reduce((max, r) => Math.max(max, r.melhorAcerto), 0);
    return {
      concursos: monthlyRows.length,
      jogos: consolidatedTickets.length,
      custoAcumulado: last?.custoAcumulado ?? 0,
      retornoAcumulado: last?.retornoAcumulado ?? 0,
      lucroAcumulado: last?.lucroAcumulado ?? 0,
      roiAcumuladoPercent: last?.roiAcumuladoPercent ?? 0,
      totalPremiados,
      melhorGeral,
      primeiroConcurso: monthlyRows[0]?.concurso ?? latestDraw.concurso,
      ultimoConcurso: last?.concurso ?? latestDraw.concurso,
    };
  }, [monthlyRows, consolidatedTickets.length, latestDraw.concurso]);

  // Relatório formatado em Markdown (compatível com redes sociais e WhatsApp)
  const markdownReport = useMemo(() => {
    const sinalRoi = totals.roiAcumuladoPercent >= 0 ? '+' : '';
    const sinalLucro = totals.lucroAcumulado >= 0 ? '+' : '';
    const top5Recent = [...monthlyRows].reverse().slice(0, 5);

    const lines = [
      `## Resumo de Performance Mensal • LotoSniper`,
      `**Período:** Últimos 30 dias (Concursos #${totals.primeiroConcurso} a #${totals.ultimoConcurso} · ${totals.concursos} sorteios)`,
      `**Bilhetes Auditados:** ${totals.jogos} jogos`,
      ``,
      `### Consolidado ROI vs Custo Acumulado`,
      `- **Custo Acumulado:** ${formatCurrencyBRL(totals.custoAcumulado)}`,
      `- **Retorno Bruto Acumulado:** ${formatCurrencyBRL(totals.retornoAcumulado)}`,
      `- **Lucro Líquido:** ${sinalLucro}${formatCurrencyBRL(totals.lucroAcumulado)}`,
      `- **ROI Acumulado:** ${sinalRoi}${totals.roiAcumuladoPercent.toFixed(1)}%`,
      `- **Bilhetes Premiados (11+ pts):** ${totals.totalPremiados} (Melhor marca: ${totals.melhorGeral} pts)`,
      ``,
      `### Últimos Concursos (ROI vs Custo Acumulado)`,
      `| Concurso | Data | Custo Acum. | Retorno Acum. | ROI Acum. | Melhor |`,
      `| :--- | :--- | ---: | ---: | ---: | ---: |`,
      ...top5Recent.map((r) => {
        const sr = r.roiAcumuladoPercent >= 0 ? '+' : '';
        return `| #${r.concurso} | ${r.data} | ${formatCurrencyBRL(r.custoAcumulado)} | ${formatCurrencyBRL(r.retornoAcumulado)} | ${sr}${r.roiAcumuladoPercent.toFixed(1)}% | ${r.melhorAcerto} pts |`;
      }),
    ];

    return lines.join('\n');
  }, [totals, monthlyRows]);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdownReport);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = markdownReport;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <section
      aria-label="Resumo de Performance Mensal"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Últimos 30 Dias</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {totals.concursos} concursos (#{totals.primeiroConcurso} a #{totals.ultimoConcurso})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{totals.jogos} bilhetes salvos</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Resumo de Performance Mensal (ROI vs. Custo Acumulado)
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl">
            Tabela comparativa de evolução financeira acumulada nos últimos 30 dias com exportação instantânea em Markdown para compartilhamento.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowMarkdownPreview((v) => !v)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-slate-300" />
            <span>{showMarkdownPreview ? 'Ocultar Markdown' : 'Prévia Markdown'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyMarkdown}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              copied
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/45 text-emerald-300'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>
              {copied ? 'Markdown Copiado!' : 'Copiar Relatório (Markdown / WhatsApp)'}
            </span>
          </button>
        </div>
      </div>

      {/* KPIs de Consolidado Mensal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">Custo Acumulado (30 dias)</span>
          <strong className="text-xl font-mono font-bold tabular-nums text-white block">
            {formatCurrencyBRL(totals.custoAcumulado)}
          </strong>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">Retorno Bruto Acumulado</span>
          <strong className="text-xl font-mono font-bold tabular-nums text-emerald-400 block">
            {formatCurrencyBRL(totals.retornoAcumulado)}
          </strong>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">Lucro Líquido Mensal</span>
          <strong
            className={`text-xl font-mono font-bold tabular-nums block ${
              totals.lucroAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totals.lucroAcumulado > 0 ? '+' : ''}
            {formatCurrencyBRL(totals.lucroAcumulado)}
          </strong>
        </div>

        <div className="bg-slate-950/75 border border-slate-800 rounded-xl p-3.5 space-y-1">
          <span className="text-xs text-slate-400 block">ROI Acumulado (30 dias)</span>
          <div className="flex items-center gap-1.5">
            {totals.roiAcumuladoPercent >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <strong
              className={`text-xl font-mono font-bold tabular-nums ${
                totals.roiAcumuladoPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totals.roiAcumuladoPercent > 0 ? '+' : ''}
              {totals.roiAcumuladoPercent.toFixed(1)}%
            </strong>
          </div>
        </div>
      </div>

      {showMarkdownPreview && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
          <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {markdownReport}
          </pre>
        </div>
      )}

      {/* Tabela Comparativa ROI vs Custo Acumulado */}
      {consolidatedTickets.length === 0 ? (
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-6 text-center space-y-2">
          <p className="text-sm font-bold text-white">
            Nenhum bilhete salvo para consolidar o resumo mensal
          </p>
          <p className="text-xs text-slate-400">
            Salve um fechamento na aba Estúdio de Fechamento para preencher automaticamente a tabela comparativa de ROI vs. Custo Acumulado dos últimos 30 dias.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-950 z-10 border-b border-slate-800">
              <tr className="text-slate-400 font-semibold">
                <th className="py-2.5 px-3 whitespace-nowrap">Concurso</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Custo Rodada</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Custo Acumulado</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Retorno Acumulado</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Lucro Acumulado</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">ROI Acum.</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Melhor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 bg-slate-900/40">
              {[...monthlyRows].reverse().map((row) => (
                <tr key={row.concurso} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-mono font-bold text-white tabular-nums whitespace-nowrap">
                    #{row.concurso}
                  </td>
                  <td className="py-2 px-3 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                    {row.data}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-300 tabular-nums whitespace-nowrap">
                    {formatCurrencyBRL(row.custoRodada)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-200 font-semibold tabular-nums whitespace-nowrap">
                    {formatCurrencyBRL(row.custoAcumulado)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
                    {formatCurrencyBRL(row.retornoAcumulado)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                      row.lucroAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.lucroAcumulado > 0 ? '+' : ''}
                    {formatCurrencyBRL(row.lucroAcumulado)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                      row.roiAcumuladoPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.roiAcumuladoPercent > 0 ? '+' : ''}
                    {row.roiAcumuladoPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <span
                      className={
                        row.melhorAcerto >= 13
                          ? 'text-amber-300 font-bold'
                          : row.melhorAcerto >= 11
                          ? 'text-emerald-400 font-semibold'
                          : 'text-slate-400'
                      }
                    >
                      {row.melhorAcerto} pts
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
