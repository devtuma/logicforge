'use client';

// Componente de input estilizado com label e mensagem de erro

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Identificador único para associar label ao input */
  inputId?: string;
}

export function Input({
  label,
  error,
  inputId,
  className,
  ...props
}: InputProps) {
  const id = inputId || props.id;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'rounded-md border px-3 py-2 text-sm transition-colors',
          'bg-white text-gray-900 border-gray-300 placeholder-gray-400',
          'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'dark:focus:ring-blue-400 dark:focus:border-blue-400',
          error &&
            'border-red-500 focus:ring-red-500 focus:border-red-500 dark:border-red-400',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
