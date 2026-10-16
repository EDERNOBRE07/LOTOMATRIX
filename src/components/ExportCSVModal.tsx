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
} from 'lucide-react';

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
  title?: string;
  defaultFilename?: string;
}

export type CSVFormatType = 'volante' | 'excel_br' | 'universal';

export const ExportCSVModal: React.FC<ExportCSVModalProps> = ({
  isOpen,
  onClose,
  games,
  concursoRef,
  title = 'Exportar Jogos em Formato CSV',
  defaultFilename,
}) => {
  const [formatType, setFormatType] = useState<CSVFormatType>('volante');
  const [separator, setSeparator] = useState<',' | ';' | ' '>(',');
  const [includeHeader, setIncludeHeader] = useState<boolean>(false);
  const [padZero, setPadZero] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync default options when format changes
  const handleFormatChange = (fmt: CSVFormatType) => {
    setFormatType(fmt);
    if (fmt === 'volante') {
      setSeparator(',');
      setIncludeHeader(false);
      setPadZero(true);
    } else if (fmt === 'excel_br') {
      setSeparator(';');
      setIncludeHeader(true);
      setPadZero(true);
    } else if (fmt === 'universal') {
      setSeparator(',');
      setIncludeHeader(true);
      setPadZero(true);
    }
  };

  // Generate CSV text content
  const csvContent = useMemo(() => {
    if (!games || games.length === 0) return '';

    const formatNumber = (n: number) => (padZero ? n.toString().padStart(2, '0') : n.toString());

    if (formatType === 'volante') {
      // Pure numbers for Volantes & Software (Cologa, LotoCerto, etc.)
      const rows: string[] = [];
      if (includeHeader) {
        const header = Array.from({ length: 15 }, (_, i) => `D${(i + 1).toString().padStart(2, '0')}`).join(separator);
        rows.push(header);
      }
      games.forEach((g) => {
        const sorted = [...g.dezenas].sort((a, b) => a - b);
        rows.push(sorted.map(formatNumber).join(separator));
      });
      return rows.join('\n');
    }

    if (formatType === 'excel_br') {
      // Excel BR with semicolon separator
      const sep = ';';
      const headers = [
        'Jogo',
        'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15',
        'Pares',
        'Impares',
        'Primos',
        'Soma',
        'Moldura',
      ];
      if (concursoRef) {
        headers.push(`Acertos_Concurso_${concursoRef}`);
        headers.push('Premio_Estimado_R$');
      }

      const rows: string[] = [];
      if (includeHeader) {
        rows.push(headers.join(sep));
      }

      games.forEach((g, idx) => {
        const sorted = [...g.dezenas].sort((a, b) => a - b);
        const gameLabel = g.label || `Jogo ${(g.index ?? idx + 1).toString().padStart(2, '0')}`;
        const dezenasCols = sorted.map(formatNumber);

        // Calculate stats if not present
        const pares = g.pares ?? sorted.filter((n) => n % 2 === 0).length;
        const impares = g.impares ?? sorted.filter((n) => n % 2 !== 0).length;
        const primos = g.primos ?? sorted.filter((n) => [2, 3, 5, 7, 11, 13, 17, 19, 23].includes(n)).length;
        const soma = g.soma ?? sorted.reduce((acc, curr) => acc + curr, 0);
        const moldura = g.moldura ?? sorted.filter((n) => [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(n)).length;

        const row = [
          gameLabel,
          ...dezenasCols,
          pares,
          impares,
          primos,
          soma,
          moldura,
        ];

        if (concursoRef) {
          row.push(g.hits !== undefined ? g.hits : '');
          row.push(g.premioValor !== undefined ? g.premioValor.toFixed(2).replace('.', ',') : '0,00');
        }

        rows.push(row.join(sep));
      });

      return rows.join('\n');
    }

    // Universal CSV
    const sep = separator;
    const headers = [
      'Jogo',
      'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15',
      'Pares',
      'Impares',
      'Primos',
      'Soma',
      'Moldura',
    ];

    const rows: string[] = [];
    if (includeHeader) {
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

      rows.push([gameLabel, ...dezenasCols, pares, impares, primos, soma, moldura].join(sep));
    });

    return rows.join('\n');
  }, [games, formatType, separator, includeHeader, padZero, concursoRef]);

  if (!isOpen) return null;

  const filename =
    defaultFilename ||
    (formatType === 'volante'
      ? `lotosniper_volantes_${games.length}_jogos.csv`
      : formatType === 'excel_br'
      ? `lotosniper_jogos_excel_${games.length}_jogos.csv`
      : `lotosniper_jogos_${games.length}.csv`);

  const handleDownload = () => {
    const mimeType = formatType === 'excel_br' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {games.length} {games.length === 1 ? 'Jogo' : 'Jogos'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Formato pronto para impressão em volantes, Cologa, LotoCerto e planilhas Excel.
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
          {/* Preset format selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-2">
              Escolha a Finalidade da Exportação:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Volante / Printing */}
              <button
                type="button"
                onClick={() => handleFormatChange('volante')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'volante'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Printer className={`w-3.5 h-3.5 ${formatType === 'volante' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>Volantes & Softwares</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Apenas as 15 dezenas com 2 dígitos (01 a 25), ideal para Cologa e leitores lotéricos.
                  </p>
                </div>
                {formatType === 'volante' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Recomendado p/ Impressão</span>
                  </div>
                )}
              </button>

              {/* Excel BR */}
              <button
                type="button"
                onClick={() => handleFormatChange('excel_br')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'excel_br'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <FileSpreadsheet className={`w-3.5 h-3.5 ${formatType === 'excel_br' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>Excel Brasil (;)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Separador ponto e vírgula, com colunas D01..D15 e estatísticas. Não desconfigura no Excel.
                  </p>
                </div>
                {formatType === 'excel_br' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Padrão Windows BR</span>
                  </div>
                )}
              </button>

              {/* Universal CSV */}
              <button
                type="button"
                onClick={() => handleFormatChange('universal')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  formatType === 'universal'
                    ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Sparkles className={`w-3.5 h-3.5 ${formatType === 'universal' ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>Universal (,)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Separador padrão vírgula internacional, ideal para Google Sheets ou sistemas web.
                  </p>
                </div>
                {formatType === 'universal' && (
                  <div className="mt-2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Padrão Web</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Detailed options */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeHeader}
                  onChange={(e) => setIncludeHeader(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                />
                <span>Incluir linha de cabeçalho</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={padZero}
                  onChange={(e) => setPadZero(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-900 cursor-pointer"
                />
                <span>Dezenas com 2 dígitos (01 a 09)</span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span>Separador:</span>
              <select
                value={separator}
                onChange={(e) => setSeparator(e.target.value as ',' | ';' | ' ')}
                className="bg-slate-900 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1 border border-slate-700 cursor-pointer"
              >
                <option value=",">Vírgula (,)</option>
                <option value=";">Ponto e Vírgula (;)</option>
                <option value=" ">Espaço ( )</option>
              </select>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-400">Prévia do Arquivo ({filename}):</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {csvContent.split('\n').length} linhas geradas
              </span>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={csvContent}
                rows={6}
                className="w-full bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl p-3 border border-slate-800 leading-relaxed resize-none focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Information box */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-300">
            <Info className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Dica para volantes:</strong> Para softwares como Cologa ou LotoCerto, selecione a opção <strong>"Volantes & Softwares"</strong> sem cabeçalho. Para abrir no Excel com formatação correta de células, utilize <strong>"Excel Brasil (;)"</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-mono">
            Arquivo: <strong className="text-slate-200">{filename}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
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
