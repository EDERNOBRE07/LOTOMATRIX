import React, { useState, useEffect } from 'react';
import {
  getFechamentoErrorLogs,
  clearFechamentoErrorLogs,
  exportFechamentoLogsAsJson,
  exportFechamentoLogsAsTxt,
  FechamentoErrorLogEntry,
} from '../services/fechamentoErrorLogger';
import {
  Bug,
  Download,
  Trash2,
  X,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Layers,
  Cpu,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

interface FechamentoErrorLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreDefaults?: () => void;
}

export const FechamentoErrorLogsModal: React.FC<FechamentoErrorLogsModalProps> = ({
  isOpen,
  onClose,
  onRestoreDefaults,
}) => {
  const [logs, setLogs] = useState<FechamentoErrorLogEntry[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refreshLogs = () => {
    const list = getFechamentoErrorLogs();
    setLogs(list);
    if (list.length > 0 && !selectedLogId) {
      setSelectedLogId(list[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedLog = logs.find((l) => l.id === selectedLogId) || logs[0];

  const handleDownloadTxt = () => {
    const content = exportFechamentoLogsAsTxt();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lotosniper-dossie-erros-${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    soundService.playSuccess();
  };

  const handleDownloadJson = () => {
    const content = exportFechamentoLogsAsJson();
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lotosniper-telemetria-erros-${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    soundService.playSuccess();
  };

  const handleClear = () => {
    if (confirm('Deseja realmente limpar todos os logs de erro registrados no histórico local?')) {
      clearFechamentoErrorLogs();
      setLogs([]);
      setSelectedLogId(null);
      soundService.playClick();
    }
  };

  const handleCopyParams = (log: FechamentoErrorLogEntry) => {
    const json = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(json);
    setCopiedId(log.id);
    soundService.playSuccess();
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Dossiê de Telemetria e Logs de Erro do Fechamento
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                  {logs.length} Ocorrência(s)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registro detalhado do estado das dezenas, filtros e parâmetros no momento exato de qualquer falha combinatória.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Logs List Sidebar */}
          <div className="w-full md:w-80 border-r border-slate-800/80 overflow-y-auto max-h-60 md:max-h-none bg-slate-950/40 p-3 space-y-2">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 space-y-2">
                <AlertTriangle className="w-8 h-8 mx-auto opacity-40 text-emerald-400" />
                <p className="text-xs font-semibold text-slate-400">Nenhum erro registrado</p>
                <p className="text-[11px] text-slate-500">
                  O motor combinatório operou com estabilidade total.
                </p>
              </div>
            ) : (
              logs.map((item) => {
                const isSelected = item.id === (selectedLog?.id ?? '');
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedLogId(item.id);
                      soundService.playClick();
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-rose-950/50 border-rose-500/60 shadow-md ring-1 ring-rose-500/30'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-bold text-rose-400 uppercase">
                        [{item.stage}]
                      </span>
                      <span className="text-slate-500 text-[10px] font-mono">
                        {new Date(item.epoch).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 mt-1 line-clamp-1">
                      {item.errorMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400 font-mono">
                      <span>{item.selectedNumbers.length} dezenas</span>
                      <span>•</span>
                      <span>Modo: {item.mode || 'N/A'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Details Pane */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-900/90">
            {selectedLog ? (
              <>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      Diagnóstico: {selectedLog.errorMessage}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(selectedLog.epoch).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {selectedLog.errorStack && (
                    <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 overflow-x-auto max-h-28">
                      {selectedLog.errorStack}
                    </pre>
                  )}
                </div>

                {/* State Dump */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">Dezenas Selecionadas</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedLog.selectedNumbers.map((num) => (
                        <span
                          key={num}
                          className="w-6 h-6 rounded bg-slate-800 text-slate-200 text-[11px] font-mono font-bold flex items-center justify-center border border-slate-700"
                        >
                          {String(num).padStart(2, '0')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">Fixas e Excluídas</span>
                    <div className="text-xs space-y-1 font-mono">
                      <div>
                        <span className="text-emerald-400">Fixas ({selectedLog.fixedNumbers?.length || 0}): </span>
                        <span className="text-slate-300">
                          {(selectedLog.fixedNumbers || []).map((n) => String(n).padStart(2, '0')).join(', ') || 'Nenhuma'}
                        </span>
                      </div>
                      <div>
                        <span className="text-rose-400">Excluídas ({selectedLog.excludedNumbers?.length || 0}): </span>
                        <span className="text-slate-300">
                          {(selectedLog.excludedNumbers || []).map((n) => String(n).padStart(2, '0')).join(', ') || 'Nenhuma'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Filters Dump */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Filtros Ativos no Momento do Colapso
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Soma</span>
                      <span className="text-slate-200 font-bold">
                        {selectedLog.activeFilters.somaMin ?? 'N/A'} a {selectedLog.activeFilters.somaMax ?? 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Pares</span>
                      <span className="text-slate-200 font-bold">
                        {selectedLog.activeFilters.paresMin ?? 'N/A'} a {selectedLog.activeFilters.paresMax ?? 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Primos</span>
                      <span className="text-slate-200 font-bold">
                        {selectedLog.activeFilters.primosMin ?? 'N/A'} a {selectedLog.activeFilters.primosMax ?? 'N/A'}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Moldura</span>
                      <span className="text-slate-200 font-bold">
                        {selectedLog.activeFilters.molduraMin ?? 'N/A'} a {selectedLog.activeFilters.molduraMax ?? 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedLog.memoryInfo && (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      Memória JS Heap Utilizada
                    </span>
                    <span>
                      {selectedLog.memoryInfo.usedJSHeapSize}MB / {selectedLog.memoryInfo.totalJSHeapSize}MB (Limite: {selectedLog.memoryInfo.jsHeapSizeLimit}MB)
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Selecione um evento de erro na barra lateral para inspecionar os parâmetros.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {selectedLog && (
              <button
                onClick={() => handleCopyParams(selectedLog)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                {copiedId === selectedLog.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Parâmetros</span>
                  </>
                )}
              </button>
            )}

            {logs.length > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Histórico</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRestoreDefaults && (
              <button
                onClick={() => {
                  onRestoreDefaults();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Filtros Padrão</span>
              </button>
            )}

            <button
              onClick={handleDownloadTxt}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Baixar TXT</span>
            </button>

            <button
              onClick={handleDownloadJson}
              disabled={logs.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
