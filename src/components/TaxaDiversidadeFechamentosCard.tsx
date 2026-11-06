import React, { useState, useEffect, useMemo } from 'react';
import {
  getSavedFechamentos,
  getDuplicateFechamentosReport,
  removeDuplicateFechamentos,
  deleteSavedFechamento,
  computeFechamentoHash,
  SavedFechamentoPrognostico,
  DuplicateFechamentosReport,
} from '../services/savedFechamentosStorage';
import { soundService } from '../services/soundAlert';
import {
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  PieChart as PieIcon,
  Fingerprint,
  TrendingUp,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export const TaxaDiversidadeFechamentosCard: React.FC = () => {
  const [fechamentos, setFechamentos] = useState<SavedFechamentoPrognostico[]>(() =>
    getSavedFechamentos()
  );
  const [report, setReport] = useState<DuplicateFechamentosReport>(() =>
    getDuplicateFechamentosReport()
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setFechamentos(getSavedFechamentos());
      setReport(getDuplicateFechamentosReport());
    };
    window.addEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
    return () => window.removeEventListener('lotosniper-saved-fechamentos-updated', handleUpdate);
  }, []);

  const handleCleanDuplicates = () => {
    const res = removeDuplicateFechamentos();
    setFechamentos(getSavedFechamentos());
    setReport(getDuplicateFechamentosReport());
    try {
      soundService.playGoldenZoneSuccessChime();
    } catch {}
    setFeedback(`✓ ${res.details}`);
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDeleteOne = (id: string, name: string) => {
    deleteSavedFechamento(id);
    setFechamentos(getSavedFechamentos());
    setReport(getDuplicateFechamentosReport());
    setFeedback(`✓ Fechamento "${name}" removido.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  // Cores dinâmicas com base na taxa de diversidade
  const { colorTheme, labelStatus } = useMemo(() => {
    if (report.totalFechamentos === 0) {
      return { colorTheme: 'text-slate-400 bg-slate-500/10 border-slate-700', labelStatus: 'Sem Fechamentos' };
    }
    if (report.diversityRatePercent >= 85) {
      return { colorTheme: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', labelStatus: 'Alta Variância & Diversidade Ótima' };
    }
    if (report.diversityRatePercent >= 65) {
      return { colorTheme: 'text-amber-400 bg-amber-500/10 border-amber-500/30', labelStatus: 'Atenção: Variância Moderada' };
    }
    return { colorTheme: 'text-rose-400 bg-rose-500/10 border-rose-500/30', labelStatus: 'Alerta: Baixa Variância Detectada' };
  }, [report]);

  // Dados para o gráfico Recharts comparando fechamentos
  const chartData = useMemo(() => {
    return fechamentos.slice(0, 15).map((f, idx) => {
      const isDup = report.duplicateClosureIds.includes(f.id);
      return {
        name: `F-${idx + 1}`,
        fullName: f.tipoFechamento,
        jogos: f.totalJogos || f.tickets?.length || 0,
        isDuplicate: isDup,
        status: isDup ? 'Cópia / Redundante' : 'Matriz Única',
      };
    });
  }, [fechamentos, report]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header com indicador executivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Fingerprint className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Auditoria de Hash & Matrizes
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${colorTheme}`}>
                {labelStatus}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Taxa de Diversidade dos Fechamentos
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Análise combinatória de variância entre gerações, assinaturas de hash canônico e detecção de sobreposição de bilhetes salvos.
            </p>
          </div>
        </div>

        {report.duplicateCount > 0 && (
          <button
            type="button"
            onClick={handleCleanDuplicates}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg shadow-amber-500/20 shrink-0 flex items-center gap-2 active:scale-95"
            title="Remover automaticamente todos os fechamentos duplicados da memória"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpar {report.duplicateCount} Duplicatas</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Taxa de Diversidade</span>
            <PieIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                report.diversityRatePercent >= 80
                  ? 'text-emerald-400'
                  : report.diversityRatePercent >= 65
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {report.totalFechamentos > 0 ? `${report.diversityRatePercent}%` : '100%'}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {report.uniqueMatrixCount} matrizes únicas de {report.totalFechamentos} salvas
            </p>
          </div>
          {/* Barra de progresso */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                report.diversityRatePercent >= 80
                  ? 'bg-emerald-500'
                  : report.diversityRatePercent >= 65
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, report.diversityRatePercent)}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Fechamentos Cópias</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                report.duplicateCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {report.duplicateCount}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {report.duplicateCount > 0
                ? `${report.duplicateCount} fechamentos com 100% repetição`
                : 'Zero fechamentos duplicados'}
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Status: {report.duplicateCount === 0 ? '✓ Otimizado' : '⚠️ Requer Limpeza'}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Bilhetes Únicos</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {report.uniqueTicketCount}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              de {report.totalTicketsCount} apostas registradas
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            {report.totalTicketsCount > 0
              ? `${Math.round((report.uniqueTicketCount / report.totalTicketsCount) * 100)}% de apostas distintas`
              : '0 apostas'}
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Taxa de Redundância</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                report.redundancyRatePercent > 30 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {report.redundancyRatePercent}%
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {report.redundantTicketsCount} bilhetes repetidos no histórico
            </p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-2">
            Desperdício orçamentário: {report.redundancyRatePercent > 0 ? 'Detectado' : 'Zero'}
          </div>
        </div>
      </div>

      {/* Alerta de Baixa Variância e Padrão Recorrente */}
      {report.hasLowVarianceAlert && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-rose-950/50 border border-amber-500/50 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-amber-200">
                Aviso: Padrão Recorrente ou Baixa Variância Detectada entre Gerações
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                O motor identificou que {report.duplicateCount} fechamentos possuem a mesma matriz de dezenas ou 100% de tickets repetidos já gerados anteriormente. Isso acontece quando as dezenas fixas, universo de dezenas e filtros estão muito estreitos, forçando o motor a reproduzir as mesmas combinações.
              </p>
            </div>
          </div>

          <div className="pl-10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 text-amber-300">
              <span>•</span>
              <span>Recomendação: Amplie a variância alternando 2 ou 3 dezenas fixas.</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <span>•</span>
              <span>A verificação de hash ativa agora impede novas cópias acidentais.</span>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico Recharts de Volume por Fechamento */}
      {chartData.length > 0 && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300">
              Distribuição de Jogos por Fechamento Salvo (Verde: Único • Vermelho: Cópia/Redundante)
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Exibindo até 15 fechamentos mais recentes
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-white">{d.fullName}</p>
                          <p className="text-slate-300">Jogos: {d.jogos}</p>
                          <p className={d.isDuplicate ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            Status: {d.status}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="jogos" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isDuplicate ? '#f43f5e' : '#10b981'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Lista / Tabela das Matrizes com Identificação de Duplicatas */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-300 flex items-center justify-between">
          <span>Dossiê de Matrizes & Status de Variância</span>
          <span className="text-[10px] font-mono text-slate-500">
            Total: {fechamentos.length} registros
          </span>
        </h4>

        {fechamentos.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-400">
            Nenhum fechamento salvo no momento. Crie um novo fechamento na aba Fechamento!
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {fechamentos.map((f, idx) => {
              const isDuplicate = report.duplicateClosureIds.includes(f.id);
              const reason = report.duplicateReasons[f.id];
              const hash = computeFechamentoHash(f.tickets || []).slice(0, 16);

              return (
                <div
                  key={f.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                    isDuplicate
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      #{(idx + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white truncate max-w-xs sm:max-w-md">
                          {f.tipoFechamento}
                        </span>
                        {isDuplicate ? (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                            Cópia Redundante
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                            Matriz Única
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                        <span>{f.tickets?.length || f.totalJogos} apostas</span>
                        <span>•</span>
                        <span>Hash: {hash}...</span>
                        {reason && (
                          <>
                            <span>•</span>
                            <span className="text-rose-400 font-medium truncate">{reason}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isDuplicate && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOne(f.id, f.tipoFechamento)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                        title="Excluir este fechamento duplicado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
