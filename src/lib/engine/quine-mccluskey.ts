// Algoritmo de Quine-McCluskey para simplificação de expressões booleanas

import type { Implicant, SimplificationResult } from './types';
import { generateSOPExpression, generatePOSExpression } from './expression';

/**
 * Conta o número de '1's em uma string binária.
 * Ignora caracteres '-' (don't care).
 */
export function countOnes(binary: string): number {
  let count = 0;
  for (const ch of binary) {
    if (ch === '1') count++;
  }
  return count;
}

/**
 * Tenta combinar dois termos binários que diferem em exatamente 1 bit.
 * Retorna a string combinada com '-' na posição divergente, ou null se não combinável.
 */
export function combinePair(a: string, b: string): string | null {
  if (a.length !== b.length) return null;

  let diffCount = 0;
  let diffPos = -1;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffCount++;
      diffPos = i;
      if (diffCount > 1) return null;
    }
  }

  if (diffCount !== 1) return null;

  // Combina substituindo o bit divergente por '-'
  return a.substring(0, diffPos) + '-' + a.substring(diffPos + 1);
}

/**
 * Converte um número inteiro para sua representação binária com padding.
 */
function toBinary(num: number, numVars: number): string {
  return num.toString(2).padStart(numVars, '0');
}

/**
 * Encontra todos os mintermos cobertos por uma máscara com don't cares.
 * Por exemplo, "1-0" cobre "100" e "110", ou seja, mintermos 4 e 6.
 */
function expandMask(mask: string): number[] {
  const dontCarePositions: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === '-') dontCarePositions.push(i);
  }

  if (dontCarePositions.length === 0) {
    return [parseInt(mask, 2)];
  }

  const results: number[] = [];
  const numCombinations = Math.pow(2, dontCarePositions.length);

  for (let i = 0; i < numCombinations; i++) {
    const chars = mask.split('');
    for (let j = 0; j < dontCarePositions.length; j++) {
      chars[dontCarePositions[j]] = ((i >> (dontCarePositions.length - 1 - j)) & 1).toString();
    }
    results.push(parseInt(chars.join(''), 2));
  }

  return results;
}

/**
 * Encontra todos os implicantes primos usando o método de Quine-McCluskey.
 * Combina mintermos e don't cares iterativamente até não haver mais combinações possíveis.
 */
export function findPrimeImplicants(
  minterms: number[],
  dontCares: number[],
  numVars: number
): Implicant[] {
  // Caso especial: sem mintermos nem don't cares
  if (minterms.length === 0 && dontCares.length === 0) {
    return [];
  }

  // Todos os termos (mintermos + don't cares) participam da combinação
  const allTerms = Array.from(new Set(minterms.concat(dontCares)));

  // Representação inicial: cada termo como string binária
  type Term = {
    mask: string;
    minterms: number[]; // mintermos cobertos (apenas os "reais", não don't cares)
    allCovered: number[]; // todos os termos cobertos (incluindo don't cares)
  };

  let currentTerms: Term[] = allTerms.map((t) => ({
    mask: toBinary(t, numVars),
    minterms: minterms.includes(t) ? [t] : [],
    allCovered: [t],
  }));

  const primeImplicantMasks = new Set<string>();
  const primeImplicants: Term[] = [];

  // Iteração do algoritmo: combinar termos até não haver mais combinações
  while (currentTerms.length > 0) {
    // Agrupar por número de 1s na máscara
    const groups = new Map<number, Term[]>();
    for (const term of currentTerms) {
      const ones = countOnes(term.mask);
      if (!groups.has(ones)) groups.set(ones, []);
      groups.get(ones)!.push(term);
    }

    const usedMasks = new Set<string>();
    const nextTerms: Term[] = [];
    const nextMasks = new Set<string>();

    // Obter chaves ordenadas dos grupos
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a - b);

    // Tentar combinar grupos adjacentes (diferindo por 1 no número de 1s)
    for (let ki = 0; ki < sortedKeys.length - 1; ki++) {
      const key = sortedKeys[ki];
      const nextKey = sortedKeys[ki + 1];

      // Só combinar grupos com diferença de exatamente 1 no número de 1s
      if (nextKey - key !== 1) continue;

      const groupA = groups.get(key)!;
      const groupB = groups.get(nextKey)!;

      for (const termA of groupA) {
        for (const termB of groupB) {
          const combined = combinePair(termA.mask, termB.mask);
          if (combined !== null) {
            // Marcar ambos como usados
            usedMasks.add(termA.mask);
            usedMasks.add(termB.mask);

            // Evitar duplicatas no próximo nível
            if (!nextMasks.has(combined)) {
              nextMasks.add(combined);
              nextTerms.push({
                mask: combined,
                minterms: Array.from(new Set(termA.minterms.concat(termB.minterms))),
                allCovered: Array.from(new Set(termA.allCovered.concat(termB.allCovered))),
              });
            } else {
              // Mesmo assim, unir os mintermos cobertos ao termo existente
              const existing = nextTerms.find((t) => t.mask === combined);
              if (existing) {
                existing.minterms = Array.from(new Set(existing.minterms.concat(termA.minterms, termB.minterms)));
                existing.allCovered = Array.from(new Set(existing.allCovered.concat(termA.allCovered, termB.allCovered)));
              }
            }
          }
        }
      }
    }

    // Termos não combinados são implicantes primos
    for (const term of currentTerms) {
      if (!usedMasks.has(term.mask) && !primeImplicantMasks.has(term.mask)) {
        // Só incluir se cobrir pelo menos um mintermo real
        if (term.minterms.length > 0) {
          primeImplicantMasks.add(term.mask);
          primeImplicants.push(term);
        }
      }
    }

    currentTerms = nextTerms;
  }

  // Converter para o formato Implicant
  return primeImplicants.map((pi) => ({
    minterms: pi.minterms.sort((a, b) => a - b),
    mask: pi.mask,
    variables: [],
  }));
}

/**
 * Encontra os implicantes primos essenciais e resolve a cobertura restante.
 * Um implicante primo é essencial quando é o único que cobre um determinado mintermo.
 * Para mintermos restantes, usa cobertura gulosa (greedy set cover).
 */
export function findEssentialPrimeImplicants(
  primeImplicants: Implicant[],
  minterms: number[]
): Implicant[] {
  if (primeImplicants.length === 0 || minterms.length === 0) {
    return [];
  }

  // Construir tabela de cobertura: para cada mintermo, quais PIs o cobrem
  const coverageMap = new Map<number, number[]>();
  for (const m of minterms) {
    const coveringPIs: number[] = [];
    for (let i = 0; i < primeImplicants.length; i++) {
      if (primeImplicants[i].minterms.includes(m)) {
        coveringPIs.push(i);
      }
    }
    coverageMap.set(m, coveringPIs);
  }

  const selectedIndices = new Set<number>();
  const coveredMinterms = new Set<number>();

  // Fase 1: Encontrar implicantes primos essenciais
  // Um PI é essencial se é o único que cobre algum mintermo
  coverageMap.forEach((piIndices, minterm) => {
    if (piIndices.length === 1) {
      const essentialIdx = piIndices[0];
      if (!selectedIndices.has(essentialIdx)) {
        selectedIndices.add(essentialIdx);
        // Marcar todos os mintermos cobertos por este PI
        for (const m of primeImplicants[essentialIdx].minterms) {
          coveredMinterms.add(m);
        }
      }
    }
  });

  // Fase 2: Cobertura gulosa para mintermos restantes
  const remainingMinterms = minterms.filter((m) => !coveredMinterms.has(m));

  if (remainingMinterms.length > 0) {
    const uncovered = new Set(remainingMinterms);

    while (uncovered.size > 0) {
      // Escolher o PI que cobre mais mintermos não cobertos
      let bestIdx = -1;
      let bestCount = 0;

      for (let i = 0; i < primeImplicants.length; i++) {
        if (selectedIndices.has(i)) continue;

        const coverCount = primeImplicants[i].minterms.filter((m) =>
          uncovered.has(m)
        ).length;

        if (coverCount > bestCount) {
          bestCount = coverCount;
          bestIdx = i;
        }
      }

      if (bestIdx === -1 || bestCount === 0) break;

      selectedIndices.add(bestIdx);
      for (const m of primeImplicants[bestIdx].minterms) {
        uncovered.delete(m);
      }
    }
  }

  // Retornar PIs selecionados na ordem original
  return Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map((idx) => primeImplicants[idx]);
}

/**
 * Função principal de simplificação booleana.
 * Executa o algoritmo completo de Quine-McCluskey e gera as expressões SOP e POS.
 */
export function simplify(
  minterms: number[],
  dontCares: number[],
  numVars: number,
  varNames: string[]
): SimplificationResult {
  const totalMinterms = Math.pow(2, numVars);

  // Caso especial: sem mintermos reais
  if (minterms.length === 0) {
    return {
      implicants: [],
      expression: '0',
      expressionPOS: '0',
    };
  }

  // Caso especial: todos os mintermos são 1 (considerando don't cares como possíveis 1s)
  // Verificar se todos os termos possíveis são mintermos ou don't cares
  const allSet = new Set(minterms.concat(dontCares));
  if (minterms.length === totalMinterms) {
    return {
      implicants: [
        {
          minterms: minterms.slice().sort((a, b) => a - b),
          mask: '-'.repeat(numVars),
          variables: [],
        },
      ],
      expression: '1',
      expressionPOS: '1',
    };
  }

  // Verificar se mintermos + don't cares cobrem tudo e todos os não-DC são mintermos
  if (allSet.size === totalMinterms) {
    return {
      implicants: [
        {
          minterms: minterms.slice().sort((a, b) => a - b),
          mask: '-'.repeat(numVars),
          variables: [],
        },
      ],
      expression: '1',
      expressionPOS: '1',
    };
  }

  // Executar Quine-McCluskey
  const primeImplicants = findPrimeImplicants(minterms, dontCares, numVars);

  // Encontrar cobertura mínima
  const essentialPIs = findEssentialPrimeImplicants(primeImplicants, minterms);

  // Preencher campo variables dos implicantes
  const resultImplicants = essentialPIs.map((pi) => ({
    ...pi,
    variables: getImplicantVariables(pi.mask, varNames),
  }));

  // Gerar expressões
  const expression = generateSOPExpression(resultImplicants, varNames);
  const expressionPOS = generatePOSExpression(minterms, dontCares, numVars, varNames);

  return {
    implicants: resultImplicants,
    expression,
    expressionPOS,
  };
}

/**
 * Extrai os nomes das variáveis presentes em um implicante (bits que não são '-').
 */
function getImplicantVariables(mask: string, varNames: string[]): string[] {
  const vars: string[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== '-') {
      vars.push(varNames[i] || `x${i}`);
    }
  }
  return vars;
}
