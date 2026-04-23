// Tipos fundamentais do motor de lógica booleana

/** Valor de uma célula na tabela verdade ou mapa de Karnaugh */
export type CellValue = 0 | 1 | 'X';

/** Representação de uma variável de entrada */
export interface Variable {
  name: string;
  description?: string;
}

/** Configuração de uma saída com seus valores para cada mintermo */
export interface OutputConfig {
  name: string;
  values: CellValue[];
}

/**
 * Implicante resultante do processo de simplificação.
 * A máscara (mask) é uma string binária onde '-' indica bits eliminados (don't care).
 */
export interface Implicant {
  minterms: number[];
  mask: string;
  variables: string[];
}

/** Resultado completo da simplificação de uma expressão booleana */
export interface SimplificationResult {
  implicants: Implicant[];
  expression: string;
  expressionPOS: string;
}

/** Célula individual no mapa de Karnaugh */
export interface KmapCell {
  row: number;
  col: number;
  mintermIndex: number;
  value: CellValue;
}

/** Agrupamento visual de células no mapa de Karnaugh */
export interface KmapGroup {
  cells: number[];
  implicant: Implicant;
  color: string;
}

/** Formatos de exportação suportados */
export type ExportFormat =
  | 'structured-text'
  | 'rockwell'
  | 'siemens'
  | 'abb'
  | 'schneider'
  | 'ladder-xml'
  | 'csv';

/** Dados completos de um projeto de simplificação */
export interface ProjectData {
  variables: Variable[];
  outputs: OutputConfig[];
  ordering: 'binary' | 'gray';
}
