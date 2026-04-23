'use client';

// Alternador de tema claro/escuro com persistência em localStorage

import { useState, useEffect } from 'react';

/** Ícone de sol para o modo escuro (mostra que clicando volta ao claro) */
function SunIcon() {
  return (
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
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

/** Ícone de lua para o modo claro (mostra que clicando vai ao escuro) */
function MoonIcon() {
  return (
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
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  /** Inicializa o tema a partir do localStorage ou preferência do sistema */
  useEffect(() => {
    const stored = localStorage.getItem('logicforge-theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      setDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Sem preferência salva: usa a preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDark(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
    setMounted(true);
  }, []);

  /** Alterna entre claro e escuro */
  function toggle() {
    const newDark = !dark;
    setDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('logicforge-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('logicforge-theme', 'light');
    }
  }

  // Evita flash de conteúdo incorreto durante SSR
  if (!mounted) {
    return (
      <button
        className="p-2 rounded-md bg-gray-100 dark:bg-gray-800"
        aria-label="Alternar tema"
        disabled
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
