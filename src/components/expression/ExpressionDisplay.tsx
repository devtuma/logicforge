'use client';

// Exibição da expressão booleana simplificada
// Permite alternar entre SOP e POS, com botão de copiar

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface ExpressionDisplayProps {
  sopExpression: string;
  posExpression: string;
  outputName: string;
}

export function ExpressionDisplay({
  sopExpression,
  posExpression,
  outputName,
}: ExpressionDisplayProps) {
  const [mode, setMode] = useState<'SOP' | 'POS'>('SOP');
  const [copied, setCopied] = useState(false);

  const expression = mode === 'SOP' ? sopExpression : posExpression;
  const isEmpty = expression === '0' && sopExpression === '0' && posExpression === '0';

  /** Copia a expressão atual para a área de transferência */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${outputName} = ${expression}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback para navegadores sem suporte a clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = `${outputName} = ${expression}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [expression, outputName]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Expressão Simplificada &mdash; {outputName}
        </h3>

        {/* Alternador SOP/POS */}
        <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            onClick={() => setMode('SOP')}
            className={cn(
              'px-3 py-1 text-xs font-medium transition-colors',
              mode === 'SOP'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            SOP
          </button>
          <button
            onClick={() => setMode('POS')}
            className={cn(
              'px-3 py-1 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600',
              mode === 'POS'
                ? 'bg-blue-600 text-white dark:bg-blue-500'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            )}
          >
            POS
          </button>
        </div>
      </div>

      {/* Área de exibição da expressão */}
      <div
        className={cn(
          'relative rounded-md border p-4',
          'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700'
        )}
      >
        {isEmpty ? (
          <span className="text-sm text-gray-400 dark:text-gray-500 italic">
            Nenhum mintermo selecionado
          </span>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <code className="font-mono text-base text-gray-900 dark:text-gray-100 break-all leading-relaxed">
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {outputName}
              </span>
              <span className="text-gray-500 dark:text-gray-400"> = </span>
              <span>{expression}</span>
            </code>

            {/* Botão de copiar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
              title="Copiar expressão"
            >
              {copied ? (
                <svg
                  className="h-4 w-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </Button>
          </div>
        )}

        {/* Indicador do tipo de expressão */}
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          {mode === 'SOP'
            ? 'Soma de Produtos (Sum of Products)'
            : 'Produto de Somas (Product of Sums)'}
        </div>
      </div>
    </div>
  );
}
