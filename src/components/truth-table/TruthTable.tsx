'use client';

// Componente principal da tabela verdade
// Gera todas as 2^n linhas, exibe colunas de variáveis e saídas clicáveis

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Variable, OutputConfig, CellValue } from '@/lib/engine/types';
import { generateTruthTable, getMintermIndex } from '@/lib/engine/truth-table';
import { CellToggle } from './CellToggle';
import { ExpressionInput } from './ExpressionInput';
import { Button } from '@/components/ui/Button';

export interface TruthTableProps {
  variables: Variable[];
  outputs: OutputConfig[];
  ordering: 'binary' | 'gray';
  onOutputChange: (outputIndex: number, values: CellValue[]) => void;
}

export function TruthTable({
  variables,
  outputs,
  ordering,
  onOutputChange,
}: TruthTableProps) {
  const numVars = variables.length;

  /** Gera todas as combinações da tabela */
  const rows = useMemo(
    () => generateTruthTable(numVars, ordering),
    [numVars, ordering]
  );

  /** Marca todos os valores de uma saída como 1 */
  function handleMarkAll(outputIndex: number) {
    const newValues = new Array(rows.length).fill(1) as CellValue[];
    onOutputChange(outputIndex, newValues);
  }

  /** Limpa todos os valores de uma saída para 0 */
  function handleClearAll(outputIndex: number) {
    const newValues = new Array(rows.length).fill(0) as CellValue[];
    onOutputChange(outputIndex, newValues);
  }

  /** Atualiza um único valor de célula de saída */
  function handleCellChange(
    outputIndex: number,
    rowIndex: number,
    newValue: CellValue
  ) {
    const currentValues = [...outputs[outputIndex].values];
    // O índice na array de valores é baseado no mintermo, não na posição da linha
    const minterm = getMintermIndex(rows[rowIndex], ordering, numVars);
    currentValues[minterm] = newValue;
    onOutputChange(outputIndex, currentValues);
  }

  return (
    <div className="flex flex-col w-full">
      <ExpressionInput 
        variables={variables} 
        outputs={outputs} 
        ordering={ordering} 
        onApply={onOutputChange} 
      />
      <div className="w-full overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          {/* Linha de botões de ação por coluna de saída */}
          <tr>
            {/* Célula vazia para coluna de mintermo */}
            <th className="p-1" />
            {/* Células vazias para variáveis */}
            {variables.map((v) => (
              <th key={`action-${v.name}`} className="p-1" />
            ))}
            {/* Botões de ação para cada saída */}
            {outputs.map((output, oi) => (
              <th key={`action-${output.name}`} className="px-1 pb-1">
                <div className="flex gap-1 justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAll(oi)}
                    title="Marcar todos como 1"
                  >
                    Todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearAll(oi)}
                    title="Limpar todos para 0"
                  >
                    Limpar
                  </Button>
                </div>
              </th>
            ))}
          </tr>

          {/* Cabeçalho principal */}
          <tr className="border-b-2 border-gray-300 dark:border-gray-600">
            <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 font-mono">
              #
            </th>
            {variables.map((v) => (
              <th
                key={v.name}
                className="px-3 py-2 text-sm font-semibold text-foreground font-mono"
                title={v.description || v.name}
              >
                {v.name}
              </th>
            ))}
            {outputs.map((output) => (
              <th
                key={output.name}
                className="px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono border-l-2 border-gray-300 dark:border-gray-600"
              >
                {output.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const mintermIndex = getMintermIndex(row, ordering, numVars);
            return (
              <tr
                key={rowIndex}
                className={cn(
                  'border-b border-border transition-colors',
                  rowIndex % 2 === 0
                    ? 'bg-surface'
                    : 'bg-surface-hover'
                )}
              >
                {/* Índice do mintermo */}
                <td className="px-3 py-1 text-xs text-gray-400 dark:text-gray-500 font-mono text-center">
                  {mintermIndex}
                </td>

                {/* Valores das variáveis */}
                {row.map((bit, bitIndex) => (
                  <td
                    key={bitIndex}
                    className="px-3 py-1 text-center font-mono text-sm text-gray-700 dark:text-gray-300"
                  >
                    {bit}
                  </td>
                ))}

                {/* Valores das saídas (clicáveis) */}
                {outputs.map((output, oi) => {
                  const cellValue = output.values[mintermIndex] ?? 0;
                  return (
                    <td
                      key={output.name}
                      className="px-2 py-1 text-center border-l-2 border-gray-300 dark:border-gray-600"
                    >
                      <CellToggle
                        value={cellValue}
                        onChange={(newVal) =>
                          handleCellChange(oi, rowIndex, newVal)
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
