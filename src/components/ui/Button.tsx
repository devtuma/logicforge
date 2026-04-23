'use client';

// Componente de botão reutilizável com variantes visuais e estados

import { cn } from '@/lib/utils';

/** Variantes visuais do botão */
const variantStyles = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-sm',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
} as const;

/** Tamanhos do botão */
const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

/** Ícone de carregamento animado */
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
}
