'use client';

// Layout do painel principal com sidebar responsiva

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/** Ícone do logo LogicForge */
function LogoIcon() {
  return (
    <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="6" className="fill-accent" />
      <path d="M10 10h4v12h-4V10zm8 0h4v6h-4v-6zm8 4h-4v8h4v-8z" fill="white" />
    </svg>
  );
}

/** Ícone de projetos (pasta) */
function ProjectsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
    </svg>
  );
}

/** Ícone de novo projeto (mais) */
function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

/** Ícone de configurações (engrenagem) */
function SettingsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.212-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

/** Ícone de sair */
function LogoutIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

/** Ícone de menu hambúrguer */
function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

/** Ícone de fechar */
function CloseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** Item de navegação da sidebar */
function NavItem({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-muted hover:text-foreground hover:bg-surface-hover'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/** Título da página baseado na rota */
function getPageTitle(pathname: string): string {
  if (pathname === '/projects') return 'Meus Projetos';
  if (pathname.startsWith('/projects/new')) return 'Novo Projeto';
  if (pathname.startsWith('/projects/')) return 'Editor de Projeto';
  if (pathname === '/settings') return 'Configurações';
  return 'LogicForge';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitle = getPageTitle(pathname);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Cabeçalho da sidebar */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-border">
          <Link href="/projects" className="flex items-center gap-2.5">
            <LogoIcon />
            <span className="text-lg font-bold tracking-tight text-foreground">LogicForge</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            aria-label="Fechar menu"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItem
            href="/projects"
            icon={<ProjectsIcon />}
            label="Projetos"
            active={pathname === '/projects'}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/projects/new"
            icon={<PlusIcon />}
            label="Novo Projeto"
            active={pathname === '/projects/new'}
            onClick={() => setSidebarOpen(false)}
          />
          <NavItem
            href="/settings"
            icon={<SettingsIcon />}
            label="Configurações"
            active={pathname === '/settings'}
            onClick={() => setSidebarOpen(false)}
          />
        </nav>

        {/* Separador */}
        <div className="mx-3 border-t border-border" />

        {/* Info do usuário */}
        <div className="px-4 py-4 space-y-3">
          {session?.user && (
            <div className="text-sm">
              <p className="font-medium text-foreground truncate">
                {session.user.name || 'Usuário'}
              </p>
              <p className="text-muted text-xs truncate">
                {session.user.email}
              </p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogoutIcon />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              aria-label="Abrir menu"
            >
              <MenuIcon />
            </button>
            <h1 className="text-lg font-bold text-foreground">{pageTitle}</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Área de conteúdo */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
