'use client';

// Célula individual clicável da tabela verdade
// Ciclo de valores: 0 -> 1 -> X -> 0

import { cn } from '@/lib/utils';
import type { CellValue } from '@/lib/engine/types';

/** Mapeamento de valor para o próximo no ciclo */
const NEXT_VALUE: Record<string, CellValue> = {
  '0': 1,
  '1': 'X',
  'X': 0,
};

/** Estilos de fundo por valor */
const VALUE_STYLES: Record<string, string> = {
  '0': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  '1': 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'X': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

export interface CellToggleProps {
  value: CellValue;
  onChange: (newValue: CellValue) => void;
}

export function CellToggle({ value, onChange }: CellToggleProps) {
  /** Avança para o próximo valor no ciclo */
  function handleClick() {
    onChange(NEXT_VALUE[String(value)]);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'w-10 h-10 flex items-center justify-center font-mono text-sm font-bold rounded transition-colors cursor-pointer select-none',
        'border border-gray-200 dark:border-gray-600',
        'hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 dark:hover:ring-offset-gray-900',
        VALUE_STYLES[String(value)]
      )}
      aria-label={`Valor: ${value}. Clique para alternar.`}
    >
      {String(value)}
    </button>
  );
}
