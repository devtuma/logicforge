// Funções para geração de expressões booleanas legíveis a partir dos implicantes

import type { Implicant } from './types';

/**
 * Converte um implicante (máscara) em um termo produto para SOP.
 * Exemplo: máscara "10" com variáveis [A, B] → "A·B'"
 * O caractere '-' na máscara indica que a variável foi eliminada.
 * '1' significa variável direta, '0' significa variável complementada.
 */
export function implicantToSOP(implicant: Implicant, varNames: string[]): string {
  const parts: string[] = [];

  for (let i = 0; i < implicant.mask.length; i++) {
    const bit = implicant.mask[i];
    if (bit === '-') continue; // Variável eliminada

    const varName = varNames[i] || `x${i}`;
    if (bit === '1') {
      parts.push(varName);
    } else {
      // Variável complementada (negada)
      parts.push(`${varName}'`);
    }
  }

  // Se todos os bits são '-', o termo é 1 (tautologia)
  if (parts.length === 0) return '1';

  return parts.join('·');
}

/**
 * Converte um índice de maxtermo em um termo soma para POS.
 * Exemplo: maxtermo 5 (101) com variáveis [A, B, C] → "(A' + B + C')"
 * Em POS, '1' na posição significa variável complementada, '0' significa variável direta.
 */
function maxtermToSumTerm(maxterm: number, numVars: number, varNames: string[]): string {
  const parts: string[] = [];

  for (let i = numVars - 1; i >= 0; i--) {
    const bit = (maxterm >> i) & 1;
    const varName = varNames[numVars - 1 - i] || `x${numVars - 1 - i}`;

    if (bit === 1) {
      // Em POS, bit 1 no maxtermo → variável complementada
      parts.push(`${varName}'`);
    } else {
      parts.push(varName);
    }
  }

  return `(${parts.join(' + ')})`;
}

/**
 * Gera a expressão POS (Produto de Somas) a partir dos mintermos.
 * Os maxtermos são os índices que NÃO são mintermos nem don't cares.
 */
export function implicantsToPOS(
  minterms: number[],
  dontCares: number[],
  numVars: number,
  varNames: string[]
): string {
  const totalTerms = Math.pow(2, numVars);
  const mintermSet = new Set(minterms);
  const dontCareSet = new Set(dontCares);

  // Maxtermos são os termos que não são mintermos nem don't cares
  const maxterms: number[] = [];
  for (let i = 0; i < totalTerms; i++) {
    if (!mintermSet.has(i) && !dontCareSet.has(i)) {
      maxterms.push(i);
    }
  }

  // Sem maxtermos → expressão é 1 (sempre verdadeiro)
  if (maxterms.length === 0) return '1';

  // Todos são maxtermos → expressão é 0 (sempre falso)
  if (maxterms.length === totalTerms) return '0';

  // Gerar termos soma para cada maxtermo
  const sumTerms = maxterms.map((m) => maxtermToSumTerm(m, numVars, varNames));

  return sumTerms.join('·');
}

/**
 * Gera a expressão SOP (Soma de Produtos) completa a partir dos implicantes.
 * Junta todos os termos produto com ' + '.
 */
export function generateSOPExpression(
  implicants: Implicant[],
  varNames: string[]
): string {
  // Sem implicantes → expressão é 0
  if (implicants.length === 0) return '0';

  const terms = implicants.map((imp) => implicantToSOP(imp, varNames));

  // Se algum termo é '1', toda a expressão é '1'
  if (terms.includes('1')) return '1';

  return terms.join(' + ');
}

/**
 * Gera a expressão POS (Produto de Somas) completa.
 * Delega para implicantsToPOS que calcula os maxtermos.
 */
export function generatePOSExpression(
  minterms: number[],
  dontCares: number[],
  numVars: number,
  varNames: string[]
): string {
  // Sem mintermos → expressão é 0
  if (minterms.length === 0) return '0';

  return implicantsToPOS(minterms, dontCares, numVars, varNames);
}

/**
 * Converte uma expressão booleana para formato LaTeX.
 * Substitui notações de texto por comandos LaTeX correspondentes.
 */
export function expressionToLatex(expression: string): string {
  // Casos triviais
  if (expression === '0' || expression === '1') return expression;

  let latex = expression;

  // Substituir variáveis complementadas: A' → \overline{A}
  // Tratar nomes de variáveis com múltiplos caracteres também
  latex = latex.replace(/([A-Za-z][A-Za-z0-9]*)'/g, '\\overline{$1}');

  // Substituir operador AND (·) por \cdot
  latex = latex.replace(/·/g, ' \\cdot ');

  // Substituir operador OR (+) com espaçamento
  latex = latex.replace(/ \+ /g, ' + ');

  return latex;
}
