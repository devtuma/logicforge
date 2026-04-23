// Funções para geração de tabelas verdade com ordenação binária e código Gray

/**
 * Gera todas as 2^n combinações em ordem binária.
 * Cada linha é um array de 0s e 1s representando os valores das variáveis.
 */
export function generateBinaryOrder(numVars: number): number[][] {
  const totalRows = Math.pow(2, numVars);
  const result: number[][] = [];

  for (let i = 0; i < totalRows; i++) {
    const row: number[] = [];
    for (let j = numVars - 1; j >= 0; j--) {
      row.push((i >> j) & 1);
    }
    result.push(row);
  }

  return result;
}

/**
 * Gera a sequência de código Gray para n bits.
 * Retorna os valores inteiros na ordem do código Gray.
 */
export function generateGrayCode(numBits: number): number[] {
  const totalValues = Math.pow(2, numBits);
  const result: number[] = [];

  for (let i = 0; i < totalValues; i++) {
    // Conversão binário para Gray: XOR do valor com ele mesmo deslocado 1 bit
    result.push(i ^ (i >> 1));
  }

  return result;
}

/**
 * Gera todas as combinações em ordem de código Gray.
 * Cada linha é um array de 0s e 1s.
 */
export function generateGrayOrder(numVars: number): number[][] {
  const graySequence = generateGrayCode(numVars);
  const result: number[][] = [];

  for (const grayValue of graySequence) {
    const row: number[] = [];
    for (let j = numVars - 1; j >= 0; j--) {
      row.push((grayValue >> j) & 1);
    }
    result.push(row);
  }

  return result;
}

/**
 * Gera a tabela verdade com a ordenação especificada.
 * Retorna um array de linhas, onde cada linha contém os valores das variáveis.
 */
export function generateTruthTable(
  numVars: number,
  ordering: 'binary' | 'gray'
): number[][] {
  if (ordering === 'gray') {
    return generateGrayOrder(numVars);
  }
  return generateBinaryOrder(numVars);
}

/**
 * Converte uma linha da tabela verdade para o índice de mintermo correspondente.
 * Em ordem binária, o índice é a conversão direta da linha para decimal.
 * Em ordem Gray, a linha está em Gray e precisa ser convertida de volta para binário.
 */
export function getMintermIndex(
  row: number[],
  ordering: 'binary' | 'gray',
  numVars: number
): number {
  if (ordering === 'binary') {
    // Conversão direta de binário para decimal
    let index = 0;
    for (let i = 0; i < numVars; i++) {
      index = (index << 1) | row[i];
    }
    return index;
  }

  // Ordem Gray: a linha representa um valor Gray, converter para binário
  let grayValue = 0;
  for (let i = 0; i < numVars; i++) {
    grayValue = (grayValue << 1) | row[i];
  }

  // Conversão Gray para binário
  let binaryValue = grayValue;
  let shift = 1;
  while (shift < numVars) {
    binaryValue ^= binaryValue >> shift;
    shift <<= 1;
  }

  return binaryValue;
}
