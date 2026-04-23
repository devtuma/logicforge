// Hook customizado para simplificação automática com Quine-McCluskey
// Executa a simplificação quando os valores de saída mudam, com debounce

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Variable, OutputConfig, CellValue } from '@/lib/engine/types';
import type { SimplificationResult, KmapGroup } from '@/lib/engine/types';
import { simplify } from '@/lib/engine/quine-mccluskey';
import { findKmapGroups } from '@/lib/engine/karnaugh';

/** Resultado da simplificação para cada saída, incluindo grupos do K-map */
export interface OutputSimplificationResult {
  outputName: string;
  result: SimplificationResult;
  groups: KmapGroup[];
}

export interface UseSimplificationReturn {
  results: OutputSimplificationResult[];
  isComputing: boolean;
}

/** Atraso de debounce em milissegundos */
const DEBOUNCE_MS = 300;

export function useSimplification(
  variables: Variable[],
  outputs: OutputConfig[]
): UseSimplificationReturn {
  const [results, setResults] = useState<OutputSimplificationResult[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Chave de memoização baseada nos valores das saídas */
  const valuesKey = useMemo(
    () =>
      outputs
        .map((o) => `${o.name}:${o.values.join('')}`)
        .join('|'),
    [outputs]
  );

  const numVars = variables.length;
  const varNames = useMemo(
    () => variables.map((v) => v.name),
    [variables]
  );

  useEffect(() => {
    // Não simplificar se não há valores definidos
    const hasValues = outputs.some((o) => o.values.length > 0);
    if (!hasValues) {
      setResults([]);
      return;
    }

    // Limpa timer anterior (debounce)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setIsComputing(true);

    timerRef.current = setTimeout(() => {
      try {
        const newResults: OutputSimplificationResult[] = outputs.map(
          (output) => {
            // Separar mintermos (valor=1) e don't cares (valor='X')
            const minterms: number[] = [];
            const dontCares: number[] = [];

            for (let i = 0; i < output.values.length; i++) {
              if (output.values[i] === 1) minterms.push(i);
              else if (output.values[i] === 'X') dontCares.push(i);
            }

            // Executar Quine-McCluskey
            const result = simplify(minterms, dontCares, numVars, varNames);

            // Encontrar agrupamentos visuais para o mapa de Karnaugh
            const groups = findKmapGroups(result.implicants, numVars);

            return {
              outputName: output.name,
              result,
              groups,
            };
          }
        );

        setResults(newResults);
      } catch (error) {
        console.error('Erro na simplificação:', error);
        setResults([]);
      } finally {
        setIsComputing(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey, numVars, varNames]);

  return { results, isComputing };
}
