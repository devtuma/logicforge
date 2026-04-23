'use client';

// Pré-visualização de código com numeração de linhas, botão de copiar e download

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { downloadFile } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export interface CodePreviewProps {
  code: string;
  language: string;
  filename: string;
}

export function CodePreview({ code, language, filename }: CodePreviewProps) {
  const [copied, setCopied] = useState(false);

  const lines = code.split('\n');

  /** Copia o código para a área de transferência */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  /** Faz o download do código como arquivo */
  const handleDownload = useCallback(() => {
    const mimeType =
      language === 'xml' ? 'application/xml' : 'text/plain';
    downloadFile(code, filename, mimeType);
  }, [code, filename, language]);

  return (
    <div className="rounded-lg border border-gray-700 dark:border-gray-600 overflow-hidden">
      {/* Barra de título */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {/* Indicador de linguagem */}
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-700 text-gray-300">
            {language}
          </span>
          <span className="text-sm text-gray-400 font-mono">{filename}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão de copiar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            title="Copiar código"
          >
            {copied ? (
              <span className="text-xs text-green-400">Copiado!</span>
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

          {/* Botão de download */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            title="Baixar arquivo"
          >
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* Área de código com numeração de linhas */}
      <div className="overflow-x-auto bg-gray-900 dark:bg-gray-950">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                {/* Número da linha */}
                <span className="inline-block w-10 text-right mr-4 text-gray-600 select-none shrink-0">
                  {i + 1}
                </span>
                {/* Conteúdo da linha */}
                <span
                  className={cn(
                    'text-gray-200',
                    // Destaque básico: comentários em verde, strings em amarelo
                    (line.trimStart().startsWith('//') ||
                      line.trimStart().startsWith('(*') ||
                      line.trimStart().startsWith('<!--')) &&
                      'text-green-400',
                    (line.includes(':=') || line.includes('VAR')) &&
                      !line.trimStart().startsWith('//') &&
                      'text-blue-300'
                  )}
                >
                  {line || '\n'}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
