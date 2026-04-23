// Layout centralizado para páginas de autenticação (login e registro)

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo e nome */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <svg className="h-10 w-10" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="6" className="fill-accent" />
            <path d="M10 10h4v12h-4V10zm8 0h4v6h-4v-6zm8 4h-4v8h4v-8z" fill="white" />
          </svg>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            LogicForge
          </span>
        </div>

        {/* Card de conteúdo */}
        <div className="rounded-xl border border-border bg-surface p-8 shadow-lg">
          {children}
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-muted">
          LogicForge &copy; 2024 — Lógica Booleana para CLPs
        </p>
      </div>
    </div>
  );
}
