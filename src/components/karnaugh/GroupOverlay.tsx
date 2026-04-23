'use client';

// Sobreposição visual de agrupamento no mapa de Karnaugh
// Desenha um retângulo arredondado cobrindo as células especificadas

import { useMemo } from 'react';

/** Tamanho de cada célula em pixels (deve coincidir com KmapCell) */
const CELL_SIZE = 64; // w-16 = 4rem = 64px
/** Margem interna do grupo em relação às bordas das células */
const PADDING = 4;

export interface GroupOverlayProps {
  cells: { row: number; col: number }[];
  color: string;
  totalRows: number;
  totalCols: number;
}

export function GroupOverlay({
  cells,
  color,
  totalRows,
  totalCols,
}: GroupOverlayProps) {
  /** Calcula as coordenadas e dimensões do retângulo de sobreposição */
  const style = useMemo(() => {
    if (cells.length === 0) return null;

    // Detectar se o grupo faz "wrap-around" (envolve as bordas do mapa)
    const rows = cells.map((c) => c.row);
    const cols = cells.map((c) => c.col);

    const uniqueRows = Array.from(new Set(rows)).sort((a, b) => a - b);
    const uniqueCols = Array.from(new Set(cols)).sort((a, b) => a - b);

    // Verificar wrap-around nas linhas
    const rowWraps = detectWrap(uniqueRows, totalRows);
    // Verificar wrap-around nas colunas
    const colWraps = detectWrap(uniqueCols, totalCols);

    if (rowWraps || colWraps) {
      // Para grupos que fazem wrap-around, desenhar múltiplos retângulos
      // Simplificação: desenhar um retângulo com cantos arredondados e opacidade reduzida
      // cobrindo todas as células individualmente
      return null; // Tratado pelo render de fallback abaixo
    }

    // Grupo contíguo: calcular bounding box
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    return {
      top: minRow * CELL_SIZE + PADDING,
      left: minCol * CELL_SIZE + PADDING,
      width: (maxCol - minCol + 1) * CELL_SIZE - PADDING * 2,
      height: (maxRow - minRow + 1) * CELL_SIZE - PADDING * 2,
    };
  }, [cells, totalRows, totalCols]);

  // Fallback: destaque individual de cada célula (para wrap-around)
  if (!style) {
    return (
      <>
        {cells.map((cell, i) => (
          <div
            key={i}
            className="absolute rounded pointer-events-none"
            style={{
              top: cell.row * CELL_SIZE + PADDING,
              left: cell.col * CELL_SIZE + PADDING,
              width: CELL_SIZE - PADDING * 2,
              height: CELL_SIZE - PADDING * 2,
              backgroundColor: color,
              opacity: 0.25,
              border: `2px solid ${color}`,
            }}
          />
        ))}
      </>
    );
  }

  return (
    <div
      className="absolute rounded-lg pointer-events-none"
      style={{
        top: style.top,
        left: style.left,
        width: style.width,
        height: style.height,
        backgroundColor: color,
        opacity: 0.2,
        border: `3px solid ${color}`,
        borderRadius: '8px',
      }}
    />
  );
}

/**
 * Detecta se um conjunto de índices faz wrap-around no mapa.
 * Retorna true se os índices não são contíguos (ex: [0, 3] em um mapa de 4).
 */
function detectWrap(sortedIndices: number[], total: number): boolean {
  if (sortedIndices.length <= 1) return false;

  for (let i = 1; i < sortedIndices.length; i++) {
    const gap = sortedIndices[i] - sortedIndices[i - 1];
    if (gap > 1) {
      // Verificar se o gap indica wrap-around
      // Ex: [0, 3] em total=4 -> gap de 3, mas 0 e 3 são adjacentes no K-map
      const wrapGap =
        sortedIndices[0] + total - sortedIndices[sortedIndices.length - 1];
      if (wrapGap === 1) return true;
    }
  }
  return false;
}
