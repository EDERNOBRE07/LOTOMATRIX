import {
  validateFilters,
  generateFechamentoCovering,
  DEFAULT_FILTERS,
} from './combinatorics';
import { FilterCriteria, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL } from '../data/lotofacilData';

export interface TestAssertionResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Suite de Testes de Asserção Combinatória & Validação de Filtros
 * Executa verificações determinísticas com asserções estritas garantindo
 * conformidade de 100% dos bilhetes gerados pelo motor do LotoSniper.
 */
export function runCombinatoricsValidationAssertions(): {
  total: number;
  passedCount: number;
  failedCount: number;
  results: TestAssertionResult[];
} {
  const results: TestAssertionResult[] = [];

  function record(name: string, passed: boolean, message: string, details?: any) {
    console.assert(passed, `[TEST FAIL] ${name}: ${message}`, details);
    if (passed) {
      console.log(`%c[TEST PASS] ${name}: ${message}`, 'color: #10b981; font-weight: bold;');
    } else {
      console.error(`[TEST FAIL] ${name}: ${message}`, details);
    }
    results.push({ name, passed, message, details });
  }

  // 1. Caso de Teste: Combinação Canônica Válida
  try {
    const validCombo = [1, 2, 3, 5, 8, 9, 10, 11, 13, 14, 15, 18, 20, 23, 25];
    const res = validateFilters(validCombo, DEFAULT_FILTERS, CONCURSO_ATUAL.dezenas);
    record(
      'Combinação Canônica Equilibrada',
      res.isValid === true,
      `Combinação balanceada aprovada com sucesso. Métricas: Soma ${res.metrics.soma}, ${res.metrics.pares}P/${res.metrics.impares}I, ${res.metrics.primos} Primos, ${res.metrics.cruz} Cruz.`
    );
  } catch (err: any) {
    record('Combinação Canônica Equilibrada', false, `Exceção inesperada: ${err.message}`);
  }

  // 2. Caso de Teste: Violação de Soma (Sobre-restrição ou valor fora de faixa)
  try {
    const lowSumCombo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]; // Soma = 120
    const filterConfig: FilterCriteria = { ...DEFAULT_FILTERS, somaMin: 185, somaMax: 215 };
    const res = validateFilters(lowSumCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const hasSomaViolation = res.violations.some((v) => v.includes('Soma'));
    record(
      'Validação de Soma Fora da Faixa',
      res.isValid === false && hasSomaViolation,
      `Combinação com soma ${res.metrics.soma} corretamente rejeitada (esperado 185-215).`
    );
  } catch (err: any) {
    record('Validação de Soma Fora da Faixa', false, `Exceção: ${err.message}`);
  }

  // 3. Caso de Teste: Violação de Cruz da Lotofácil (< 4 ou > 7 dezenas)
  try {
    // Apenas dezenas fora da Cruz (Cruz: 3, 8, 11, 12, 13, 14, 15, 18, 23)
    const noCruzCombo = [1, 2, 4, 5, 6, 7, 9, 10, 16, 17, 19, 20, 21, 22, 24]; // 0 na Cruz
    const filterConfig: FilterCriteria = { ...DEFAULT_FILTERS, cruzAtiva: true, cruzMin: 4, cruzMax: 7 };
    const res = validateFilters(noCruzCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const hasCruzViolation = res.violations.some((v) => v.includes('Cruz'));
    record(
      'Validação da Cruz da Lotofácil',
      res.isValid === false && hasCruzViolation,
      `Combinação com 0 dezenas na Cruz devidamente podada pelo validador.`
    );
  } catch (err: any) {
    record('Validação da Cruz da Lotofácil', false, `Exceção: ${err.message}`);
  }

  // 4. Caso de Teste: Violação de Bolas Extremas (Bola 1 > 4 ou Bola 15 < 22)
  try {
    const badEndsCombo = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21]; // B1 = 5, B15 = 21
    const filterConfig: FilterCriteria = {
      ...DEFAULT_FILTERS,
      extremidadesAtiva: true,
      bola1Min: 1,
      bola1Max: 4,
      bola15Min: 22,
      bola15Max: 25,
    };
    const res = validateFilters(badEndsCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const hasB1 = res.violations.some((v) => v.includes('Bola 1'));
    const hasB15 = res.violations.some((v) => v.includes('Bola 15'));
    record(
      'Validação de Bolas Extremas',
      res.isValid === false && hasB1 && hasB15,
      `Combinação iniciando em 05 e terminando em 21 corretamente detectada como Fora do Padrão.`
    );
  } catch (err: any) {
    record('Validação de Bolas Extremas', false, `Exceção: ${err.message}`);
  }

  // 5. Caso de Teste: Violação de Padrão Viciado (5 dezenas na mesma linha)
  try {
    const lineCombo = [1, 2, 3, 4, 5, 8, 10, 11, 13, 14, 17, 18, 20, 22, 24]; // Linha 1 cheia
    const filterConfig: FilterCriteria = { ...DEFAULT_FILTERS, antiPadraoViciadoAtivo: true };
    const res = validateFilters(lineCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const hasVicious = res.violations.some((v) => v.includes('viciado') || v.includes('linha'));
    record(
      'Auditoria Anti-Padrão Viciado',
      res.isValid === false && hasVicious,
      `Combinação com linha 1 inteira marcada (1, 2, 3, 4, 5) rejeitada com sucesso.`
    );
  } catch (err: any) {
    record('Auditoria Anti-Padrão Viciado', false, `Exceção: ${err.message}`);
  }

  // 6. Caso de Teste: Geração de Fechamento com 100% de Conformidade Estrita
  try {
    const testPool18 = [1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 20, 21, 23, 25];
    const strictFilters: FilterCriteria = {
      ...DEFAULT_FILTERS,
      somaMin: 185,
      somaMax: 215,
      paresMin: 5,
      paresMax: 9,
      primosMin: 4,
      primosMax: 7,
      molduraMin: 8,
      molduraMax: 11,
      cruzAtiva: true,
      cruzMin: 4,
      cruzMax: 7,
      extremidadesAtiva: true,
      bola1Min: 1,
      bola1Max: 4,
      bola15Min: 22,
      bola15Max: 25,
    };

    const tickets: GameTicket[] = generateFechamentoCovering(
      testPool18,
      14,
      8,
      strictFilters,
      CONCURSO_ATUAL.dezenas
    );

    const allPassed = tickets.every((t) => validateFilters(t, strictFilters, CONCURSO_ATUAL.dezenas).isValid);
    record(
      'Conformidade Estrita da Matriz Gerada',
      tickets.length > 0 && allPassed,
      `Todos os ${tickets.length} bilhetes gerados pela matriz atendem 100% dos filtros ativos.`
    );
  } catch (err: any) {
    record('Conformidade Estrita da Matriz Gerada', false, `Exceção: ${err.message}`);
  }

  // 7. Caso de Teste: Tratamento de Sobre-Restrição Excessiva
  try {
    const testPool18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    // Soma mínima inalcançável (245 a 250) em um pool até a dezena 18
    const impossibleFilters: FilterCriteria = {
      ...DEFAULT_FILTERS,
      somaMin: 245,
      somaMax: 250,
    };

    let caughtExpectedError = false;
    try {
      generateFechamentoCovering(testPool18, 14, 8, impossibleFilters, CONCURSO_ATUAL.dezenas);
    } catch (e: any) {
      if (e.message && e.message.includes('Nenhum jogo compatível com os filtros selecionados')) {
        caughtExpectedError = true;
      }
    }

    record(
      'Tratamento de Sobre-Restrição Combinatória',
      caughtExpectedError,
      'Filtros impossíveis dispararam erro controlado com diagnóstico claro sem travar a thread.'
    );
  } catch (err: any) {
    record('Tratamento de Sobre-Restrição Combinatória', false, `Exceção: ${err.message}`);
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passedCount,
    failedCount,
    results,
  };
}
