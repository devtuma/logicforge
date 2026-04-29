import Link from 'next/link';

export const metadata = {
  title: 'Aguardando Aprovação — LogicForge',
};

export default function PendingPage() {
  return (
    <div className="pending-container">
      <div className="pending-card">
        <div className="pending-icon">⏳</div>
        <h1 className="pending-title">Conta em análise</h1>
        <p className="pending-description">
          Sua conta foi criada com sucesso! O administrador irá revisar e
          aprovar seu acesso em breve.
        </p>
        <p className="pending-hint">
          Você receberá acesso assim que seu cadastro for aprovado. Pode
          tentar fazer login novamente depois.
        </p>
        <Link href="/login" className="pending-back">
          Voltar ao login
        </Link>
      </div>

      <style jsx>{`
        .pending-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          padding: 2rem;
        }
        .pending-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 3rem 2.5rem;
          max-width: 480px;
          width: 100%;
          text-align: center;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
        }
        .pending-icon {
          font-size: 4rem;
          margin-bottom: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .pending-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 1rem;
        }
        .pending-description {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin-bottom: 1rem;
        }
        .pending-hint {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .pending-back {
          display: inline-block;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-radius: 0.75rem;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s, transform 0.2s;
        }
        .pending-back:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
