import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  X,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Info,
  CheckCircle2,
  Building2,
  Globe,
  Award,
  Calendar,
} from 'lucide-react';
import { FechamentoExportMeta } from '../types/lotofacil';

export interface CSVExportGame {
  index?: number;
  label?: string;
  dezenas: number[];
  pares?: number;
  impares?: number;
  primos?: number;
  soma?: number;
  moldura?: number;
  scoreIA?: number;
  hits?: number;
  premioNome?: string;
  premioValor?: number;
}

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: CSVExportGame[];
  concursoRef?: number;
  dataConcurso?: string;
  fechamentoMeta?: FechamentoExportMeta | null;
  estrategia?: string;
  title?: string;
  defaultFilename?: string;
}

export type CSVFormatType =
  | 'loterica_cef'
  | 'plataformas_apostas'
  | 'excel_br'
  | 'volante'
  | 'universal';

export const ExportCSVModal: React.FC<ExportCSVModalProps> = ({
  isOpen,
  onClose,
  games,
  concursoRef = 3811,
  dataConcurso = '22/10/2026',
  fechamentoMeta,
  estrategia,
  title = 'Exportação CSV Profissional de Apostas',
  defaultFilename,
}) => {
  const [formatType, setFormatType] = useState<CSVFormatType>('loterica_cef');
  const [separator, setSeparator] = useState<',' | ';' | ' '>( ';');
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(true);
  const [includeHeader, setIncludeHeader] = useState<boolean>(true);
  const [padZero, setPadZero] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Derive resolved strategy name and contest ID
  const resolvedEstrategia =
    estrategia ||
    fechamentoMeta?.strategyName ||
    fechamentoMeta?.modeName ||
    'Matriz Pro LotoSniper (Zona de Ouro)';
  const resolvedConcurso = fechamentoMeta?.concurso || concursoRef || 3811;
  const resolvedData = fechamentoMeta?.dataConcurso || dataConcurso || '22/10/2026';
  const custoTotal = (games.length * 3.5).toFixed(2).replace('.', ',');

  // Sync default options when format changes
  const handleFormatChange = (fmt: CSVFormatType) => {
    setFormatType(fmt);
    if (fmt === 'loterica_cef') {
      setSeparator(';');
      setIncludeMetadata(true);
      setIncludeHeader(true);
      setPadZero(true);
    } else if (fmt === 'plataformas_apostas') {
      setSeparator(',');
      setIncludeMetadata(true);
      setIncludeHeader(false);
      setPadZero(true);
    } else if (fmt === 'excel_br') {
      setSeparator(';');
      setIncludeMetadata(false);
      setIncludeHeader(true);
      setPadZero(true);
    } else if (fmt === 'volante') {
      setSeparator(',');
      setIncludeMetadata(false);
      setIncludeHeader(false);
      setPadZero(true);
    } else if (fmt === 'universal') {
      setSeparator(',');
      setIncludeMetadata(false);
      setIncludeHeader(true);
      setPadZero(true);
    }
  };

  // Generate CSV text content
  const csvContent = useMemo(() => {
    if (!games || games.length === 0) return '';

    const formatNumber = (n: number) => (padZero ? n.toString().padStart(2, '0') : n.toString());
    const rows: string[] = [];

    // 1. Optional Metadata Header Block (Casas Lotéricas / Plataformas de Apostas / Auditoria)
    if (includeMetadata) {
      rows.push('# ==============================================================================');
      rows.push('# LOTOSNIPER PRO - EXPORTAÇÃO OFICIAL DE APOSTAS (CAIXA ECONÔMICA FEDERAL)');
      rows.push(`# CONCURSO_ID: #${resolvedConcurso}`);
      rows.push(`# DATA_CONCURSO: ${resolvedData}`);
      rows.push(`# ESTRATEGIA_FECHAMENTO: ${resolvedEstrategia}`);
      rows.push(`# TOTAL_DE_JOGOS: ${games.length} apostas de 15 dezenas`);
      rows.push(`# INVESTIMENTO_TOTAL: R$ ${custoTotal} (R$ 3,50 por aposta simples)`);
      rows.push(`# FORMATO_EXPORTACAO: ${formatType.toUpperCase()}`);
      rows.push(`# DATA_GERACAO: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
      rows.push('# ==============================================================================');
    }

    // 2. Format 1: Casas Lotéricas & CEF (Importação rápida com colunas de Concurso e Estratégia)
    if (formatType === 'loterica_cef') {
      const sep = separator;
      if (includeHeader) {
        const headers = [
          'Jogo',
          ...Array.from({ length: 15 }, (_, i) => `D${(i + 1).toString().padStart(2, '0')}`),
          'Soma',
          'Pares',
          'Primos',
          'Moldura',
          'Concurso_ID',
          'Estrategia',
        ];
        rows.push(headers.join(sep));
      }

      games.forEach((g, idx) => {
        const sorted = [...g.dezenas].sort((a, b) => a - b);
        const gameLabel = g.label || (g.index !== undefined ? (g.index).toString().padStart(2, '0') : (idx + 1).toString().padStart(2, '0'));
        const dezenasCols = sorted.map(formatNumber);
        const soma = g.soma ?? sorted.reduce((acc, curr) => acc + curr, 0);
        const pares = g.pares ?? sorted.filter((n) => n % 2 === 0).length;
        const primos = g.primos ?? sorted.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
        const moldura = g.moldura ?? sorted.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length;

        rows.push(
          [
            gameLabel,
            ...dezenasCols,
            soma,
            pares,
            primos,
            moldura,
            resolvedConcurso,
            `"${resolvedEstrategia}"`,
          ].join(sep)
        );
      });

      return rows.join('\n');
    }

    // 3. Format 2: Plataformas de Apostas Online & Bolões
    if (formatType === 'plataformas_apostas') {
      const sep = separator;
      if (includeHeader) {
        rows.push(Array.from({ length: 15 }, (_, i) => `D${(i + 1).toString().padStart(2, '0')}`).join(sep));
      }
      games.forEach((g) => {
        const sorted = [...g.dezenas].sort((a, b) => a - b);
        rows.push(sorted.map(formatNumber).join(sep));
      });
      return rows.join('\n');
    }

    // 4. Format 3: Excel Brasil (;)
    if (formatType === 'excel_br') {
      const sep = ';';
      if (includeHeader) {
        const headers = [
          'Jogo',
          ...Array.from({ length: 15 }, (_, i) => `D${(i + 1).toString().padStart(2, '0')}`),
          'Pares',
          'Impares',
          'Primos',
          'Soma',
          'Moldura',
          'Score_IA',
          'Concurso_ID',
          'Estrategia',
        ];
        rows.push(headers.join(sep));
      }

      games.forEach((g, idx) => {
        const sorted = [...g.dezenas].sort((a, b) => a - b);
        const gameLabel = g.label || `Jogo ${(g.index ?? idx + 1).toString().padStart(2, '0')}`;
        const dezenasCols = sorted.map(formatNumber);
        const pares = g.pares ?? sorted.filter((n) => n % 2 === 0).length;
        const impares = g.impares ?? sorted.filter((n) => n % 2 !== 0).length;
        const primos = g.primos ?? sorted.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
        const soma = g.soma ?? sorted.reduce((acc, curr) => acc + curr, 0);
        const moldura = g.moldura ?? sorted.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length;
        const score = g.scoreIA !== undefined ? g.scoreIA : 80;

        rows.push(
          [
            gameLabel,
            ...dezenasCols,
            pares,
            impares,
            primos,
            soma,
            moldura,
            score,
            resolvedConcurso,
            `"${resolvedEstrategia}"`,
          ].join(sep)
        );
      });

      return rows.join('\n');
    }

    // 5. Format 4: Volante puro (Cologa / LotoCerto)
    if (formatType === 'volante') {
      const sep = separator;
      if (includeHeader) {
        rows.push(Array.from({ length: 15 }, (_, i) => `D${(i + 1).toString().padStart(2, '0')}`).join(sep));
      }
      games.forEach((g) => {
        const sorted = [...g.dezenas].sort((a, b) => a - b);
        rows.push(sorted.map(formatNumber).join(sep));
      });
      return rows.join('\n');
    }

    // 6. Format 5: Universal CSV (,)
    const sep = separator;
    if (includeHeader) {
      const headers = [
        'Jogo',
        ...Array.from({ length: 15 }, (_, i) => `D${(i + 1).toString().padStart(2, '0')}`),
        'Pares',
        'Impares',
        'Primos',
        'Soma',
        'Moldura',
        'Concurso_ID',
        'Estrategia',
      ];
      rows.push(headers.join(sep));
    }

    games.forEach((g, idx) => {
      const sorted = [...g.dezenas].sort((a, b) => a - b);
      const gameLabel = g.label || `Jogo ${(g.index ?? idx + 1).toString().padStart(2, '0')}`;
      const dezenasCols = sorted.map(formatNumber);
      const pares = g.pares ?? sorted.filter((n) => n % 2 === 0).length;
      const impares = g.impares ?? sorted.filter((n) => n % 2 !== 0).length;
      const primos = g.primos ?? sorted.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
      const soma = g.soma ?? sorted.reduce((acc, curr) => acc + curr, 0);
      const moldura = g.moldura ?? sorted.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length;

      rows.push(
        [
          gameLabel,
          ...dezenasCols,
          pares,
          impares,
          primos,
          soma,
          moldura,
          resolvedConcurso,
          `"${resolvedEstrategia}"`,
        ].join(sep)
      );
    });

    return rows.join('\n');
  }, [
    games,
    formatType,
    separator,
    includeMetadata,
    includeHeader,
    padZero,
    resolvedConcurso,
    resolvedData,
    resolvedEstrategia,
    custoTotal,
  ]);

  if (!isOpen) return null;

  const filename =
    defaultFilename ||
    (formatType === 'loterica_cef'
      ? `lotosniper_lotericas_concurso_${resolvedConcurso}_${games.length}_jogos.csv`
      : formatType === 'plataformas_apostas'
      ? `lotosniper_apostas_online_conc_${resolvedConcurso}.csv`
      : formatType === 'excel_br'
      ? `lotosniper_excel_conc_${resolvedConcurso}_${games.length}_jogos.csv`
      : `lotosniper_jogos_${games.length}.csv`);

  const handleDownload = () => {
    const mimeType = 'text/csv;charset=utf-8';
    const blob = new Blob([csvContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(csvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {title}
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {games.length} {games.length === 1 ? 'Aposta' : 'Apostas'}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  CONCURSO #{resolvedConcurso}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formatado profissionalmente para importação rápida em casas lotéricas ou plataformas de apostas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Metadados Ativos Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400">Estratégia:</span>
              <strong className="text-white font-semibold">{resolvedEstrategia}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400">Concurso ID:</span>
              <strong className="text-emerald-300 font-mono">#{resolvedConcurso} ({resolvedData})</strong>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400">Custo Total:</span>
              <strong className="text-amber-300">R$ {custoTotal}</strong>
            </div>
          </div>

          {/* Preset format selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Selecione o Formato de Exportação Desejado:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* 1. Casas Lotéricas & CEF */}
              <button
                type="button"
                onClick={() => handleFormatChange('loterica_cef')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'loterica_cef'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Building2 className={`w-4 h-4 ${formatType === 'loterica_cef' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>Casas Lotéricas & CEF</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Padrão oficial com metadados do concurso, estratégia, separador (;) e estatísticas de jogo.
                  </p>
                </div>
                {formatType === 'loterica_cef' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Recomendado p/ Lotéricas</span>
                  </div>
                )}
              </button>

              {/* 2. Plataformas de Apostas Online */}
              <button
                type="button"
                onClick={() => handleFormatChange('plataformas_apostas')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'plataformas_apostas'
                    ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Globe className={`w-4 h-4 ${formatType === 'plataformas_apostas' ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>Plataformas Online & Bolões</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Linhas puras com as 15 dezenas (01 a 25) prontas para colar em sites e softwares de aposta.
                  </p>
                </div>
                {formatType === 'plataformas_apostas' && (
                  <div className="mt-2 text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Importação Rápida Web</span>
                  </div>
                )}
              </button>

              {/* 3. Excel BR */}
              <button
                type="button"
                onClick={() => handleFormatChange('excel_br')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'excel_br'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <FileSpreadsheet className={`w-4 h-4 ${formatType === 'excel_br' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>Excel Brasil (;)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Separador ponto e vírgula com colunas D01..D15, Paridade, Primos, Moldura e Score IA.
                  </p>
                </div>
                {formatType === 'excel_br' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Padrão Windows BR</span>
                  </div>
                )}
              </button>

              {/* 4. Volantes e Softwares */}
              <button
                type="button"
                onClick={() => handleFormatChange('volante')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'volante'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Printer className={`w-4 h-4 ${formatType === 'volante' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>Volantes & Cologa</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Apenas os números sem cabeçalho para softwares de impressão e marcação ótica de volantes.
                  </p>
                </div>
                {formatType === 'volante' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Impressão Direta</span>
                  </div>
                )}
              </button>

              {/* 5. Universal CSV */}
              <button
                type="button"
                onClick={() => handleFormatChange('universal')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'universal'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md ring-1 ring-emerald-400/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Sparkles className={`w-4 h-4 ${formatType === 'universal' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>CSV Universal (,)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Separador internacional por vírgula compatível com Google Sheets, Python e APIs de apostas.
                  </p>
                </div>
                {formatType === 'universal' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Padrão Web Global</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Opções Personalizadas */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                />
                <span className="font-semibold text-emerald-300">Bloco de Metadados (Concurso & Estratégia)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                />
                <span>Linha de Cabeçalho (D01..D15)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={padZero}
                  onChange={(e) => setPadZero(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                />
                <span>Zeros à esquerda (01 a 25)</span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span>Separador:</span>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value as ',' | ';' | ' ')}
                className="bg-slate-900 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1 border border-slate-700 cursor-pointer"
              >
                <option value=";">Ponto e Vírgula (;) - BR</option>
                <option value=",">Vírgula (,) - Internacional</option>
                <option value=" ">Espaço ( )</option>
              </select>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400">
                Prévia do Arquivo ({filename}):
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {csvContent.split('\n').length} linhas geradas
              </span>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={csvContent}
                rows={7}
                className="w-full bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl p-3.5 border border-slate-800 leading-relaxed resize-none focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Information box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-300">
            <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Importação em Casas Lotéricas:</strong> O formato <strong>"Casas Lotéricas & CEF"</strong> inclui
              o ID do concurso (<strong>#{resolvedConcurso}</strong>) e o nome da estratégia no cabeçalho e em cada linha,
              permitindo validação automática em sistemas lotéricos sem perda de rastreabilidade.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            Arquivo: <strong className="text-emerald-400">{filename}</strong>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar CSV'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
