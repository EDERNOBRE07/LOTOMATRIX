import {
  validateFilters,
  generateFechamentoCovering,
  DEFAULT_FILTERS,
  gerarFechamentoLJCR,
  gerarTodosCenariosAcerto,
  auditarGarantiaEfetiva,
  criarMascara,
  validarIntegridadeFechamento,
  buildOptimal18Pool,
  generateDesdobramento25Blocos,
  generateSuper14Coringas11Jogos,
  generatePadraoPivo9,
  selectCoreAndSatellites25,
  hammingDistanceBitwise,
  calculateGaussianScoreIA,
  gerarMatrizEstratificada,
  ZONA_CENTRAL_SOMA_MIN,
  ZONA_CENTRAL_SOMA_MAX,
  CAUDA_BAIXA_SOMA_MIN,
  CAUDA_BAIXA_SOMA_MAX,
  CAUDA_ALTA_SOMA_MIN,
  CAUDA_ALTA_SOMA_MAX,
} from './combinatorics';
import { PRESETS_LOTOFACIL } from './presetsFiltros';
import { saveFechamentoPrognostico } from './savedFechamentosStorage';
import { FilterCriteria, GameTicket } from '../types/lotofacil';
import { CONCURSO_ATUAL, DEZENAS_STATS, CRUZ_DEZENAS } from '../data/lotofacilData';

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

  // 1. Caso de Teste: Combinação Canônica Válida (Preset Equilíbrio Pro)
  try {
    const validCombo = [1, 2, 4, 5, 6, 7, 9, 13, 14, 15, 16, 18, 23, 24, 25];
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
    // Apenas dezenas fora da Cruz canônica ([2, 7, 11, 12, 13, 14, 15, 17, 22])
    const noCruzCombo = Array.from({ length: 25 }, (_, i) => i + 1)
      .filter((n) => !CRUZ_DEZENAS.includes(n))
      .slice(0, 15); // 0 na Cruz
    const filterConfig: FilterCriteria = { ...DEFAULT_FILTERS, cruzAtiva: true, cruzMin: 4, cruzMax: 7 };
    const res = validateFilters(noCruzCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const hasCruzViolation = res.violations.some((v) => v.includes('Cruz'));
    record(
      'Validação da Cruz da Lotofácil',
      res.isValid === false && hasCruzViolation && res.metrics.cruz === 0,
      `Combinação com ${res.metrics.cruz} dezenas na Cruz devidamente podada pelo validador.`
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

  // 5. Caso de Teste: Violação de Padrão Viciado Extremo (2 linhas cheias simultâneas; 1 linha cheia não é falso positivo)
  try {
    const singleRowCombo = [1, 2, 3, 4, 5, 8, 10, 11, 13, 14, 17, 18, 20, 22, 24]; // 1 linha cheia (realista na Caixa)
    const twoRowsCombo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 17, 20, 24]; // 2 linhas cheias simultâneas (viciado extremo)
    const filterConfig: FilterCriteria = { ...DEFAULT_FILTERS, antiPadraoViciadoAtivo: true };
    const resSingle = validateFilters(singleRowCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const resExtreme = validateFilters(twoRowsCombo, filterConfig, CONCURSO_ATUAL.dezenas);
    const singleNotFalselyVicious = !resSingle.violations.some((v) => v.includes('viciado'));
    const extremeRejected =
      resExtreme.isValid === false &&
      resExtreme.violations.some((v) => v.includes('viciado') || v.includes('linha') || v.includes('consecutiv'));
    record(
      'Auditoria Anti-Padrão Viciado',
      singleNotFalselyVicious && extremeRejected,
      `Padrão extremo (2 linhas inteiras) rejeitado com sucesso, sem falso positivo em linha única real.`
    );
  } catch (err: any) {
    record('Auditoria Anti-Padrão Viciado', false, `Exceção: ${err.message}`);
  }

  // 6. Caso de Teste: Geração de Fechamento com 100% de Conformidade Estrita
  try {
    const testPool18 = [2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 16, 17, 18, 19, 22, 23, 24, 25];
    const strictFilters: FilterCriteria = {
      ...DEFAULT_FILTERS,
      somaMin: 180,
      somaMax: 225,
      paresMin: 5,
      paresMax: 9,
      primosMin: 4,
      primosMax: 7,
      molduraMin: 8,
      molduraMax: 12,
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

  // 7. Caso de Teste: Fallback Progressivo Automático em 3 Níveis sob Sobre-Restrição
  try {
    const testPool18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    // Soma mínima inalcançável (245 a 250) em um pool até a dezena 18 -> deve acionar Fallback Progressivo até Nível 3
    const impossibleFilters: FilterCriteria = {
      ...DEFAULT_FILTERS,
      somaMin: 245,
      somaMax: 250,
    };

    const recovered = generateFechamentoCovering(
      testPool18,
      14,
      8,
      impossibleFilters,
      CONCURSO_ATUAL.dezenas
    );
    const taggedFallback = recovered.some((t) =>
      (t.tags || []).some((tag) => tag.includes('Fallback Nível'))
    );

    record(
      'Fallback Progressivo Automático (3 Níveis)',
      recovered.length === 8 && taggedFallback,
      `Sob filtros impossíveis (soma 245–250 em [1..18]), o Fallback Progressivo recuperou ${recovered.length}/8 bilhetes válidos sem retornar fechamento vazio.`
    );
  } catch (err: any) {
    record('Fallback Progressivo Automático (3 Níveis)', false, `Exceção: ${err.message}`);
  }

  // 8. Caso de Teste OBRIGATÓRIO (a): Matriz Sem Filtros = 100% de Garantia Auditada C(18, 15, 14)
  try {
    const pool18 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const jogos24 = gerarFechamentoLJCR(pool18, 14, 15);
    const cenarios816 = gerarTodosCenariosAcerto(pool18);
    const masks24 = jogos24.map((j) => criarMascara(j));
    const taxa100 = auditarGarantiaEfetiva(masks24, cenarios816, 14);

    record(
      'Garantia Canônica Sem Filtros (100% Auditada)',
      jogos24.length === 24 && Math.abs(taxa100 - 100.0) < 0.001,
      `Matriz C(18, 15, 14) com 24 cartões atingiu exatamente ${taxa100.toFixed(1)}% de cobertura contra todos os 816 cenários.`
    );

    // 9. Caso de Teste OBRIGATÓRIO (b): Matriz com Remoção Arbitrária de Cartões = Garantia Efetiva Recalculada < 100%
    const reducedMasks = masks24.slice(0, 20); // Remove 4 cartões arbitrariamente
    const taxaReduzida = auditarGarantiaEfetiva(reducedMasks, cenarios816, 14);

    record(
      'Garantia Efetiva Pós-Poda / Redução (< 100%)',
      taxaReduzida > 70 && taxaReduzida < 100,
      `Remoção arbitrária de 4 cartões (20 de 24) recalculou a garantia efetiva para ${taxaReduzida.toFixed(2)}% (< 100%), comprovando a precisão da auditoria bitwise.`
    );

    // 10. Caso de Teste: Auditoria Canônica de Integridade (validarIntegridadeFechamento)
    const auditRes = validarIntegridadeFechamento(jogos24);
    record(
      'Auditoria Canônica de Integridade',
      auditRes.aprovado === true && auditRes.erros.length === 0,
      `Todos os 24 jogos auditados sem duplicidades, fora de faixa ou erros de tamanho em ${auditRes.tempoMs}ms.`
    );
  } catch (err: any) {
    record('Auditoria de Cobertura LJCR', false, `Exceção: ${err.message}`);
  }

  // 11. Caso de Teste: Otimização Hamming Factível (21 Dezenas + 2 Fixas, 24 Jogos sem Redundância)
  try {
    const pool21 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22];
    const tickets21 = generateFechamentoCovering(
      pool21,
      13,
      24,
      { ...DEFAULT_FILTERS, dezenasFixas: [10, 20], modoFixas: 'rigidas' },
      CONCURSO_ATUAL.dezenas
    );
    const masks21 = tickets21.map((t) => criarMascara(t.dezenas));
    const uniqueCount = new Set(tickets21.map((t) => t.dezenas.join('-'))).size;
    let minHamming21 = 15;
    for (let i = 0; i < masks21.length; i++) {
      for (let j = i + 1; j < masks21.length; j++) {
        const d = hammingDistanceBitwise(masks21[i], masks21[j]);
        if (d < minHamming21) minHamming21 = d;
      }
    }
    const allHave2Fixas = tickets21.every((t) => t.dezenas.includes(10) && t.dezenas.includes(20));

    record(
      'Otimização Hamming Factível (21 Dezenas + 2 Fixas)',
      tickets21.length === 24 && uniqueCount === 24 && minHamming21 >= 2 && allHave2Fixas,
      `Matriz de 21 dezenas (24 jogos, 2 fixas) alcançou Hamming mínimo de ${minHamming21} (alvo factível ≥ 2) com 0 jogos redundantes.`
    );
  } catch (err: any) {
    record('Otimização Hamming Factível (21 Dezenas + 2 Fixas)', false, `Exceção: ${err.message}`);
  }

  // 12. Caso de Teste: Ancoragem Core 12 (70%-80%) + 13 Satélites nas Matrizes de 25 Dezenas
  try {
    const basePartition = selectCoreAndSatellites25({
      latestDraw: CONCURSO_ATUAL,
      dynamicStats: DEZENAS_STATS,
    });
    const pivoPartition = selectCoreAndSatellites25({
      latestDraw: CONCURSO_ATUAL,
      dynamicStats: DEZENAS_STATS,
      pivotBoost: [5, 6, 7, 12, 13, 14, 19, 20, 21],
    });
    const matrices25 = [
      {
        name: 'Blocos 10J',
        core12: basePartition.core12,
        tickets: generateDesdobramento25Blocos({ baseDraw: CONCURSO_ATUAL, dynamicStats: DEZENAS_STATS }),
      },
      {
        name: 'Coringas 11J',
        core12: basePartition.core12,
        tickets: generateSuper14Coringas11Jogos({ latestDraw: CONCURSO_ATUAL, dynamicStats: DEZENAS_STATS }),
      },
      {
        name: 'Pivô 9 24J',
        core12: pivoPartition.core12,
        tickets: generatePadraoPivo9({ latestDraw: CONCURSO_ATUAL, dynamicStats: DEZENAS_STATS, maxTickets: 24 }),
      },
      {
        name: 'Covering 25 (10J)',
        core12: basePartition.core12,
        tickets: generateFechamentoCovering(
          Array.from({ length: 25 }, (_, i) => i + 1),
          14,
          10,
          DEFAULT_FILTERS
        ),
      },
    ];

    let allValid = true;
    const summaryParts: string[] = [];

    for (const m of matrices25) {
      const covered = new Set<number>();
      const counts = new Array(26).fill(0);
      m.tickets.forEach((t) => {
        t.dezenas.forEach((d) => {
          covered.add(d);
          counts[d]++;
        });
      });
      const minCorePct = Math.min(...m.core12.map((d) => (counts[d] / m.tickets.length) * 100));
      const maxCorePct = Math.max(...m.core12.map((d) => (counts[d] / m.tickets.length) * 100));
      const ok = covered.size === 25 && minCorePct >= 70 && maxCorePct <= 80;
      if (!ok) allValid = false;
      summaryParts.push(`${m.name}: ${covered.size}/25 dez, Core ${minCorePct.toFixed(0)}%–${maxCorePct.toFixed(0)}%`);
    }

    record(
      'Matrizes 25 Dezenas (Core 12 + Satélites 13)',
      allValid,
      summaryParts.join(' | ')
    );
  } catch (err: any) {
    record('Matrizes 25 Dezenas (Core 12 + Satélites 13)', false, `Exceção: ${err.message}`);
  }

  // 13. Caso de Teste: Trava de Segurança contra Salvamento de Fechamento Vazio (tickets: [])
  try {
    const emptySaveRes = saveFechamentoPrognostico({
      id: 'test-empty-block',
      timestamp: Date.now(),
      dataCriacao: new Date().toLocaleString('pt-BR'),
      concurso: CONCURSO_ATUAL.concurso,
      tipoFechamento: 'Teste Vazio',
      modalidadeMatriz: '18 Dezenas',
      universoDezenas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      dezenasFixas: [],
      dezenasExcluidas: [],
      faixaSoma: { min: 180, max: 215 },
      paridade: { minPares: 6, maxPares: 9 },
      maxConsecutivas: 5,
      auditoriaAnomalias: '',
      repetidas: { min: 8, max: 10 },
      moldura: { min: 8, max: 11 },
      primos: { min: 4, max: 7 },
      fibonacci: { min: 3, max: 5 },
      tickets: [],
      totalJogos: 0,
      custoTotal: 0,
    });

    record(
      'Trava de Segurança contra Fechamentos Vazios',
      emptySaveRes.success === false && emptySaveRes.isEmpty === true,
      `Tentativa de salvar fechamento com tickets: [] bloqueada (${emptySaveRes.reason}).`
    );
  } catch (err: any) {
    record('Trava de Segurança contra Fechamentos Vazios', false, `Exceção: ${err.message}`);
  }

  // 14. Caso de Teste (Bloco B.1): Recalibração Gaussiana do scoreIA (Inversão Corrigida)
  try {
    const winner13Profile = calculateGaussianScoreIA(
      {
        soma: 217,
        moldura: 10,
        primos: 6,
        fibonacci: 5,
        pares: 7,
        repetidas: 7,
        maxConsecutivas: 5,
        cruz: 5,
        bola1: 1,
        bola15: 25,
      },
      78
    );
    const rigidOffCenterProfile = calculateGaussianScoreIA(
      {
        soma: 198,
        moldura: 12,
        primos: 4,
        fibonacci: 3,
        pares: 9,
        repetidas: 10,
        maxConsecutivas: 3,
        cruz: 5,
        bola1: 1,
        bola15: 25,
      },
      78
    );
    const consec3 = calculateGaussianScoreIA(
      { soma: 195, moldura: 9, primos: 5, fibonacci: 5, pares: 7, repetidas: 8, maxConsecutivas: 3, cruz: 5, bola1: 1, bola15: 25 },
      78
    );
    const consec5 = calculateGaussianScoreIA(
      { soma: 195, moldura: 9, primos: 5, fibonacci: 5, pares: 7, repetidas: 8, maxConsecutivas: 5, cruz: 5, bola1: 1, bola15: 25 },
      78
    );
    const consec6 = calculateGaussianScoreIA(
      { soma: 195, moldura: 9, primos: 5, fibonacci: 5, pares: 7, repetidas: 8, maxConsecutivas: 6, cruz: 5, bola1: 1, bola15: 25 },
      78
    );
    const consec7 = calculateGaussianScoreIA(
      { soma: 195, moldura: 9, primos: 5, fibonacci: 5, pares: 7, repetidas: 8, maxConsecutivas: 7, cruz: 5, bola1: 1, bola15: 25 },
      78
    );
    const rep7 = calculateGaussianScoreIA(
      { soma: 195, moldura: 9, primos: 5, fibonacci: 5, pares: 7, repetidas: 7, maxConsecutivas: 4, cruz: 5, bola1: 1, bola15: 25 },
      78
    );
    const rep8 = calculateGaussianScoreIA(
      { soma: 195, moldura: 9, primos: 5, fibonacci: 5, pares: 7, repetidas: 8, maxConsecutivas: 4, cruz: 5, bola1: 1, bola15: 25 },
      78
    );

    const zeroPen3to6 =
      consec3.consecutivasPenalty === 0 &&
      consec5.consecutivasPenalty === 0 &&
      consec6.consecutivasPenalty === 0 &&
      consec3.scoreIA === consec6.scoreIA;
    const softPenAt7 = consec7.consecutivasPenalty > 0 && consec7.consecutivasPenalty <= 1.5;
    const noPenaltyRep7 = rep7.scoreIA === rep8.scoreIA;
    const winnerBeatsRigid = winner13Profile.scoreIA > rigidOffCenterProfile.scoreIA;

    record(
      'Recalibração Gaussiana do scoreIA (Bloco B.1)',
      zeroPen3to6 && softPenAt7 && noPenaltyRep7 && winnerBeatsRigid,
      `Vencedor 13 pts (${winner13Profile.scoreIA}) > Rígido fora do pico (${rigidOffCenterProfile.scoreIA}); penalidade 3–6 consec = 0, em 7 = -${consec7.consecutivasPenalty}; 7 repetidas sem penalidade (${rep7.scoreIA} == ${rep8.scoreIA}).`
    );
  } catch (err: any) {
    record('Recalibração Gaussiana do scoreIA (Bloco B.1)', false, `Exceção: ${err.message}`);
  }

  // 15. Caso de Teste (Bloco B.2): Estratificação de Soma (75% Central 180-215 / 15% Alta 216-230 / 10% Baixa 155-179)
  try {
    const balancedPool20 = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 13, 14, 16, 17, 19, 20, 21, 22, 24, 25];
    const stratTickets = gerarMatrizEstratificada(balancedPool20, 20, {
      concursoAnterior: CONCURSO_ATUAL.dezenas,
      filters: DEFAULT_FILTERS,
    });
    const centralCount = stratTickets.filter((t) => t.soma >= ZONA_CENTRAL_SOMA_MIN && t.soma <= ZONA_CENTRAL_SOMA_MAX).length;
    const upperCount = stratTickets.filter((t) => t.soma >= CAUDA_ALTA_SOMA_MIN && t.soma <= CAUDA_ALTA_SOMA_MAX).length;
    const lowerCount = stratTickets.filter((t) => t.soma >= CAUDA_BAIXA_SOMA_MIN && t.soma <= CAUDA_BAIXA_SOMA_MAX).length;

    const okStrat = stratTickets.length === 20 && centralCount === 15 && upperCount === 3 && lowerCount === 2;
    record(
      'Estratificação de Soma 75/15/10 (Bloco B.2)',
      okStrat,
      `20 jogos estratificados: ${centralCount} Zona Central (180–215 = ${(centralCount / 20) * 100}%), ${upperCount} Cauda Alta (216–230 = ${(upperCount / 20) * 100}%), ${lowerCount} Cauda Baixa (155–179 = ${(lowerCount / 20) * 100}%).`
    );
  } catch (err: any) {
    record('Estratificação de Soma 75/15/10 (Bloco B.2)', false, `Exceção: ${err.message}`);
  }

  // 16. Caso de Teste (Bloco B.3): Preset Equilíbrio Pro & DEFAULT_FILTERS Auditados (Anti-Overfiltering)
  try {
    const eq = PRESETS_LOTOFACIL.balanceado.filtros;
    const presetMatches =
      eq.somaMin === 170 &&
      eq.somaMax === 222 &&
      eq.paresMin === 6 &&
      eq.paresMax === 9 &&
      eq.molduraMin === 8 &&
      eq.molduraMax === 11 &&
      eq.primosMin === 4 &&
      eq.primosMax === 7 &&
      eq.fibonacciMin === 2 &&
      eq.fibonacciMax === 6 &&
      eq.repetidasMin === 6 &&
      eq.repetidasMax === 11 &&
      eq.maxConsecutivas === 6 &&
      eq.estratificacaoCaudaAtiva === false &&
      eq.antiPadraoViciadoAtivo === false &&
      eq.posicionalAtivo === false &&
      eq.multiplosAtivo === false;

    const defaultMatches =
      DEFAULT_FILTERS.somaMin === 165 &&
      DEFAULT_FILTERS.somaMax === 225 &&
      DEFAULT_FILTERS.paresMin === 5 &&
      DEFAULT_FILTERS.paresMax === 9 &&
      DEFAULT_FILTERS.molduraMin === 8 &&
      DEFAULT_FILTERS.molduraMax === 12 &&
      DEFAULT_FILTERS.repetidasMin === 6 &&
      DEFAULT_FILTERS.repetidasMax === 11 &&
      DEFAULT_FILTERS.maxConsecutivas === 7 &&
      DEFAULT_FILTERS.modoRigorFiltros === 'conservador' &&
      DEFAULT_FILTERS.antiPadraoViciadoAtivo === false &&
      DEFAULT_FILTERS.posicionalAtivo === false &&
      DEFAULT_FILTERS.multiplosAtivo === false;

    record(
      'Preset Equilíbrio Pro Auditado (Bloco B.3)',
      presetMatches && defaultMatches,
      `Preset "${PRESETS_LOTOFACIL.balanceado.nome}" (Soma 170–222) e DEFAULT_FILTERS Core 4 (Soma 165–225, Pares 5–9, Moldura 8–12, Repetidas 6–11, Modo Conservador, sem over-filtering) validados.`
    );
  } catch (err: any) {
    record('Preset Equilíbrio Pro Auditado (Bloco B.3)', false, `Exceção: ${err.message}`);
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
