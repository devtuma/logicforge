'use client';

// Visualização completa do mapa de Karnaugh
// Constrói a grade usando o engine, exibe rótulos e sobreposições de agrupamentos

import { useMemo } from 'react';
import type { CellValue, KmapGroup } from '@/lib/engine/types';
import { buildKmapGrid, getKmapCellIndex, getKmapLayout } from '@/lib/engine/karnaugh';
import { implicantToSOP } from '@/lib/engine/expression';
import { KmapCell } from './KmapCell';
import { GroupOverlay } from './GroupOverlay';

export interface KarnaughMapProps {
  numVars: number;
  varNames: string[];
  values: CellValue[];
  groups: KmapGroup[];
  outputName: string;
}

export function KarnaughMap({
  numVars,
  varNames,
  values,
  groups,
  outputName,
}: KarnaughMapProps) {
  // Clampeia numVars para o intervalo suportado: 1–4
  // Evita que getKmapLayout/buildKmapGrid lancem exceção antes dos hooks serem chamados
  const safeNumVars = Math.max(1, Math.min(4, numVars));
  const isInvalid = numVars < 1 || numVars > 4;

  /** Constrói a grade do mapa com rótulos e valores */
  const grid = useMemo(
    () => buildKmapGrid(safeNumVars, values, varNames),
    [safeNumVars, values, varNames]
  );

  /** Layout do mapa para dimensões */
  const layout = useMemo(() => getKmapLayout(safeNumVars), [safeNumVars]);

  /** Mapa reverso de mintermo para posição (row, col) */
  const mintermToPos = useMemo(() => {
    const map = new Map<number, { row: number; col: number }>();
    for (let r = 0; r < layout.rows; r++) {
      for (let c = 0; c < layout.cols; c++) {
        const idx = getKmapCellIndex(r, c, safeNumVars);
        map.set(idx, { row: r, col: c });
      }
    }
    return map;
  }, [layout, safeNumVars]);

  /** Conjunto de mintermos destacados por agrupamentos */
  const highlightedMinterms = useMemo(() => {
    const set = new Set<number>();
    for (const group of groups) {
      for (const m of group.cells) {
        set.add(m);
      }
    }
    return set;
  }, [groups]);

  /** Converte células dos grupos (índices de mintermos) para posições (row, col) */
  const groupCellPositions = useMemo(() => {
    return groups.map((group) => ({
      ...group,
      positions: group.cells
        .map((m) => mintermToPos.get(m))
        .filter(Boolean) as { row: number; col: number }[],
    }));
  }, [groups, mintermToPos]);

  // Guard pós-hooks: caso fora do intervalo suportado
  if (isInvalid) {
    return (
      <div className="text-center py-6 text-muted text-sm border rounded-lg bg-surface/50">
        Mapa de Karnaugh disponível para 1 a 4 variáveis.
        {numVars === 0 && ' Adicione ao menos uma variável de entrada.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Título */}
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Mapa de Karnaugh &mdash; {outputName}
      </h3>

      <div className="inline-block">
        {/* Rótulo das variáveis de coluna */}
        <div className="flex items-end mb-1 ml-20">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-mono">
            {grid.colVarLabel}
          </span>
        </div>

        <div className="flex">
          {/* Rótulo das variáveis de linha */}
          <div className="flex flex-col justify-center mr-1 w-12">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 font-mono text-right">
              {grid.rowVarLabel}
            </span>
          </div>

          <div>
            {/* Rótulos das colunas (código Gray) */}
            <div className="flex ml-[4px]">
              {/* Espaço para o rótulo da linha */}
              <div className="w-8" />
              {grid.colLabels.map((label, ci) => (
                <div
                  key={ci}
                  className="w-16 text-center text-xs font-mono text-gray-500 dark:text-gray-400 font-semibold"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Grade de células com overlays */}
            <div className="flex">
              {/* Rótulos das linhas (código Gray) */}
              <div className="flex flex-col">
                {grid.rowLabels.map((label, ri) => (
                  <div
                    key={ri}
                    className="h-16 w-8 flex items-center justify-end pr-2 text-xs font-mono text-gray-500 dark:text-gray-400 font-semibold"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Grade principal com posição relativa para overlays */}
              <div className="relative">
                {/* Células */}
                {grid.cells.map((row, ri) => (
                  <div key={ri} className="flex">
                    {row.map((cell) => (
                      <KmapCell
                        key={`${cell.row}-${cell.col}`}
                        value={cell.value}
                        mintermIndex={cell.mintermIndex}
                        highlighted={highlightedMinterms.has(cell.mintermIndex)}
                      />
                    ))}
                  </div>
                ))}

                {/* Sobreposições de agrupamentos */}
                {groupCellPositions.map((group, gi) => (
                  <GroupOverlay
                    key={gi}
                    cells={group.positions}
                    color={group.color}
                    totalRows={layout.rows}
                    totalCols={layout.cols}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda de agrupamentos */}
      {groups.length > 0 && (
        <div className="mt-4 space-y-1">
          <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Agrupamentos
          </h4>
          <div className="flex flex-wrap gap-3">
            {groups.map((group, gi) => (
              <div key={gi} className="flex items-center gap-2 text-sm">
                <div
                  className="w-4 h-4 rounded border"
                  style={{
                    backgroundColor: group.color,
                    borderColor: group.color,
                    opacity: 0.7,
                  }}
                />
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {implicantToSOP(group.implicant, varNames)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
