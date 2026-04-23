// Página inicial (landing page) do LogicForge
// Server Component — sem 'use client'

import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/** Ícone de tabela (Tabela Verdade) */
function TableIcon() {
  return (
    <svg className="h-10 w-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3zm0 6h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

/** Ícone de grid (Mapa de Karnaugh) */
function GridIcon() {
  return (
    <svg className="h-10 w-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    </svg>
  );
}

/** Ícone de download (Exportação Multi-CLP) */
function DownloadIcon() {
  return (
    <svg className="h-10 w-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 18h16" />
    </svg>
  );
}

/** Ícone de Copilot AI (faísca/IA) */
function CopilotIcon() {
  return (
    <svg className="h-10 w-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

/** Ícone do logo LogicForge */
function LogoIcon({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="6" className="fill-accent" />
      <path d="M10 10h4v12h-4V10zm8 0h4v6h-4v-6zm8 4h-4v8h4v-8z" fill="white" />
    </svg>
  );
}

/** Card de feature */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-border bg-surface p-8 shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{description}</p>
    </div>
  );
}

/** Marca de CLP compatível */
function BrandBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-5 py-2.5 rounded-lg border border-border bg-surface text-sm font-semibold text-muted hover:text-foreground hover:border-accent/40 transition-colors">
      {name}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <LogoIcon />
            <span className="text-xl font-bold tracking-tight text-foreground">LogicForge</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-muted hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-24 sm:py-32">
          <div className="max-w-4xl mx-auto text-center px-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/5 text-accent text-sm font-semibold mb-6">
              <span>✨</span>
              <span>Copilot de IA para Engenheiros de Automação</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Simplifique sua lógica.
              <br />
              <span className="text-accent">Programe qualquer CLP.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
              Descreva o equipamento em linguagem natural — o Copilot IA gera a
              lógica booleana, o mapa de Karnaugh e o diagrama Ladder prontos
              para exportar aos principais CLPs da indústria.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-3.5 rounded-lg bg-accent text-white font-semibold text-base hover:bg-accent-hover shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30"
              >
                Começar Agora
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center px-8 py-3.5 rounded-lg border border-border text-foreground font-semibold text-base hover:bg-surface-hover transition-colors"
              >
                Saiba Mais
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-surface/50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-foreground mb-4">
              Ferramentas para engenheiros de automação
            </h2>
            <p className="text-center text-muted mb-12 max-w-xl mx-auto">
              Do conceito ao código de CLP em minutos, sem cálculos manuais.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<CopilotIcon />}
                title="Copilot IA"
                description="Descreva o funcionamento do equipamento em português. O Copilot projeta a lógica booleana, variáveis e saídas automaticamente."
              />
              <FeatureCard
                icon={<TableIcon />}
                title="Tabela Verdade Interativa"
                description="Defina entradas e saídas, preencha valores e veja simplificação em tempo real. Suporte a don't-care e engenharia reversa de ST legado."
              />
              <FeatureCard
                icon={<GridIcon />}
                title="Mapa de Karnaugh"
                description="Visualização automática com agrupamentos coloridos. Suporte a 1–4 variáveis com identificação de implicantes primos pelo método Quine-McCluskey."
              />
              <FeatureCard
                icon={<DownloadIcon />}
                title="Exportação Multi-CLP"
                description="Exporte em Texto Estruturado, Ladder e Blocos Funcionais para Rockwell, Siemens, ABB e Schneider. Diagrama Ladder com simulação interativa."
              />
            </div>
          </div>
        </section>

        {/* Marcas compatíveis */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-lg font-semibold text-muted mb-8 uppercase tracking-wider">
              Compatível com
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <BrandBadge name="Rockwell / Allen-Bradley" />
              <BrandBadge name="Siemens" />
              <BrandBadge name="ABB" />
              <BrandBadge name="Schneider Electric" />
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-muted">LogicForge &copy; 2025 — Automação Industrial com IA</p>
        </div>
      </footer>
    </div>
  );
}
