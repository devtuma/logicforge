import Link from 'next/link';

export const metadata = {
  title: 'Aguardando Aprovação — LogicForge',
};

export default function PendingPage() {
  return (
    <>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)',
        padding: '2rem',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '1.5rem',
          padding: '3rem 2.5rem',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⏳</div>

          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 1rem',
          }}>
            Conta em análise
          </h1>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.6,
            marginBottom: '1rem',
          }}>
            Sua conta foi criada com sucesso! O administrador irá revisar e
            aprovar seu acesso em breve.
          </p>

          <p style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            Você receberá acesso assim que seu cadastro for aprovado. Pode
            tentar fazer login novamente depois.
          </p>

          <Link href="/login" style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            borderRadius: '0.75rem',
            textDecoration: 'none',
            fontWeight: 600,
          }}>
            Voltar ao login
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </>
  );
}
