'use client';

// Página de registro de nova conta

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** Valida e envia o formulário de registro */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validação de email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Formato de email inválido.');
      return;
    }

    // Validação de senha
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    // Validação de confirmação
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta.');
      } else {
        router.push('/login');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground text-center mb-6">
        Criar nova conta
      </h1>

      {/* Mensagem de erro */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      {/* Formulário de registro */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
            Nome
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Seu nome"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
            Confirmar senha
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="Repita a senha"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Criando conta...' : 'Criar Conta'}
        </button>
      </form>

      {/* Link para login */}
      <p className="mt-6 text-center text-sm text-muted">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-accent hover:text-accent-hover font-medium transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  );
}
