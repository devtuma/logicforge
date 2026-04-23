// Hook customizado para gerenciamento do estado da tabela verdade

import { useState, useCallback } from 'react';
import type { Variable, OutputConfig, CellValue } from '@/lib/engine/types';
import { DEFAULT_VAR_NAMES, DEFAULT_OUTPUT_NAMES } from '@/lib/utils';

/** Estado inicial padrão com 2 variáveis e 1 saída */
function createDefaultVariables(count: number): Variable[] {
  return Array.from({ length: count }, (_, i) => ({
    name: DEFAULT_VAR_NAMES[i] || `X${i}`,
    description: '',
  }));
}

function createDefaultOutputs(count: number, numVars: number): OutputConfig[] {
  const totalRows = Math.pow(2, numVars);
  return Array.from({ length: count }, (_, i) => ({
    name: DEFAULT_OUTPUT_NAMES[i] || `F${i + 1}`,
    values: new Array(totalRows).fill(0) as CellValue[],
  }));
}

export interface UseTruthTableReturn {
  variables: Variable[];
  outputs: OutputConfig[];
  ordering: 'binary' | 'gray';
  tableGenerated: boolean;
  setVariables: (variables: Variable[]) => void;
  setOutputs: (outputs: OutputConfig[]) => void;
  setOrdering: (ordering: 'binary' | 'gray') => void;
  addVariable: () => void;
  removeVariable: () => void;
  renameVariable: (index: number, name: string) => void;
  addOutput: () => void;
  removeOutput: () => void;
  renameOutput: (index: number, name: string) => void;
  setOutputValues: (outputIndex: number, values: CellValue[]) => void;
  clearOutput: (outputIndex: number) => void;
  fillOutput: (outputIndex: number) => void;
  generateTable: () => void;
  setTableGenerated: (val: boolean) => void;
}

export function useTruthTable(): UseTruthTableReturn {
  const [variables, setVariables] = useState<Variable[]>(
    createDefaultVariables(2)
  );
  const [outputs, setOutputs] = useState<OutputConfig[]>([
    { name: DEFAULT_OUTPUT_NAMES[0], values: [] },
  ]);
  const [ordering, setOrdering] = useState<'binary' | 'gray'>('binary');
  const [tableGenerated, setTableGenerated] = useState(false);

  /** Adiciona uma variável (máximo 4) */
  const addVariable = useCallback(() => {
    setVariables((prev) => {
      if (prev.length >= 4) return prev;
      const name = DEFAULT_VAR_NAMES[prev.length] || `X${prev.length}`;
      return [...prev, { name, description: '' }];
    });
  }, []);

  /** Remove a última variável (mínimo 2) */
  const removeVariable = useCallback(() => {
    setVariables((prev) => {
      if (prev.length <= 2) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  /** Renomeia uma variável pelo índice */
  const renameVariable = useCallback((index: number, name: string) => {
    setVariables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  }, []);

  /** Adiciona uma saída (máximo 4) */
  const addOutput = useCallback(() => {
    setOutputs((prev) => {
      if (prev.length >= 4) return prev;
      const name = DEFAULT_OUTPUT_NAMES[prev.length] || `F${prev.length + 1}`;
      const totalRows = Math.pow(2, variables.length);
      return [...prev, { name, values: new Array(totalRows).fill(0) as CellValue[] }];
    });
  }, [variables.length]);

  /** Remove a última saída (mínimo 1) */
  const removeOutput = useCallback(() => {
    setOutputs((prev) => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  /** Renomeia uma saída pelo índice */
  const renameOutput = useCallback((index: number, name: string) => {
    setOutputs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], name };
      return next;
    });
  }, []);

  /** Define os valores de uma saída inteira */
  const setOutputValues = useCallback(
    (outputIndex: number, values: CellValue[]) => {
      setOutputs((prev) => {
        const next = [...prev];
        next[outputIndex] = { ...next[outputIndex], values };
        return next;
      });
    },
    []
  );

  /** Limpa todos os valores de uma saída para 0 */
  const clearOutput = useCallback(
    (outputIndex: number) => {
      const totalRows = Math.pow(2, variables.length);
      setOutputValues(outputIndex, new Array(totalRows).fill(0) as CellValue[]);
    },
    [variables.length, setOutputValues]
  );

  /** Preenche todos os valores de uma saída com 1 */
  const fillOutput = useCallback(
    (outputIndex: number) => {
      const totalRows = Math.pow(2, variables.length);
      setOutputValues(outputIndex, new Array(totalRows).fill(1) as CellValue[]);
    },
    [variables.length, setOutputValues]
  );

  /** Gera/reseta a tabela com a configuração atual */
  const generateTable = useCallback(() => {
    const totalRows = Math.pow(2, variables.length);
    setOutputs((prev) =>
      prev.map((output) => ({
        ...output,
        values: new Array(totalRows).fill(0) as CellValue[],
      }))
    );
    setTableGenerated(true);
  }, [variables.length]);

  return {
    variables,
    outputs,
    ordering,
    tableGenerated,
    setVariables,
    setOutputs,
    setOrdering,
    addVariable,
    removeVariable,
    renameVariable,
    addOutput,
    removeOutput,
    renameOutput,
    setOutputValues,
    clearOutput,
    fillOutput,
    generateTable,
    setTableGenerated,
  };
}
