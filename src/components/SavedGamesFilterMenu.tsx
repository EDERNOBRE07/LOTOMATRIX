import React, { useState } from 'react';
import { GameTicket } from '../types/lotofacil';
import { PRIMOS } from '../data/lotofacilData';
import { ExpertTip } from './ExpertTip';
import {
  Filter,
  Sparkles,
  SlidersHorizontal,
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Layers,
  Zap,
} from 'lucide-react';

export type PrimosFilterOption = 'all' | 'fora_da_curva' | 'canonico';
export type SomaFilterOption = 'all' | 'fora_do_comum' | 'comum' | 'zona_ouro';

export interface SavedGamesFilterMenuProps {
  tickets: GameTicket[];
  selectedDezenas: number[];
  onToggleDezena: (num: number) => void;
  onClearDezenas: () => void;
  dezenaMatchMode: 'and' | 'or';
  onChangeDezenaMatchMode: (mode: 'and' | 'or') => void;
  primosFilter: PrimosFilterOption;
  onChangePrimosFilter: (option: PrimosFilterOption) => void;
  somaFilter: SomaFilterOption;
  onChangeSomaFilter: (option: SomaFilterOption) => void;
  totalFilteredCount: number;
  totalTicketsCount: number;
  onResetAllFilters: () => void;
  onSelectOnlyFiltered: () => void;
}

export const SavedGamesFilterMenu: React.FC<SavedGamesFilterMenuProps> = ({
  tickets,
  selectedDezenas,
  onToggleDezena,
  onClearDezenas,
  dezenaMatchMode,
  onChangeDezenaMatchMode,
  primosFilter,
  onChangePrimosFilter,
  somaFilter,
  onChangeSomaFilter,
  totalFilteredCount,
  totalTicketsCount,
  onResetAllFilters,
  onSelectOnlyFiltered,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const hasActiveFilters =
    selectedDezenas.length > 0 ||
    primosFilter !== 'all' ||
    somaFilter !== 'all';

  // Count tickets matching specific anomalies for telemetry
  const ticketsPrimosForaCurva = tickets.filter(
    (t) => t.primos < 4 || t.primos > 7
  ).length;

  const ticketsSomaForaComum = tickets.filter(
    (t) => t.soma < 175 || t.soma > 220
  ).length;

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Top Header of the Filter Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
              <span>Menu de Filtros Dinâmicos dos Bilhetes</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                {totalFilteredCount} de {totalTicketsCount} exibidos
              </span>
              <ExpertTip
                title="Triagem & Filtragem Pós-Geração"
                ruleCategory="Filtros Dinâmicos de Bilhetes"
                content="Permite inspecionar a matriz combinatória e isolar bilhetes específicos com dezenas chave ou identificar rapidamente jogos com anomalias estruturais."
                impact14Pontos="Jogos com primos fora da curva (<4 ou >7) e soma fora do comum (<175 ou >220) têm somados menos de 4,2% de chance matemática na Lotofácil. Isolar e desmarcar esses bilhetes na hora de apostar economiza até 25% do seu orçamento sem perder as chances reais de 14 e 15 pontos."
                recommendation="Use o filtro 'Fora da Curva' para auditar e, se desejar focar aposta estrita de alto valor esperado (EV+), desmarque os bilhetes com anomalias."
              />
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtre instantaneamente por dezenas obrigatórias, primos fora da curva (fora de 4-7) ou soma atípica (fora de 175-220).
            </p>
          </div>
        </div>

        {/* Action Controls & Minimize Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Limpar Filtros</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSelectOnlyFiltered}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition cursor-pointer"
            title="Marca para exportação apenas os jogos que atendem aos filtros ativos"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Marcar Filtrados ({totalFilteredCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? 'Recolher Menu' : 'Expandir Menu'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Filter Controls Body */}
      {isExpanded && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Seção 1: Filtro por Dezenas Específicas (Grade 1 a 25) */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Filtrar por Dezenas Contidas no Jogo:</span>
                {selectedDezenas.length > 0 && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold ml-1">
                    ({selectedDezenas.map((n) => n.toString().padStart(2, '0')).join(', ')})
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2 text-xs">
                {selectedDezenas.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[10px]">
                    <button
                      type="button"
                      onClick={() => onChangeDezenaMatchMode('and')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                        dezenaMatchMode === 'and'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      TODAS (E)
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeDezenaMatchMode('or')}
                      className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                        dezenaMatchMode === 'or'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      QUALQUER (OU)
                    </button>
                  </div>
                )}

                {selectedDezenas.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearDezenas}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar Dezenas</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chips de 1 a 25 */}
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
                const isSelected = selectedDezenas.includes(num);
                const isPrime = PRIMOS.includes(num);

                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onToggleDezena(num)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/25 ring-2 ring-emerald-300'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700'
                    }`}
                    title={`Filtrar jogos com dezena ${num}${isPrime ? ' (Primo)' : ''}`}
                  >
                    {num.toString().padStart(2, '0')}
                    {isPrime && !isSelected && (
                      <span className="w-1 h-1 rounded-full bg-purple-400 absolute top-1 right-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seção 2 e 3: Filtro de Primos & Filtro de Soma em Grid Duplo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
            {/* Filtro de Números Primos */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>Filtro de Números Primos:</span>
                </span>
                {ticketsPrimosForaCurva > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {ticketsPrimosForaCurva} fora da curva
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onChangePrimosFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    primosFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  Todos ({tickets.length})
                </button>

                <button
                  type="button"
                  onClick={() => onChangePrimosFilter('fora_da_curva')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    primosFilter === 'fora_da_curva'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-rose-400 hover:text-white bg-rose-950/20 border border-rose-500/30'
                  }`}
                  title="Filtra bilhetes com menos de 4 ou mais de 7 números primos"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Fora da Curva (&lt;4 ou &gt;7)</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({ticketsPrimosForaCurva})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangePrimosFilter('canonico')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    primosFilter === 'canonico'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                      : 'text-purple-300 hover:text-white bg-purple-950/20 border border-purple-500/30'
                  }`}
                  title="Filtra bilhetes com 4, 5, 6 ou 7 números primos (padrão de 91,3% dos sorteios)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Canônico (4 a 7 Primos)</span>
                </button>
              </div>
            </div>

            {/* Filtro de Intervalo da Soma */}
            <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>Filtro de Soma Total do Jogo:</span>
                </span>
                {ticketsSomaForaComum > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {ticketsSomaForaComum} fora do padrão
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onChangeSomaFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    somaFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  Todas ({tickets.length})
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSomaFilter('fora_do_comum')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    somaFilter === 'fora_do_comum'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                      : 'text-rose-400 hover:text-white bg-rose-950/20 border border-rose-500/30'
                  }`}
                  title="Filtra jogos com soma inferior a 175 ou superior a 220"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Fora do Comum (&lt;175 ou &gt;220)</span>
                  <span className="text-[10px] font-mono opacity-80">
                    ({ticketsSomaForaComum})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSomaFilter('comum')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    somaFilter === 'comum'
                      ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                      : 'text-teal-300 hover:text-white bg-teal-950/20 border border-teal-500/30'
                  }`}
                  title="Filtra jogos na faixa padrão de 175 a 220"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Comum (175–220)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSomaFilter('zona_ouro')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    somaFilter === 'zona_ouro'
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : 'text-amber-300 hover:text-white bg-amber-950/20 border border-amber-500/30'
                  }`}
                  title="Filtra jogos com soma estrita na Zona de Ouro (190 a 210)"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Zona de Ouro (190–210)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
