import React, { useState, useEffect } from 'react';
import {
  HybridAlertRule,
  getHybridAlertRules,
  saveHybridAlertRules,
  evaluateHybridRule,
  HybridEvaluationResult,
  fireBrowserPushNotification,
  DEFAULT_HYBRID_RULES,
} from '../services/notificationService';
import { LotofacilDraw, DezenaStats } from '../types/lotofacil';
import { soundService } from '../services/soundAlert';

interface RegrasAlertaHibridoProps {
  latestDraw: LotofacilDraw;
  statsList: DezenaStats[];
  cicloAusentes?: number[];
  onApplyDezenasToClosing?: (dezenas: number[]) => void;
}

export const RegrasAlertaHibridoComponent: React.FC<RegrasAlertaHibridoProps> = ({
  latestDraw,
  statsList,
  cicloAusentes = [17, 22],
  onApplyDezenasToClosing,
}) => {
  const [rules, setRules] = useState<HybridAlertRule[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, HybridEvaluationResult>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form State for new/edit rule
  const [formNome, setFormNome] = useState('');
  const [formOperador, setFormOperador] = useState<'E' | 'OU'>('E');
  const [formRadarAtivo, setFormRadarAtivo] = useState(true);
  const [formRadarCriterio, setFormRadarCriterio] = useState<'forca_minima' | 'probabilidade_minima' | 'top3'>('forca_minima');
  const [formRadarValor, setFormRadarValor] = useState(70);
  const [formAtrasoAtivo, setFormAtrasoAtivo] = useState(true);
  const [formAtrasoCriterio, setFormAtrasoCriterio] = useState<'atraso_minimo' | 'atraso_maior_medio' | 'pendente_ciclo'>('atraso_minimo');
  const [formAtrasoValor, setFormAtrasoValor] = useState(2);
  const [formDezenas, setFormDezenas] = useState<number[]>([17, 22]);

  // Load rules on mount
  useEffect(() => {
    const loaded = getHybridAlertRules();
    setRules(loaded);
  }, []);

  // Recalculate evaluations whenever rules or draw changes
  useEffect(() => {
    const newEvals: Record<string, HybridEvaluationResult> = {};
    rules.forEach((rule) => {
      newEvals[rule.id] = evaluateHybridRule(rule, latestDraw, statsList, cicloAusentes);
    });
    setEvaluations(newEvals);
  }, [rules, latestDraw, statsList, cicloAusentes]);

  // Toggle rule active status
  const toggleRuleActive = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, ativa: !r.ativa } : r));
    setRules(updated);
    saveHybridAlertRules(updated);
  };

  // Delete rule
  const deleteRule = (id: string) => {
    if (confirm('Deseja excluir esta Regra de Alerta Híbrido?')) {
      const updated = rules.filter((r) => r.id !== id);
      setRules(updated);
      saveHybridAlertRules(updated);
    }
  };

  // Reset to default rules
  const handleResetDefaults = () => {
    if (confirm('Restaurar as regras de alerta híbrido padrão?')) {
      setRules(DEFAULT_HYBRID_RULES);
      saveHybridAlertRules(DEFAULT_HYBRID_RULES);
    }
  };

  // Open edit modal/form
  const handleEditRule = (rule: HybridAlertRule) => {
    setEditingRuleId(rule.id);
    setFormNome(rule.nome);
    setFormOperador(rule.operador);
    setFormRadarAtivo(rule.radarAtivo);
    setFormRadarCriterio(rule.radarCriterio);
    setFormRadarValor(rule.radarValor);
    setFormAtrasoAtivo(rule.atrasoAtivo);
    setFormAtrasoCriterio(rule.atrasoCriterio);
    setFormAtrasoValor(rule.atrasoValor);
    setFormDezenas(rule.dezenasMonitoradas);
    setIsCreating(true);
  };

  // Save new or edited rule
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNome.trim()) {
      alert('Informe um nome para a Regra de Alerta.');
      return;
    }
    if (formDezenas.length === 0) {
      alert('Selecione pelo menos 1 dezena no conjunto monitorado.');
      return;
    }

    if (editingRuleId) {
      const updated = rules.map((r) =>
        r.id === editingRuleId
          ? {
              ...r,
              nome: formNome,
              operador: formOperador,
              radarAtivo: formRadarAtivo,
              radarCriterio: formRadarCriterio,
              radarValor: formRadarValor,
              atrasoAtivo: formAtrasoAtivo,
              atrasoCriterio: formAtrasoCriterio,
              atrasoValor: formAtrasoValor,
              dezenasMonitoradas: [...formDezenas].sort((a, b) => a - b),
            }
          : r
      );
      setRules(updated);
      saveHybridAlertRules(updated);
    } else {
      const newRule: HybridAlertRule = {
        id: `hibrido-${Date.now()}`,
        nome: formNome,
        ativa: true,
        operador: formOperador,
        radarAtivo: formRadarAtivo,
        radarCriterio: formRadarCriterio,
        radarValor: formRadarValor,
        atrasoAtivo: formAtrasoAtivo,
        atrasoCriterio: formAtrasoCriterio,
        atrasoValor: formAtrasoValor,
        dezenasMonitoradas: [...formDezenas].sort((a, b) => a - b),
        criadoEm: Date.now(),
      };
      const updated = [newRule, ...rules];
      setRules(updated);
      saveHybridAlertRules(updated);
    }

    // Reset form
    setIsCreating(false);
    setEditingRuleId(null);
    setFormNome('');
    setFormDezenas([17, 22]);
  };

  // Toggle dezena in form selection
  const toggleFormDezena = (num: number) => {
    setFormDezenas((prev) =>
      prev.includes(num) ? prev.filter((d) => d !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  // Test firing a rule notification
  const handleTestTrigger = (rule: HybridAlertRule) => {
    const evalResult = evaluations[rule.id] || evaluateHybridRule(rule, latestDraw, statsList, cicloAusentes);
    const activeDezenas = evalResult.dezenasGatilho.length > 0 ? evalResult.dezenasGatilho : rule.dezenasMonitoradas;
    const dezStr = activeDezenas.map((d) => d.toString().padStart(2, '0')).join(', ');
    
    soundService.playGoldenZoneSuccessChime();
    fireBrowserPushNotification(
      `⚡ [TESTE] Alerta Híbrido: ${rule.nome}`,
      `Condição '${rule.operador}' testada com sucesso para dezenas [${dezStr}] no Concurso #${latestDraw.concurso}.`
    );
    alert(`Disparo simulado com sucesso!\nRegra: ${rule.nome}\nCondição: ${rule.operador}\nDezenas: [${dezStr}]`);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-cyan-500/30 p-5 md:p-7 shadow-2xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <h3 className="text-xl font-black text-white tracking-wide">
              Regras de Alerta Híbrido
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-700/50">
              Lógica E / OU
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Cruze o algoritmo do <span className="text-amber-400 font-semibold">Radar de Tendências Quentes</span> com os <span className="text-rose-400 font-semibold">Atrasos Críticos</span> e notifique apenas quando as condições forem atendidas no seu conjunto de dezenas.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setEditingRuleId(null);
              setFormNome('');
              setFormOperador('E');
              setFormRadarAtivo(true);
              setFormRadarCriterio('forca_minima');
              setFormRadarValor(70);
              setFormAtrasoAtivo(true);
              setFormAtrasoCriterio('atraso_minimo');
              setFormAtrasoValor(2);
              setFormDezenas([17, 22]);
              setIsCreating(!isCreating);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCreating ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
            {isCreating ? 'Cancelar' : 'Nova Regra Híbrida'}
          </button>
          <button
            onClick={handleResetDefaults}
            title="Restaurar regras padrão"
            className="px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            Restaurar
          </button>
        </div>
      </div>

      {/* Creation / Edit Form Card */}
      {isCreating && (
        <form
          onSubmit={handleSaveForm}
          className="bg-slate-950/90 rounded-xl border-2 border-cyan-500/50 p-5 mb-6 space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-base font-bold text-cyan-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              {editingRuleId ? 'Editar Regra de Alerta Híbrido' : 'Criar Nova Regra de Alerta Híbrido'}
            </h4>
            <span className="text-xs text-slate-400">
              Concurso Base: <strong className="text-white">#{latestDraw.concurso}</strong>
            </span>
          </div>

          {/* Nome da Regra */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nome da Regra
            </label>
            <input
              type="text"
              value={formNome}
              onChange={(e) => setFormNome(e.target.value)}
              placeholder="Ex: Retorno Iminente no Ciclo com Força EMA Alta"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          {/* Operador Lógico E / OU */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Operador Lógico de Combinação
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormOperador('E')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  formOperador === 'E'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-base font-black tracking-wider">OPERADOR 'E' (AND)</span>
                <span className="text-xs mt-1 text-slate-300">
                  Ambas as condições (Radar <span className="text-cyan-400 font-bold">E</span> Atraso) devem ser verdadeiras simultaneamente
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFormOperador('OU')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  formOperador === 'OU'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md shadow-purple-500/10'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-base font-black tracking-wider">OPERADOR 'OU' (OR)</span>
                <span className="text-xs mt-1 text-slate-300">
                  Dispara se <span className="text-purple-400 font-bold">QUALQUER UMA</span> das condições for satisfeita
                </span>
              </button>
            </div>
          </div>

          {/* Bloco Condição 1: Radar de Tendências Quentes */}
          <div className={`p-4 rounded-xl border transition-all ${
            formRadarAtivo ? 'bg-amber-950/20 border-amber-500/40' : 'bg-slate-900/50 border-slate-800 opacity-60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRadarAtivo}
                  onChange={(e) => setFormRadarAtivo(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700 w-4 h-4"
                />
                <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  🔥 Condição 1: Radar de Tendências Quentes (EMA)
                </span>
              </label>
              <span className="text-xs text-amber-400/80 font-mono">Média Móvel Exponencial</span>
            </div>

            {formRadarAtivo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Critério do Radar
                  </label>
                  <select
                    value={formRadarCriterio}
                    onChange={(e) => setFormRadarCriterio(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="forca_minima">Força EMA Mínima (1 a 100)</option>
                    <option value="probabilidade_minima">Probabilidade Mínima nos Próx. 5 Concursos (%)</option>
                    <option value="top3">Estar no Top 3 do Radar Quente</option>
                  </select>
                </div>

                {formRadarCriterio !== 'top3' && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>{formRadarCriterio === 'forca_minima' ? 'Força Mínima:' : 'Probabilidade Mínima:'}</span>
                      <strong className="text-amber-400 font-mono text-sm">{formRadarValor}%</strong>
                    </div>
                    <input
                      type="range"
                      min={formRadarCriterio === 'forca_minima' ? 40 : 50}
                      max={98}
                      value={formRadarValor}
                      onChange={(e) => setFormRadarValor(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>Moderado (50%)</span>
                      <span>Crítico (80%)</span>
                      <span>Extremo (95%)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bloco Condição 2: Atrasos Críticos */}
          <div className={`p-4 rounded-xl border transition-all ${
            formAtrasoAtivo ? 'bg-rose-950/20 border-rose-500/40' : 'bg-slate-900/50 border-slate-800 opacity-60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAtrasoAtivo}
                  onChange={(e) => setFormAtrasoAtivo(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-500 bg-slate-900 border-slate-700 w-4 h-4"
                />
                <span className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
                  ⏱️ Condição 2: Estado de Atrasos Críticos
                </span>
              </label>
              <span className="text-xs text-rose-400/80 font-mono">Discrepância Estatística</span>
            </div>

            {formAtrasoAtivo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Critério de Atraso
                  </label>
                  <select
                    value={formAtrasoCriterio}
                    onChange={(e) => setFormAtrasoCriterio(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="atraso_minimo">Atraso Mínimo (N concursos seguidos)</option>
                    <option value="atraso_maior_medio">Atraso Superior à Média Histórica da Dezena</option>
                    <option value="pendente_ciclo">Pendente no Ciclo Atual (Falta sair)</option>
                  </select>
                </div>

                {formAtrasoCriterio === 'atraso_minimo' && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Atraso Consecutivo Mínimo:</span>
                      <strong className="text-rose-400 font-mono text-sm">{formAtrasoValor} concursos</strong>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={formAtrasoValor}
                      onChange={(e) => setFormAtrasoValor(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>1 conc.</span>
                      <span>3 conc. (Alerta)</span>
                      <span>5+ conc. (Crítico)</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conjunto de Dezenas Monitoradas pelo Usuário */}
          <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <label className="block text-xs font-bold text-slate-200">
                  Conjunto de Dezenas Monitoradas ({formDezenas.length}/25 selecionadas)
                </label>
                <p className="text-[11px] text-slate-400">
                  O alerta só será acionado se as dezenas atingirem os critérios dentro deste grupo.
                </p>
              </div>

              {/* Botões rápidos de preset */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormDezenas(Array.from({ length: 25 }, (_, i) => i + 1))}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300"
                >
                  Todas (25)
                </button>
                <button
                  type="button"
                  onClick={() => setFormDezenas(cicloAusentes)}
                  className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 text-[11px] font-medium text-amber-300 border border-amber-700/50"
                >
                  Ciclo [{cicloAusentes.join(', ')}]
                </button>
                <button
                  type="button"
                  onClick={() => setFormDezenas([11, 20, 1, 3])}
                  className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-[11px] font-medium text-cyan-300 border border-cyan-700/50"
                >
                  Pares de Ouro
                </button>
                <button
                  type="button"
                  onClick={() => setFormDezenas([])}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/50 text-[11px] font-medium text-slate-400 hover:text-rose-300"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Grid 5x5 Volante */}
            <div className="grid grid-cols-5 gap-2 max-w-sm mx-auto sm:mx-0">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
                const isSelected = formDezenas.includes(num);
                const isCicloPending = cicloAusentes.includes(num);
                const pad = num.toString().padStart(2, '0');
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleFormDezena(num)}
                    className={`h-10 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center relative ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/30 scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{pad}</span>
                    {isCicloPending && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1 right-1" title="Pendente de Ciclo" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Botões de Ação do Form */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingRuleId(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 transition-all"
            >
              {editingRuleId ? 'Salvar Alterações' : 'Criar Regra Híbrida'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Regras Configuradas */}
      <div className="space-y-4">
        {rules.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-400 text-sm">Nenhuma regra de alerta híbrido configurada.</p>
            <button
              onClick={handleResetDefaults}
              className="mt-3 text-cyan-400 hover:underline text-xs font-semibold"
            >
              Carregar regras recomendadas
            </button>
          </div>
        ) : (
          rules.map((rule) => {
            const evalResult = evaluations[rule.id];
            const isFired = evalResult && evalResult.matched;
            const dezenasGatilho = evalResult ? evalResult.dezenasGatilho : [];

            return (
              <div
                key={rule.id}
                className={`p-4 md:p-5 rounded-xl border transition-all ${
                  isFired
                    ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                    : rule.ativa
                    ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                        rule.operador === 'E'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      }`}>
                        Operador '{rule.operador}'
                      </span>

                      <h4 className="text-base font-bold text-white tracking-wide">
                        {rule.nome}
                      </h4>

                      {isFired && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          GATILHO ATIVO ({dezenasGatilho.length} dezenas)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1">
                      {rule.radarAtivo && (
                        <span className="flex items-center gap-1 text-amber-300/90">
                          🔥 Radar: {rule.radarCriterio === 'forca_minima' && `Força ≥ ${rule.radarValor}%`}
                          {rule.radarCriterio === 'probabilidade_minima' && `Prob. ≥ ${rule.radarValor}%`}
                          {rule.radarCriterio === 'top3' && 'Top 3 do Radar'}
                        </span>
                      )}

                      <span className="text-slate-600 font-bold">{rule.operador}</span>

                      {rule.atrasoAtivo && (
                        <span className="flex items-center gap-1 text-rose-300/90">
                          ⏱️ Atraso: {rule.atrasoCriterio === 'atraso_minimo' && `Atraso ≥ ${rule.atrasoValor} conc.`}
                          {rule.atrasoCriterio === 'atraso_maior_medio' && 'Superior à média'}
                          {rule.atrasoCriterio === 'pendente_ciclo' && 'Pendente de Ciclo'}
                        </span>
                      )}

                      <span className="text-slate-500">
                        • Monitorando: <strong className="text-slate-300">{rule.dezenasMonitoradas.length} dezenas</strong>
                      </span>
                    </div>
                  </div>

                  {/* Ações da Regra */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={() => handleTestTrigger(rule)}
                      title="Simular disparo de alerta"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      Testar
                    </button>

                    <button
                      onClick={() => handleEditRule(rule)}
                      title="Editar regra"
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => toggleRuleActive(rule.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        rule.ativa
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {rule.ativa ? 'Ativa' : 'Pausada'}
                    </button>

                    <button
                      onClick={() => deleteRule(rule.id)}
                      title="Excluir regra"
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Dezenas que atenderam ao critério no concurso atual */}
                {isFired && dezenasGatilho.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-emerald-400">
                        Dezenas que cumprem a condição ({rule.operador}):
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {dezenasGatilho.map((d) => (
                          <span
                            key={d}
                            className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm shadow-emerald-500/50"
                          >
                            {d.toString().padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {onApplyDezenasToClosing && (
                      <button
                        onClick={() => onApplyDezenasToClosing(dezenasGatilho)}
                        className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-2 flex items-center gap-1"
                      >
                        Aplicar {dezenasGatilho.length} dezenas como Fixas no Fechamento →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Guia Informativo */}
      <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Alertas híbridos utilizam Web Push Notifications e Chimes sonoros dedicados ao disparar.
        </span>
        <span className="text-slate-500">Concurso mais recente analisado: #{latestDraw.concurso}</span>
      </div>
    </div>
  );
};
