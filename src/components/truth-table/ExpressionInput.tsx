'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import type { Variable, OutputConfig, CellValue } from '@/lib/engine/types';
import { generateTruthTable } from '@/lib/engine/truth-table';
import { tokenize, parse, evaluateAST, ExpressionError } from '@/lib/engine/expression-parser';

export interface ExpressionInputProps {
  variables: Variable[];
  outputs: OutputConfig[];
  ordering: 'binary' | 'gray';
  onApply: (outputIndex: number, values: CellValue[]) => void;
}

export function ExpressionInput({
  variables,
  outputs,
  ordering,
  onApply,
}: ExpressionInputProps) {
  const [expression, setExpression] = useState('');
  const [selectedOutput, setSelectedOutput] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const numVars = variables.length;

  const handleApply = useCallback(() => {
    if (!expression.trim()) return;

    try {
      setError(null);
      
      // Validação das variáveis atuais
      const validVariables = variables.map((v) => v.name);
      
      // Parser (String -> AST)
      const tokens = tokenize(expression);
      const ast = parse(tokens, validVariables);

      // Gerar as linhas na mesma ordem da Tabela Verdade
      const rows = generateTruthTable(numVars, ordering);
      
      const newValues: CellValue[] = rows.map((row) => {
        // Montar contexto (dicionário VarName: Valor)
        const context: Record<string, number> = {};
        for (let i = 0; i < numVars; i++) {
          context[variables[i].name] = row[i];
        }

        // Tentar resolver. CellValue é 0, 1 ou '-'. AST devolve 0 ou 1.
        return evaluateAST(ast, context) as CellValue;
      });

      onApply(selectedOutput, newValues);
      
    } catch (e: any) {
      if (e instanceof ExpressionError) {
        setError(`Erro de sintaxe (pos ${e.position}): ${e.message}`);
      } else {
        setError(`Erro: ${e.message}`);
      }
    }
  }, [expression, variables, numVars, ordering, selectedOutput, onApply]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span>Preencher via Expressão</span>
        </label>
        <div className="text-xs text-muted">
          Exemplos: <code className="bg-background px-1.5 py-0.5 rounded text-foreground font-mono">A * B' + C</code> ou <code className="bg-background px-1.5 py-0.5 rounded text-foreground font-mono">(A ^ B) + !C</code>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 flex-shrink-0">
          <span className="text-sm text-muted whitespace-nowrap">Saída:</span>
          <select
            value={selectedOutput}
            onChange={(e) => setSelectedOutput(Number(e.target.value))}
            className="bg-transparent text-sm font-semibold text-foreground focus:outline-none py-2"
          >
            {outputs.map((out, idx) => (
              <option key={idx} value={idx}>{out.name}</option>
            ))}
          </select>
          <span className="text-sm font-bold text-muted ml-1">=</span>
        </div>

        <input
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          placeholder="Ex: A * B' + C"
          className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-mono text-foreground placeholder:font-sans placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-all"
        />

        <button
          onClick={handleApply}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 flex-shrink-0 active:scale-95"
        >
          Aplicar
        </button>
      </div>

      {error && (
        <div className="text-xs font-semibold text-danger mt-1 animate-in slide-in-from-top-1">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
