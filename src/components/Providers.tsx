'use client';

// Componente de providers globais da aplicação
// Necessário para NextAuth v4 funcionar com App Router

import { SessionProvider } from 'next-auth/react';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}
