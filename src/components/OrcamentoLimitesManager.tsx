import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  PieChart,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Save,
  RotateCcw,
  Sparkles,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { soundService } from '../services/soundAlert';

export interface OrcamentoConfig {
  custoPorAposta: number; // ex: 3.50
  limitePorFechamento: number; // ex: 84.00
  orcamentoMensal: number; // ex: 350.00
  notificarAoExceder: boolean;
}

const STORAGE_KEY = 'lotosniper_orcamento_config';

export const DEFAULT_ORCAMENTO_CONFIG: OrcamentoConfig = {
  custoPorAposta: 3.5,
  limitePorFechamento: 84.0,
  orcamentoMensal: 350.0,
  notificarAoExceder: true,
};

export function getOrcamentoConfig(): OrcamentoConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ORCAMENTO_CONFIG;
    return { ...DEFAULT_ORCAMENTO_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ORCAMENTO_CONFIG;
  }
}

export function saveOrcamentoConfig(config: OrcamentoConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lotosniper-orcamento-updated', { detail: config }));
    }
  } catch {}
}

export const OrcamentoLimitesManager: React.FC = () => {
  const [config, setConfig] = useState<OrcamentoConfig>(() => getOrcamentoConfig());
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Projeções matemáticas com base nos parâmetros
  const CONCURSOS_POR_MES = 25; // Média da Lotofácil (segunda a sábado, ~25 sorteios mensais)
  const CONCURSOS_POR_SEMANA = 6;

  const totalApostasMes = Math.floor(config.orcamentoMensal / (config.custoPorAposta || 3.5));
  const apostasPorConcurso = Math.floor(totalApostasMes / CONCURSOS_POR_MES);
  const gastoPorConcurso = apostasPorConcurso * config.custoPorAposta;
  const fechamentosMaxPorMes = Math.floor(config.orcamentoMensal / (config.limitePorFechamento || 84.0));
  const saldoResidualMes = config.orcamentoMensal - totalApostasMes * config.custoPorAposta;

  const handleSave = (newConfig: OrcamentoConfig) => {
    setConfig(newConfig);
    saveOrcamentoConfig(newConfig);
    try {
      soundService.playSuccess();
    } catch {}
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };


  const handleResetDefaults = () => {
    handleSave(DEFAULT_ORCAMENTO_CONFIG);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Configurador de Limites & Simulador de Orçamento</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Gestão de Banca
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Defina seu teto financeiro mensal e limite por fechamento. O LotoSniper audita e bloqueia estouros de orçamento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Limites Atualizados!</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Padrão</span>
          </button>
        </div>
      </div>

      {/* Formulário de Configuração de Limites */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Custo por Aposta */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Custo por Aposta Simples (15 Dezenas)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              R$
            </span>
            <input
              type="number"
              step="0.50"
              min="1.00"
              max="20.00"
              value={config.custoPorAposta}
              onChange={(e) =>
                handleSave({ ...config, custoPorAposta: parseFloat(e.target.value) || 3.5 })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm font-mono font-bold text-white focus:border-amber-400 focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Valor oficial Caixa: R$ 3,50
          </span>
        </div>

        {/* 2. Limite Máximo por Fechamento Individual */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Limite Máximo por Fechamento Único
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              R$
            </span>
            <input
              type="number"
              step="10.00"
              min="10.00"
              max="1000.00"
              value={config.limitePorFechamento}
              onChange={(e) =>
                handleSave({ ...config, limitePorFechamento: parseFloat(e.target.value) || 84.0 })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm font-mono font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Ex: R$ 84,00 (24 jogos da Matriz 18)
          </span>
        </div>

        {/* 3. Orçamento Mensal Disponível */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Orçamento Mensal Total para Loterias
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
              R$
            </span>
            <input
              type="number"
              step="50.00"
              min="50.00"
              max="5000.00"
              value={config.orcamentoMensal}
              onChange={(e) =>
                handleSave({ ...config, orcamentoMensal: parseFloat(e.target.value) || 350.0 })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm font-mono font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-slate-500 block">
            Teto seguro para não comprometer sua renda
          </span>
        </div>
      </div>

      {/* Projeção do Simulador de Orçamento Mensal */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 rounded-xl border border-amber-500/30 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <TrendingUp className="w-4 h-4" />
          <span>Projeção de Sustentabilidade Mensal (25 Concursos Oficiais)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-center">
          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Apostas Ativas/Mês</span>
            <strong className="text-base sm:text-lg font-black text-white">{totalApostasMes} jogos</strong>
            <span className="text-[10px] text-emerald-400 block">100% no orçamento</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Jogos por Concurso</span>
            <strong className="text-base sm:text-lg font-black text-amber-300">
              ~{apostasPorConcurso} jogos
            </strong>
            <span className="text-[10px] text-slate-400 block">
              R$ {gastoPorConcurso.toFixed(2).replace('.', ',')} / sorteio
            </span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Fechamentos Completos</span>
            <strong className="text-base sm:text-lg font-black text-cyan-300">
              {fechamentosMaxPorMes} matrizes
            </strong>
            <span className="text-[10px] text-slate-400 block">
              de até R$ {config.limitePorFechamento.toFixed(2).replace('.', ',')}
            </span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Saldo Reserva</span>
            <strong className="text-base sm:text-lg font-black text-emerald-400">
              R$ {saldoResidualMes.toFixed(2).replace('.', ',')}
            </strong>
            <span className="text-[10px] text-slate-400 block">Sobra após projeção</span>
          </div>
        </div>

        {/* Notificação e Alerta Ativo */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Avisar na tela de Fechamento se a quantidade de jogos ultrapassar o limite</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.notificarAoExceder}
              onChange={(e) => handleSave({ ...config, notificarAoExceder: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>
    </div>
  );
};
