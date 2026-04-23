// Funções para layout e construção do mapa de Karnaugh

import type { CellValue, KmapCell, KmapGroup, Implicant } from './types';
import { generateGrayCode } from './truth-table';

/** Cores para os agrupamentos visuais no mapa de Karnaugh */
const GROUP_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

/**
 * Retorna as dimensões do mapa de Karnaugh e a distribuição das variáveis.
 * - 2 variáveis: grade 2x2
 * - 3 variáveis: grade 2x4
 * - 4 variáveis: grade 4x4
 */
export function getKmapLayout(numVars: number): {
  rows: number;
  cols: number;
  rowVars: string[];
  colVars: string[];
} {
  switch (numVars) {
    case 1:
      // K-map trivial: 1 linha × 2 colunas (A=0 | A=1)
      return { rows: 1, cols: 2, rowVars: [], colVars: ['0'] };
    case 2:
      return { rows: 2, cols: 2, rowVars: ['0'], colVars: ['1'] };
    case 3:
      return { rows: 2, cols: 4, rowVars: ['0'], colVars: ['1', '2'] };
    case 4:
      return { rows: 4, cols: 4, rowVars: ['0', '1'], colVars: ['2', '3'] };
    default:
      throw new Error(`Número de variáveis não suportado: ${numVars}. Use entre 1 e 4.`);
  }
}

/**
 * Mapeia uma posição (linha, coluna) do mapa de Karnaugh para o índice do mintermo.
 * Utiliza código Gray para garantir que células adjacentes diferem em apenas 1 bit.
 *
 * Para 2 variáveis: Gray das linhas = [0,1], Gray das colunas = [0,1]
 * Para 3 variáveis: Gray das linhas = [0,1], Gray das colunas = [00,01,11,10]
 * Para 4 variáveis: Gray das linhas = [00,01,11,10], Gray das colunas = [00,01,11,10]
 */
export function getKmapCellIndex(
  row: number,
  col: number,
  numVars: number
): number {
  const layout = getKmapLayout(numVars);
  const numRowBits = layout.rowVars.length;
  const numColBits = layout.colVars.length;

  // Gera sequências Gray para linhas e colunas
  const rowGray = generateGrayCode(numRowBits);
  const colGray = generateGrayCode(numColBits);

  // O índice do mintermo é a concatenação dos bits Gray da linha e da coluna
  const rowValue = rowGray[row];
  const colValue = colGray[col];

  return (rowValue << numColBits) | colValue;
}

/**
 * Constrói a grade completa do mapa de Karnaugh com valores e rótulos.
 * Retorna a grade de células, rótulos das linhas/colunas e nomes das variáveis agrupadas.
 */
export function buildKmapGrid(
  numVars: number,
  values: CellValue[],
  varNames: string[]
): {
  cells: KmapCell[][];
  rowLabels: string[];
  colLabels: string[];
  rowVarLabel: string;
  colVarLabel: string;
} {
  const layout = getKmapLayout(numVars);
  const numRowBits = layout.rowVars.length;
  const numColBits = layout.colVars.length;

  // Gera sequências Gray para rótulos
  const rowGray = generateGrayCode(numRowBits);
  const colGray = generateGrayCode(numColBits);

  // Cria rótulos binários para linhas e colunas
  const rowLabels = rowGray.map((v) => v.toString(2).padStart(numRowBits, '0'));
  const colLabels = colGray.map((v) => v.toString(2).padStart(numColBits, '0'));

  // Nomes das variáveis agrupadas para os eixos
  const rowVarNames = layout.rowVars.map((idx) => varNames[parseInt(idx)] || `x${idx}`);
  const colVarNames = layout.colVars.map((idx) => varNames[parseInt(idx)] || `x${idx}`);
  const rowVarLabel = rowVarNames.join('');
  const colVarLabel = colVarNames.join('');

  // Constrói a grade de células
  const cells: KmapCell[][] = [];
  for (let r = 0; r < layout.rows; r++) {
    const rowCells: KmapCell[] = [];
    for (let c = 0; c < layout.cols; c++) {
      const mintermIndex = getKmapCellIndex(r, c, numVars);
      rowCells.push({
        row: r,
        col: c,
        mintermIndex,
        value: mintermIndex < values.length ? values[mintermIndex] : 0,
      });
    }
    cells.push(rowCells);
  }

  return { cells, rowLabels, colLabels, rowVarLabel, colVarLabel };
}

/**
 * Mapeia implicantes para agrupamentos visuais no mapa de Karnaugh.
 * Cada grupo recebe uma cor distinta da paleta definida.
 */
export function findKmapGroups(
  implicants: Implicant[],
  numVars: number
): KmapGroup[] {
  const layout = getKmapLayout(numVars);
  const groups: KmapGroup[] = [];

  // Constrói mapa reverso de mintermo para posição (linha, coluna)
  const mintermToCell = new Map<number, { row: number; col: number }>();
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const idx = getKmapCellIndex(r, c, numVars);
      mintermToCell.set(idx, { row: r, col: c });
    }
  }

  for (let i = 0; i < implicants.length; i++) {
    const implicant = implicants[i];
    // Lista de índices de mintermos que pertencem a este agrupamento
    const cells = implicant.minterms.filter((m) => mintermToCell.has(m));

    groups.push({
      cells,
      implicant,
      color: GROUP_COLORS[i % GROUP_COLORS.length],
    });
  }

  return groups;
}
