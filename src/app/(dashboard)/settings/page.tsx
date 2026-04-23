'use client';

// Página de configurações do usuário

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

/** Opções de marca de CLP */
const CLP_BRANDS = [
  { value: 'rockwell', label: 'Rockwell / Allen-Bradley' },
  { value: 'siemens', label: 'Siemens' },
  { value: 'abb', label: 'ABB' },
  { value: 'schneider', label: 'Schneider Electric' },
];

/** Opções de nomenclatura de variáveis */
const NAMING_CONVENTIONS = [
  { value: 'letters', label: 'Letras (A, B, C, D)' },
  { value: 'x-indexed', label: 'Indexadas (X0, X1, X2, X3)' },
  { value: 'input', label: 'Nomeadas (Input1, Input2, ...)' },
];

/** Opções de tema */
const THEME_OPTIONS = [
  { value: 'system', label: 'Automático (sistema)' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

export default function SettingsPage() {
  const { data: session } = useSession();

  const [theme, setTheme] = useState('system');
  const [namingConvention, setNamingConvention] = useState('letters');
  const [defaultBrand, setDefaultBrand] = useState('rockwell');
  const [saved, setSaved] = useState(false);

  /** Carrega preferências do localStorage na montagem */
  useEffect(() => {
    const storedTheme = localStorage.getItem('logicforge-theme') || 'system';
    const storedNaming = localStorage.getItem('logicforge-naming') || 'letters';
    const storedBrand = localStorage.getItem('logicforge-brand') || 'rockwell';

    setTheme(storedTheme);
    setNamingConvention(storedNaming);
    setDefaultBrand(storedBrand);
  }, []);

  /** Aplica o tema selecionado */
  function applyTheme(value: string) {
    setTheme(value);
    localStorage.setItem('logicforge-theme', value);

    if (value === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (value === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // Automático: usa preferência do sistema
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  /** Salva todas as configurações */
  function handleSave() {
    applyTheme(theme);
    localStorage.setItem('logicforge-naming', namingConvention);
    localStorage.setItem('logicforge-brand', defaultBrand);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Tema */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-foreground mb-4">Aparência</h2>
        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-foreground mb-1.5">
            Tema
          </label>
          <select
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          >
            {THEME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Padrões do editor */}
      <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-base font-bold text-foreground mb-4">Padrões do Editor</h2>

        <div>
          <label htmlFor="naming" className="block text-sm font-medium text-foreground mb-1.5">
            Nomenclatura de variáveis
          </label>
          <select
            id="naming"
            value={namingConvention}
            onChange={(e) => setNamingConvention(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          >
            {NAMING_CONVENTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-foreground mb-1.5">
            Marca de CLP padrão
          </label>
          <select
            id="brand"
            value={defaultBrand}
            onChange={(e) => setDefaultBrand(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          >
            {CLP_BRANDS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Conta */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-bold text-foreground mb-4">Conta</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Nome</label>
            <p className="text-sm text-foreground">
              {session?.user?.name || 'Não informado'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Email</label>
            <p className="text-sm text-foreground">
              {session?.user?.email || 'Não informado'}
            </p>
          </div>
        </div>
      </section>

      {/* Botão salvar */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors"
        >
          Salvar Configurações
        </button>
        {saved && (
          <span className="text-sm text-success font-medium animate-fade-in">
            Configurações salvas!
          </span>
        )}
      </div>
    </div>
  );
}
