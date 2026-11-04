import React, { useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Cpu, 
  Clock, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export type StrengthLevel = 'vazia' | 'muito_fraca' | 'fraca' | 'media' | 'forte' | 'excelente';

export interface CriteriaItem {
  id: string;
  label: string;
  met: boolean;
  required?: boolean;
}

export interface StrengthResult {
  score: number; // 0 to 5
  percentage: number; // 0 to 100
  level: StrengthLevel;
  label: string;
  entropyBits: number;
  crackTimeEstimate: string;
  color: string;
  barColor: string;
  glowColor: string;
  criteria: CriteriaItem[];
  tips: string[];
  isValidForSubmission: boolean;
}

export interface PasswordStrengthMeterProps {
  password?: string;
  showDetails?: boolean;
  showCriteria?: boolean;
  showEntropy?: boolean;
  compact?: boolean;
  className?: string;
  onValidationChange?: (isValid: boolean, entropy: number, score: number) => void;
}

/**
 * Calcula a entropia de informação (Shannon / NIST) e avalia a força da senha
 * baseada em tamanho, variedade de conjuntos de caracteres e detecção de padrões repetitivos.
 */
export function evaluatePasswordStrength(pwd: string = ''): StrengthResult {
  if (!pwd || pwd.length === 0) {
    return {
      score: 0,
      percentage: 0,
      level: 'vazia',
      label: 'Digite uma senha',
      entropyBits: 0,
      crackTimeEstimate: '—',
      color: 'text-slate-500',
      barColor: 'bg-slate-800',
      glowColor: 'shadow-none',
      criteria: [
        { id: 'len8', label: 'Mínimo de 8 caracteres', met: false, required: true },
        { id: 'upperLower', label: 'Letras maiúsculas e minúsculas', met: false, required: true },
        { id: 'numbers', label: 'Pelo menos um número (0-9)', met: false, required: true },
        { id: 'symbols', label: 'Símbolo especial (!@#$%...)', met: false, required: false },
        { id: 'len12', label: '12+ caracteres para alta segurança', met: false, required: false },
      ],
      tips: [
        'Use uma senha longa com palavras não relacionadas ou caracteres variados.',
        'Evite datas de aniversário, sequências como 123456 ou palavras do dicionário.'
      ],
      isValidForSubmission: false,
    };
  }

  const length = pwd.length;

  // 1. Detecção de Variedade de Conjuntos de Caracteres
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /[0-9]/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigit) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  // 2. Cálculo da Entropia Matemática (bits = L * log2(poolSize))
  let rawEntropy = poolSize > 0 ? length * (Math.log(poolSize) / Math.LN2) : 0;

  // 3. Penalidades por Padrões Comuns e Repetições
  // 3a. Penalidade por repetição excessiva de caracteres idênticos consecutivos
  const consecutiveRepeats = (pwd.match(/(.)\1{2,}/g) || []).length;
  if (consecutiveRepeats > 0) {
    rawEntropy = Math.max(0, rawEntropy - consecutiveRepeats * 8);
  }

  // 3b. Penalidade por sequências numéricas ou de teclado óbvias
  const lowerPwd = pwd.toLowerCase();
  const commonSequences = ['123', '234', '345', '456', '567', '678', '789', 'abc', 'bcd', 'cde', 'def', 'qwer', 'asdf', 'zxcv', 'senha', 'password', 'loto', 'admin'];
  let sequenceCount = 0;
  for (const seq of commonSequences) {
    if (lowerPwd.includes(seq)) sequenceCount++;
  }
  if (sequenceCount > 0) {
    rawEntropy = Math.max(0, rawEntropy - sequenceCount * 10);
  }

  // 3c. Bônus por comprimento robusto (>12 e >16 caracteres)
  if (length >= 12) rawEntropy += 6;
  if (length >= 16) rawEntropy += 10;

  const entropyBits = Math.round(rawEntropy);

  // 4. Checklist de Critérios
  const criteria: CriteriaItem[] = [
    { id: 'len8', label: 'Mínimo de 8 caracteres', met: length >= 8, required: true },
    { id: 'upperLower', label: 'Letras maiúsculas e minúsculas', met: hasLower && hasUpper, required: true },
    { id: 'numbers', label: 'Pelo menos um número (0-9)', met: hasDigit, required: true },
    { id: 'symbols', label: 'Símbolo especial (!@#$%...)', met: hasSymbol, required: false },
    { id: 'len12', label: '12+ caracteres para alta segurança', met: length >= 12, required: false },
  ];

  // 5. Estimativa de Tempo de Quebra por Força Bruta (Hashcat / Clusters de GPU modernos ~100 bilhões tentativas/s)
  let crackTimeEstimate = '';
  if (entropyBits < 25) {
    crackTimeEstimate = 'Instantâneo (< 1 segundo)';
  } else if (entropyBits < 35) {
    crackTimeEstimate = 'Poucos minutos';
  } else if (entropyBits < 45) {
    crackTimeEstimate = 'Algumas horas / dias';
  } else if (entropyBits < 60) {
    crackTimeEstimate = 'Vários meses a anos';
  } else if (entropyBits < 80) {
    crackTimeEstimate = 'Décadas / Séculos';
  } else {
    crackTimeEstimate = 'Milhões de anos (Inviolável)';
  }

  // 6. Determinação de Nível e Pontuação Visual (0 a 5)
  let score = 1;
  let level: StrengthLevel = 'muito_fraca';
  let label = 'Muito Fraca';
  let color = 'text-rose-400';
  let barColor = 'bg-rose-500';
  let glowColor = 'shadow-rose-500/30';
  let percentage = 20;
  const tips: string[] = [];

  if (length < 8) {
    score = 1;
    level = 'muito_fraca';
    label = 'Muito Fraca';
    color = 'text-rose-400';
    barColor = 'bg-rose-500';
    glowColor = 'shadow-rose-500/30';
    percentage = 20;
    tips.push('Aumente para pelo menos 8 caracteres para proteção básica.');
  } else if (entropyBits < 38 || (!hasDigit && !hasSymbol)) {
    score = 2;
    level = 'fraca';
    label = 'Fraca';
    color = 'text-orange-400';
    barColor = 'bg-orange-500';
    glowColor = 'shadow-orange-500/30';
    percentage = 40;
    if (!hasDigit) tips.push('Adicione números (0-9).');
    if (!hasUpper || !hasLower) tips.push('Combine letras maiúsculas e minúsculas.');
    if (!hasSymbol) tips.push('Inclua símbolos especiais para elevar a entropia.');
  } else if (entropyBits < 58) {
    score = 3;
    level = 'media';
    label = 'Média / Razoável';
    color = 'text-amber-400';
    barColor = 'bg-amber-400';
    glowColor = 'shadow-amber-400/30';
    percentage = 60;
    if (length < 12) tips.push('Considere atingir 12 caracteres para torná-la forte.');
    if (!hasSymbol) tips.push('Adicione ao menos um símbolo especial (!@#$%).');
  } else if (entropyBits < 80) {
    score = 4;
    level = 'forte';
    label = 'Forte';
    color = 'text-emerald-400';
    barColor = 'bg-emerald-500';
    glowColor = 'shadow-emerald-500/30';
    percentage = 80;
    tips.push('Excelente segurança. Resistente a ataques de dicionário e rainbow tables.');
  } else {
    score = 5;
    level = 'excelente';
    label = 'Excelente (Blindada)';
    color = 'text-cyan-400';
    barColor = 'bg-cyan-400';
    glowColor = 'shadow-cyan-400/30';
    percentage = 100;
    tips.push('Nível de entropia militar. Resistência máxima contra ataques avançados.');
  }

  // Válida para submissão se tiver pelo menos 8 caracteres e nota >= 2
  const isValidForSubmission = length >= 8 && score >= 2;

  return {
    score,
    percentage,
    level,
    label,
    entropyBits,
    crackTimeEstimate,
    color,
    barColor,
    glowColor,
    criteria,
    tips,
    isValidForSubmission,
  };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  showDetails = true,
  showCriteria = true,
  showEntropy = true,
  compact = false,
  className = '',
  onValidationChange,
}) => {
  const result = useMemo(() => evaluatePasswordStrength(password), [password]);

  // Notificar callback externo de validação em tempo real
  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(result.isValidForSubmission, result.entropyBits, result.score);
    }
  }, [result.isValidForSubmission, result.entropyBits, result.score, onValidationChange]);

  const isEmpty = !password || password.length === 0;

  return (
    <div className={`w-full space-y-2.5 ${className}`}>
      {/* Cabeçalho da Métrica com Título e Rótulo de Força */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          {isEmpty ? (
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          ) : result.score >= 4 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : result.score >= 3 ? (
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span>Força da Senha:</span>
          {!isEmpty && showEntropy && (
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              ({result.entropyBits} bits)
            </span>
          )}
        </div>

        <span className={`font-bold uppercase tracking-wider text-[11px] ${result.color}`}>
          {result.label}
        </span>
      </div>

      {/* Barra de Força Visual Segmentada (5 Estágios com Transição Suave) */}
      <div 
        className="w-full"
        role="progressbar"
        aria-valuenow={result.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Indicador de Força da Senha"
      >
        <div className="grid grid-cols-5 gap-1.5 h-2 w-full">
          {[1, 2, 3, 4, 5].map((step) => {
            const isActive = !isEmpty && result.score >= step;
            return (
              <div
                key={step}
                className={`h-full rounded-full transition-all duration-300 ${
                  isActive 
                    ? `${result.barColor} shadow-sm ${result.glowColor}` 
                    : 'bg-slate-800/80'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Estimativa de Resistência e Tempo de Quebra */}
      {!isEmpty && !compact && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Tempo estimado de quebra:</span>
          </span>
          <span className="font-semibold text-slate-200">
            {result.crackTimeEstimate}
          </span>
        </div>
      )}

      {/* Checklist de Critérios em Tempo Real */}
      {showCriteria && (
        <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
          {result.criteria.map((item) => (
            <div 
              key={item.id}
              className={`flex items-center gap-1.5 transition-colors duration-200 ${
                item.met ? 'text-emerald-400 font-medium' : 'text-slate-500'
              }`}
            >
              {item.met ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-3 h-3 text-slate-600 shrink-0" />
              )}
              <span className={item.met ? 'text-slate-200' : 'text-slate-400'}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Dicas Contextuais de Segurança */}
      {showDetails && result.tips.length > 0 && !isEmpty && (
        <div className="pt-1 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          {result.tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
              <Cpu className="w-3 h-3 text-slate-500 mt-0.5 shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
