import { calcularParametrosConcurso, ParametrosConcurso } from '../utils/lotofacilStats';
import { dezenasParaBitmask } from '../utils/lotofacilEngine';

export interface ConfigFechamentoFixas {
  dezenasFixas: number[];        // 1 a 6 dezenas fixas
  dezenasVariaveis: number[];    // Restante do pool (ex: 16 ou 17 variáveis para pool de 20/21)
  garantiaTotal: 13 | 14;        // Garantia desejada no bilhete de 15 dezenas
  ultimoConcurso: number[];      // Para cálculo de repetidas e peso Padrão Ouro
  coberturaAlvoPercent?: number; // Ex: 95 (95% dos cenários ponderados)
  maxBilhetes?: number;          // Trava de orçamento (ex: 30 jogos)
  onProgress?: (percent: number) => void;
}

export interface BilheteComFixas {
  dezenas: number[];             // 15 dezenas completas (fixas + variáveis)
  fixas: number[];
  variaveis: number[];
  analise: ParametrosConcurso;
}

export interface ResultadoFechamentoFixas {
  bilhetes: BilheteComFixas[];
  coberturaPonderadaPercent: number;
  coberturaOuroPercent: number;
  totalPool: number;
  garantiaCondicao: string;
}

function contarBits(n: number): number {
  let c = 0;
  while (n > 0) {
    n &= n - 1;
    c++;
  }
  return c;
}

function gerarCombinacoes(arr: number[], k: number, limite = 20000): number[][] {
  const resultado: number[][] = [];
  const atual: number[] = [];

  // Se o espaço combinatório for muito grande, usa amostragem estratificada aleatória
  const estimativa = estimarCombinacoes(arr.length, k);
  if (estimativa > limite) {
    const vistos = new Set<number>();
    let tentativas = 0;
    while (resultado.length < limite && tentativas < limite * 4) {
      tentativas++;
      const copia = [...arr];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      const combo = copia.slice(0, k).sort((a, b) => a - b);
      const mask = dezenasParaBitmask(combo);
      if (!vistos.has(mask)) {
        vistos.add(mask);
        resultado.push(combo);
      }
    }
    return resultado;
  }

  function backtrack(inicio: number) {
    if (atual.length === k) {
      resultado.push([...atual]);
      return;
    }
    for (let i = inicio; i <= arr.length - (k - atual.length); i++) {
      atual.push(arr[i]);
      backtrack(i + 1);
      atual.pop();
    }
  }

  backtrack(0);
  return resultado;
}

function estimarCombinacoes(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let res = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) {
    res = (res * (n - i + 1)) / i;
  }
  return Math.round(res);
}

export async function gerarFechamentoComFixasAsync(
  config: ConfigFechamentoFixas
): Promise<ResultadoFechamentoFixas> {
  const {
    dezenasFixas,
    dezenasVariaveis,
    garantiaTotal,
    ultimoConcurso,
    coberturaAlvoPercent = 95,
    maxBilhetes = 40,
    onProgress,
  } = config;

  const fixas = [...new Set(dezenasFixas)].sort((a, b) => a - b);
  const variaveis = [...new Set(dezenasVariaveis)]
    .filter((d) => !fixas.includes(d))
    .sort((a, b) => a - b);

  const qtdVarPorBilhete = 15 - fixas.length;
  const garantiaVariaveis = garantiaTotal - fixas.length;

  if (fixas.length < 1 || fixas.length > 8) {
    throw new Error('Escolha entre 1 e 8 dezenas fixas.');
  }
  if (variaveis.length < qtdVarPorBilhete) {
    throw new Error(`Selecione pelo menos ${qtdVarPorBilhete} dezenas variáveis.`);
  }

  // 1. Gera o universo reduzido apenas nas variáveis
  const combosVariaveis = gerarCombinacoes(variaveis, qtdVarPorBilhete, 18000);

  interface ItemUniverso {
    vars: number[];
    full: number[];
    maskVar: number;
    peso: number;
    isOuro: boolean;
    coberto: boolean;
    analise: ParametrosConcurso;
  }

  const universo: ItemUniverso[] = [];
  let pesoTotal = 0;
  let totalOuro = 0;

  // 2. Avalia cada bilhete completo (fixas + variáveis) com lotofacilStats.ts
  for (let i = 0; i < combosVariaveis.length; i++) {
    if (i % 1500 === 0) {
      await new Promise((r) => setTimeout(r, 0));
      onProgress?.(Math.min(35, Math.round((i / combosVariaveis.length) * 35)));
    }

    const vars = combosVariaveis[i];
    const full = [...fixas, ...vars].sort((a, b) => a - b);
    const analise = calcularParametrosConcurso(full, ultimoConcurso);

    let peso = 0;
    const cls = analise.resumo.classificacao;
    if (cls === 'Padrão Ouro') peso = 10;
    else if (cls === 'Dentro da Média') peso = 5;
    else if (cls === 'Atípico') peso = 1;

    if (peso > 0) {
      const isOuro = cls === 'Padrão Ouro';
      universo.push({
        vars,
        full,
        maskVar: dezenasParaBitmask(vars),
        peso,
        isOuro,
        coberto: false,
        analise,
      });
      pesoTotal += peso;
      if (isOuro) totalOuro++;
    }
  }

  // Fallback se o filtro zerar tudo (ex: fixas muito desbalanceadas)
  if (universo.length === 0) {
    throw new Error('As dezenas fixas escolhidas geraram 0 combinações dentro dos padrões mínimos.');
  }

  // Pool de candidatos priorizando bilhetes Padrão Ouro
  const candidatos = universo.filter((u) => u.isOuro);
  const poolCandidatos = candidatos.length >= 20 ? candidatos : universo;

  const bilhetesSelecionados: BilheteComFixas[] = [];
  let pesoCoberto = 0;
  let ouroCoberto = 0;

  // 3. Greedy Weighted Set Cover sobre a matriz reduzida
  while (bilhetesSelecionados.length < maxBilhetes) {
    const pctAtual = (pesoCoberto / pesoTotal) * 100;
    if (pctAtual >= coberturaAlvoPercent) break;

    let melhorCandidato: ItemUniverso | null = null;
    let melhorGanho = -1;

    // Amostra de candidatos para manter velocidade instantânea no navegador
    const passo = Math.max(1, Math.floor(poolCandidatos.length / 400));
    for (let i = 0; i < poolCandidatos.length; i += passo) {
      const cand = poolCandidatos[i];
      let ganho = 0;

      for (let j = 0; j < universo.length; j++) {
        const alvo = universo[j];
        if (!alvo.coberto && contarBits(cand.maskVar & alvo.maskVar) >= garantiaVariaveis) {
          ganho += alvo.peso;
        }
      }

      if (ganho > melhorGanho) {
        melhorGanho = ganho;
        melhorCandidato = cand;
      }
    }

    if (!melhorCandidato || melhorGanho <= 0) break;

    // Marca cobertos pelo melhor bilhete
    for (let j = 0; j < universo.length; j++) {
      const alvo = universo[j];
      if (!alvo.coberto && contarBits(melhorCandidato.maskVar & alvo.maskVar) >= garantiaVariaveis) {
        alvo.coberto = true;
        pesoCoberto += alvo.peso;
        if (alvo.isOuro) ouroCoberto++;
      }
    }

    bilhetesSelecionados.push({
      dezenas: melhorCandidato.full,
      fixas,
      variaveis: melhorCandidato.vars,
      analise: melhorCandidato.analise,
    });

    await new Promise((r) => setTimeout(r, 0));
    const progCobertura = Math.min(100, Math.round((pesoCoberto / pesoTotal) * 100));
    onProgress?.(35 + Math.round(progCobertura * 0.65));
  }

  onProgress?.(100);

  return {
    bilhetes: bilhetesSelecionados,
    coberturaPonderadaPercent: Number(((pesoCoberto / pesoTotal) * 100).toFixed(1)),
    coberturaOuroPercent: totalOuro > 0 ? Number(((ouroCoberto / totalOuro) * 100).toFixed(1)) : 0,
    totalPool: fixas.length + variaveis.length,
    garantiaCondicao: `Acertando as ${fixas.length} fixas + ${qtdVarPorBilhete} dezenas entre as ${variaveis.length} variáveis = garantia de ${garantiaTotal} pontos`,
  };
}
