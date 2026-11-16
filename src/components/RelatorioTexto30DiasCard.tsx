import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Check,
  MessageSquare,
  Download,
  FileText,
  Sparkles,
  Calendar,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { GameTicket, LotofacilDraw } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';
import { countMatches, VALOR_APOSTA_LOTOFACIL } from '../services/combinatorics';
import { getHistorical100Draws } from '../services/historical100Draws';
import { getSavedFechamentos } from '../services/savedFechamentosStorage';
import { formatCurrencyBRL } from '../services/ticketRoiAudit';

interface RelatorioTexto30DiasCardProps {
  latestDraw?: LotofacilDraw;
  savedTickets?: GameTicket[];
  cyclePendingNumbers?: number[];
  concursosNoCiclo?: number;
}

function parseDrawDateToMs(dateStr: string): number | null {
  const br = String(dateStr || '').trim().split('/');
  if (br.length === 3) {
    const d = parseInt(br[0], 10);
    const m = parseInt(br[1], 10);
    const y = parseInt(br[2], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000) {
      return new Date(y, m - 1, d).getTime();
    }
  }
  const iso = String(dateStr || '').trim().split('-');
  if (iso.length === 3) {
    const y = parseInt(iso[0], 10);
    const m = parseInt(iso[1], 10);
    const d = parseInt(iso[2], 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000) {
      return new Date(y, m - 1, d).getTime();
    }
  }
  return null;
}

export const RelatorioTexto30DiasCard: React.FC<RelatorioTexto30DiasCardProps> = ({
  latestDraw = CONCURSO_ATUAL,
  savedTickets = [],
  cyclePendingNumbers = [],
  concursosNoCiclo = 1,
}) => {
  const [formatStyle, setFormatStyle] = useState<'whatsapp' | 'texto_puro'>('whatsapp');
  const [includeExtras, setIncludeExtras] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [storageVersion, setStorageVersion] = useState<number>(0);

  useEffect(() => {
    const refresh = () => setStorageVersion((v) => v + 1);
    window.addEventListener('lotosniper-saved-fechamentos-updated', refresh);
    window.addEventListener('lotosniper-saved-tickets-updated', refresh);
    window.addEventListener('lotosniper-backup-restored', refresh);
    return () => {
      window.removeEventListener('lotosniper-saved-fechamentos-updated', refresh);
      window.removeEventListener('lotosniper-saved-tickets-updated', refresh);
      window.removeEventListener('lotosniper-backup-restored', refresh);
    };
  }, []);

  const apostaMinima = useMemo(() => {
    try {
      const saved = localStorage.getItem('lotosniper_roi_aposta_minima');
      const val = saved ? parseFloat(saved) : VALOR_APOSTA_LOTOFACIL;
      return Number.isFinite(val) && val > 0 ? val : VALOR_APOSTA_LOTOFACIL;
    } catch {
      return VALOR_APOSTA_LOTOFACIL;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageVersion]);

  const consolidatedTickets = useMemo(() => {
    const savedClosures = getSavedFechamentos();
    const closureTickets = savedClosures.flatMap((f) =>
      Array.isArray(f.tickets) ? f.tickets : []
    );

    const seen = new Set<string>();
    const merged: GameTicket[] = [];
    [...(savedTickets || []), ...closureTickets].forEach((t) => {
      const dez = Array.isArray(t.dezenas) ? [...t.dezenas].sort((a, b) => a - b) : [];
      if (dez.length === 0) return;
      const key = dez.join('-');
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(t);
      }
    });
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedTickets, storageVersion]);

  const stats30Days = useMemo(() => {
    const allDraws = getHistorical100Draws(latestDraw);
    const anchorMs = parseDrawDateToMs(latestDraw.data);
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let draws30Days = allDraws;
    if (anchorMs !== null) {
      const filtered = allDraws.filter((d) => {
        const ms = parseDrawDateToMs(d.data);
        return ms !== null && anchorMs - ms <= thirtyDaysMs && ms <= anchorMs;
      });
      if (filtered.length > 0) {
        draws30Days = filtered;
      } else {
        draws30Days = allDraws.slice(0, 25);
      }
    } else {
      draws30Days = allDraws.slice(0, 25);
    }

    const custoPorConcurso = consolidatedTickets.reduce((acc, t) => {
      const len = Array.isArray(t.dezenas) ? t.dezenas.length : 15;
      if (len === 16) return acc + apostaMinima * 16;
      if (len === 17) return acc + apostaMinima * 136;
      if (len === 18) return acc + apostaMinima * 816;
      return acc + apostaMinima;
    }, 0);

    const custoTotal = custoPorConcurso * draws30Days.length;
    let premioTotal = 0;
    let totalPremiados = 0;
    let melhorPontuacao = 0;
    const faixas: Record<15 | 14 | 13 | 12 | 11, number> = {
      15: 0,
      14: 0,
      13: 0,
      12: 0,
      11: 0,
    };

    const freqMap = new Map<number, number>();
    for (let i = 1; i <= 25; i++) freqMap.set(i, 0);

    draws30Days.forEach((draw) => {
      draw.dezenas.forEach((n) => freqMap.set(n, (freqMap.get(n) || 0) + 1));

      const p15 = draw.premiacoes?.faixa15?.valor || 1800000;
      const p14 = draw.premiacoes?.faixa14?.valor || 1500;
      const p13 = draw.premiacoes?.faixa13?.valor || 35;
      const p12 = draw.premiacoes?.faixa12?.valor || 14;
      const p11 = draw.premiacoes?.faixa11?.valor || 7;

      consolidatedTickets.forEach((t) => {
        const hits = countMatches(t.dezenas || [], draw.dezenas || []);
        if (hits > melhorPontuacao) melhorPontuacao = hits;
        if (hits >= 11) {
          totalPremiados++;
          if (hits === 15) {
            faixas[15]++;
            premioTotal += p15;
          } else if (hits === 14) {
            faixas[14]++;
            premioTotal += p14;
          } else if (hits === 13) {
            faixas[13]++;
            premioTotal += p13;
          } else if (hits === 12) {
            faixas[12]++;
            premioTotal += p12;
          } else {
            faixas[11]++;
            premioTotal += p11;
          }
        }
      });
    });

    const lucroLiquido = premioTotal - custoTotal;
    const roiPercent = custoTotal > 0 ? (lucroLiquido / custoTotal) * 100 : 0;
    const totalApostas = consolidatedTickets.length * draws30Days.length;
    const taxaAcerto = totalApostas > 0 ? (totalPremiados / totalApostas) * 100 : 0;

    const top5Dezenas = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 5)
      .map(([num, freq]) => ({
        num: num.toString().padStart(2, '0'),
        freq,
      }));

    const oldestDraw = draws30Days[draws30Days.length - 1] || latestDraw;
    const newestDraw = draws30Days[0] || latestDraw;

    return {
      concursosCount: draws30Days.length,
      periodoLabel: `${oldestDraw.data} a ${newestDraw.data}`,
      concursoRange: `#${oldestDraw.concurso} a #${newestDraw.concurso}`,
      totalJogos: consolidatedTickets.length,
      custoTotal,
      premioTotal,
      lucroLiquido,
      roiPercent,
      totalPremiados,
      melhorPontuacao,
      taxaAcerto,
      faixas,
      top5Dezenas,
    };
  }, [consolidatedTickets, latestDraw, apostaMinima]);

  const plainTextReport = useMemo(() => {
    const bold = (txt: string) => (formatStyle === 'whatsapp' ? `*${txt}*` : txt);
    const signRoi = `${stats30Days.roiPercent >= 0 ? '+' : ''}${stats30Days.roiPercent
      .toFixed(1)
      .replace('.', ',')}%`;
    const signSaldo = `${stats30Days.lucroLiquido > 0 ? '+' : stats30Days.lucroLiquido < 0 ? '-' : ''}${formatCurrencyBRL(
      Math.abs(stats30Days.lucroLiquido)
    )}`;

    const lines: string[] = [
      bold('LOTOSNIPER • RESUMO DE PERFORMANCE (ÚLTIMOS 30 DIAS)'),
      `Período: ${stats30Days.periodoLabel} (${stats30Days.concursosCount} concursos · ${stats30Days.concursoRange})`,
      '----------------------------------------',
    ];

    if (stats30Days.totalJogos === 0) {
      lines.push(
        'Jogos monitorados: 0 bilhetes salvos',
        'Status: Gere ou salve um fechamento para consolidar o ROI de 30 dias.'
      );
    } else {
      lines.push(
        `${bold('Jogos Monitorados:')} ${stats30Days.totalJogos} bilhete(s)`,
        `${bold('Investimento Total (30d):')} ${formatCurrencyBRL(stats30Days.custoTotal)}`,
        `${bold('Prêmio Bruto Recebido:')} ${formatCurrencyBRL(stats30Days.premioTotal)}`,
        `${bold('Resultado Líquido:')} ${signSaldo} (ROI: ${signRoi})`,
        `${bold('Bilhetes Premiados (11+):')} ${stats30Days.totalPremiados} | Taxa: ${stats30Days.taxaAcerto
          .toFixed(1)
          .replace('.', ',')}%`,
        `${bold('Melhor Pontuação:')} ${stats30Days.melhorPontuacao} acertos`,
        `Faixas: 15pts (${stats30Days.faixas[15]}) · 14pts (${stats30Days.faixas[14]}) · 13pts (${stats30Days.faixas[13]}) · 12pts (${stats30Days.faixas[12]}) · 11pts (${stats30Days.faixas[11]})`
      );
    }

    if (includeExtras) {
      const top5Str = stats30Days.top5Dezenas.map((d) => `${d.num} (${d.freq}x)`).join(', ');
      const pendentesStr =
        cyclePendingNumbers.length > 0
          ? cyclePendingNumbers.map((n) => n.toString().padStart(2, '0')).join(', ')
          : 'Ciclo concluído';

      lines.push(
        '----------------------------------------',
        `${bold('Top 5 Dezenas (30d):')} ${top5Str}`,
        `${bold('Ciclo Atual:')} ${concursosNoCiclo}º conc. · Faltam: ${pendentesStr}`,
        `${bold('Último Sorteio #' + latestDraw.concurso + ':')} ${latestDraw.dezenas
          .map((n) => n.toString().padStart(2, '0'))
          .join(' ')}`
      );
    }

    lines.push('----------------------------------------', 'Gerado pelo LotoSniper');
    return lines.join('\n');
  }, [
    formatStyle,
    includeExtras,
    stats30Days,
    cyclePendingNumbers,
    concursosNoCiclo,
    latestDraw,
  ]);

  const handleCopyReport = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(plainTextReport);
      } else {
        const temp = document.createElement('textarea');
        temp.value = plainTextReport;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([plainTextReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lotosniper_resumo_30_dias_concurso_${latestDraw.concurso}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isPositive = stats30Days.roiPercent >= 0;

  return (
    <section
      aria-label="Relatório Resumido 30 Dias para WhatsApp e Redes Sociais"
      className="bg-slate-900/95 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-4"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                Relatório Resumido (Últimos 30 Dias)
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
                WHATSAPP & REDES SOCIAIS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Texto simples pronto para copiar e compartilhar rapidamente a performance dos últimos 30 dias ({stats30Days.concursosCount} concursos).
            </p>
          </div>
        </div>

        {/* Controles de Formato & Cópia */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFormatStyle('whatsapp')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                formatStyle === 'whatsapp'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              WhatsApp (*negrito*)
            </button>
            <button
              type="button"
              onClick={() => setFormatStyle('texto_puro')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                formatStyle === 'texto_puro'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Texto Puro
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIncludeExtras((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              includeExtras
                ? 'bg-slate-800 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{includeExtras ? 'Top 5 & Ciclo: ON' : 'Top 5 & Ciclo: OFF'}</span>
          </button>
        </div>
      </div>

      {/* Mini Indicadores do Período */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Janela (30 dias)</span>
          </span>
          <strong className="text-white font-mono tabular-nums text-sm block mt-1">
            {stats30Days.concursosCount} concursos
          </strong>
          <span className="text-[10px] font-mono text-slate-400">{stats30Days.concursoRange}</span>
        </div>

        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Custo vs Prêmio Bruto</span>
          <strong className="text-emerald-400 font-mono tabular-nums text-sm block mt-1">
            {formatCurrencyBRL(stats30Days.premioTotal)}
          </strong>
          <span className="text-[10px] font-mono text-slate-400">
            Custo: {formatCurrencyBRL(stats30Days.custoTotal)}
          </span>
        </div>

        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">ROI (30 dias)</span>
          <strong
            className={`font-mono tabular-nums text-sm flex items-center gap-1 mt-1 ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {stats30Days.roiPercent >= 0 ? '+' : ''}
              {stats30Days.roiPercent.toFixed(1).replace('.', ',')}%
            </span>
          </strong>
          <span className="text-[10px] font-mono text-slate-400">
            {stats30Days.totalPremiados} premiado(s)
          </span>
        </div>

        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Melhor Acerto (30d)</span>
          <strong className="text-amber-300 font-mono tabular-nums text-sm block mt-1">
            {stats30Days.melhorPontuacao} pontos
          </strong>
          <span className="text-[10px] font-mono text-slate-400">
            {stats30Days.totalJogos} jogo(s) ativo(s)
          </span>
        </div>
      </div>

      {/* Área de Texto Simples Pronta para Cópia */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pré-visualização em Texto Simples ({plainTextReport.length} caracteres)</span>
          </span>
          <span>Pronto para colar no WhatsApp, Telegram ou redes sociais</span>
        </div>

        <textarea
          readOnly
          value={plainTextReport}
          rows={11}
          onClick={(e) => e.currentTarget.select()}
          aria-label="Relatório de performance dos últimos 30 dias em texto simples"
          className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl p-4 text-xs font-mono leading-relaxed text-slate-200 resize-y focus:outline-none selection:bg-emerald-500/30"
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyReport}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 ${
              copied
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Copiado para a Área de Transferência!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Relatório para WhatsApp / Redes</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Baixar .TXT</span>
          </button>
        </div>
      </div>
    </section>
  );
};
