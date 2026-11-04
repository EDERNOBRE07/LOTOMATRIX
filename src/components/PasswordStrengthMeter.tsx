import React, { useMemo } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
  showDetails?: boolean;
}

export type StrengthLevel = 'vazia' | 'fraca' | 'media' | 'forte' | 'excelente';

interface StrengthResult {
  score: number; // 0 to 4
  level: StrengthLevel;
  label: string;
  color: string;
  barColor: string;
  tips: string[];
}

export function evaluatePasswordStrength(pwd: string = ''): StrengthResult {
  if (!pwd) {
    return {
      score: 0,
      level: 'vazia',
      label: 'Digite a senha',
      color: 'text-slate-500',
      barColor: 'bg-slate-700',
      tips: ['Mínimo 8 caracteres', 'Inclua letras maiúsculas, números e símbolos'],
    };
  }

  let points = 0;
  const tips: string[] = [];

  if (pwd.length >= 8) points++;
  else tips.push('Use pelo menos 8 caracteres');

  if (pwd.length >= 12) points++;

  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) points++;
  else tips.push('Misture maiúsculas e minúsculas');

  if (/[0-9]/.test(pwd)) points++;
  else tips.push('Adicione números (0-9)');

  if (/[^A-Za-z0-9]/.test(pwd)) points++;
  else tips.push('Adicione símbolos especiais (!@#$%)');

  if (points <= 1) {
    return {
      score: 1,
      level: 'fraca',
      label: 'Fraca',
      color: 'text-rose-400',
      barColor: 'bg-rose-500',
      tips,
    };
  }

  if (points === 2 || points === 3) {
    return {
      score: 2,
      level: 'media',
      label: 'Média',
      color: 'text-amber-400',
      barColor: 'bg-amber-500',
      tips,
    };
  }

  if (points === 4) {
    return {
      score: 3,
      level: 'forte',
      label: 'Forte',
      color: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      tips,
    };
  }

  return {
    score: 4,
    level: 'excelente',
    label: 'Excelente (Blindada)',
    color: 'text-cyan-400',
    barColor: 'bg-cyan-500',
    tips: ['Senha altamente resistente a ataques de força bruta'],
  };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  showDetails = false,
}) => {
  const result = useMemo(() => evaluatePasswordStrength(password), [password]);

  return (
    <div className="w-full mt-2 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 flex items-center gap-1 font-medium">
          {result.score >= 3 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          )}
          Força da Senha:
        </span>
        <span className={`font-bold uppercase tracking-wider text-[11px] ${result.color}`}>
          {result.label}
        </span>
      </div>

      {/* Barras de progresso com 4 estágios */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => {
          const isActive = result.score >= step;
          return (
            <div
              key={step}
              className={`h-full rounded-full transition-all duration-300 ${
                isActive ? result.barColor : 'bg-slate-800'
              }`}
            />
          );
        })}
      </div>

      {showDetails && result.tips.length > 0 && (
        <div className="pt-1 text-[11px] text-slate-400 space-y-1">
          {result.tips.map((tip, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
