'use client';

// Componente modal com overlay, título e botão de fechar

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  /** Fecha o modal ao pressionar Escape */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fundo escurecido */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Conteúdo do modal */}
      <div
        className={cn(
          'relative z-10 w-full max-w-lg rounded-lg shadow-xl',
          'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
          'mx-4',
          className
        )}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
