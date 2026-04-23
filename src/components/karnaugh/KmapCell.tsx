'use client';

// Célula individual do mapa de Karnaugh
// Exibe o valor da célula e o índice do mintermo no canto

import { cn } from '@/lib/utils';
import type { CellValue } from '@/lib/engine/types';

/** Estilos visuais por valor da célula */
const VALUE_STYLES: Record<string, string> = {
  '0': 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
  '1': 'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-200',
  'X': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export interface KmapCellProps {
  value: CellValue;
  mintermIndex: number;
  highlighted: boolean;
}

export function KmapCell({ value, mintermIndex, highlighted }: KmapCellProps) {
  return (
    <div
      className={cn(
        'relative w-16 h-16 flex items-center justify-center border border-gray-300 dark:border-gray-600 font-mono text-lg font-bold select-none',
        VALUE_STYLES[String(value)],
        // Efeito de destaque para células que pertencem a um agrupamento
        highlighted && 'ring-2 ring-blue-500 dark:ring-blue-400',
        // Listras diagonais para don't care
        value === 'X' && 'bg-stripes'
      )}
    >
      {/* Índice do mintermo no canto superior esquerdo */}
      <span className="absolute top-0.5 left-1 text-[10px] font-normal text-gray-400 dark:text-gray-500">
        {mintermIndex}
      </span>

      {/* Valor principal */}
      <span>{String(value)}</span>
    </div>
  );
}
