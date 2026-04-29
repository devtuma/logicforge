'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: 'USER' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

type Filter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && session.user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, session, router, fetchUsers]);

  const updateUser = async (
    userId: string,
    data: { status?: User['status']; role?: User['role'] }
  ) => {
    setActionLoading(userId);
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    });
    if (res.ok) {
      const updated: User = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
      );
    }
    setActionLoading(null);
  };

  const filtered = users.filter((u) =>
    filter === 'ALL' ? true : u.status === filter
  );

  const counts = {
    ALL: users.length,
    PENDING: users.filter((u) => u.status === 'PENDING').length,
    APPROVED: users.filter((u) => u.status === 'APPROVED').length,
    REJECTED: users.filter((u) => u.status === 'REJECTED').length,
  };

  if (status === 'loading' || loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <style jsx>{`
          .admin-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0f0f1a;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-inner">
        {/* Header */}
        <div className="admin-header">
          <div>
            <h1 className="admin-title">⚙️ Painel Admin</h1>
            <p className="admin-subtitle">Gerencie o acesso dos usuários ao LogicForge</p>
          </div>
          <button className="admin-back-btn" onClick={() => router.push('/dashboard')}>
            ← Dashboard
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''} tab-${f.toLowerCase()}`}
              onClick={() => setFilter(f)}
            >
              {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendentes' : f === 'APPROVED' ? 'Aprovados' : 'Rejeitados'}
              <span className="tab-count">{counts[f]}</span>
            </button>
          ))}
        </div>

        {/* Users List */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>Nenhum usuário {filter !== 'ALL' ? filter.toLowerCase() : ''} encontrado.</p>
          </div>
        ) : (
          <div className="users-list">
            {filtered.map((user) => (
              <div key={user.id} className={`user-card status-${user.status.toLowerCase()}`}>
                <div className="user-avatar">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user.name ?? ''} className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      {(user.name ?? user.email)[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="user-info">
                  <div className="user-name">
                    {user.name ?? '—'}
                    {user.role === 'ADMIN' && <span className="admin-badge">ADMIN</span>}
                  </div>
                  <div className="user-email">{user.email}</div>
                  <div className="user-date">
                    Cadastro: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="status-badge-wrap">
                  <span className={`status-badge badge-${user.status.toLowerCase()}`}>
                    {user.status === 'PENDING' ? '⏳ Pendente' : user.status === 'APPROVED' ? '✅ Aprovado' : '❌ Rejeitado'}
                  </span>
                </div>

                <div className="user-actions">
                  {user.status !== 'APPROVED' && (
                    <button
                      className="action-btn approve"
                      disabled={actionLoading === user.id}
                      onClick={() => updateUser(user.id, { status: 'APPROVED' })}
                    >
                      {actionLoading === user.id ? '...' : 'Aprovar'}
                    </button>
                  )}
                  {user.status !== 'REJECTED' && user.id !== session?.user.id && (
                    <button
                      className="action-btn reject"
                      disabled={actionLoading === user.id}
                      onClick={() => updateUser(user.id, { status: 'REJECTED' })}
                    >
                      {actionLoading === user.id ? '...' : user.status === 'APPROVED' ? 'Revogar' : 'Rejeitar'}
                    </button>
                  )}
                  {user.role !== 'ADMIN' && user.id !== session?.user.id && (
                    <button
                      className="action-btn promote"
                      disabled={actionLoading === user.id}
                      onClick={() => updateUser(user.id, { role: 'ADMIN' })}
                    >
                      Tornar Admin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .admin-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          padding: 2rem 1rem;
          font-family: 'Inter', 'Segoe UI', sans-serif;
        }
        .admin-inner {
          max-width: 900px;
          margin: 0 auto;
        }
        .admin-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .admin-title {
          font-size: 2rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 0.25rem;
        }
        .admin-subtitle {
          color: rgba(255,255,255,0.5);
          margin: 0;
        }
        .admin-back-btn {
          padding: 0.6rem 1.25rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.75rem;
          color: rgba(255,255,255,0.7);
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s;
        }
        .admin-back-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .filter-tab {
          padding: 0.5rem 1rem;
          border-radius: 0.625rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          transition: all 0.2s;
        }
        .filter-tab:hover { color: #fff; background: rgba(255,255,255,0.08); }
        .filter-tab.active { color: #fff; font-weight: 600; }
        .filter-tab.active.tab-pending { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #fbbf24; }
        .filter-tab.active.tab-approved { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.4); color: #34d399; }
        .filter-tab.active.tab-rejected { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #f87171; }
        .filter-tab.active.tab-all { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); color: #818cf8; }
        .tab-count {
          background: rgba(255,255,255,0.1);
          border-radius: 999px;
          padding: 0 0.45rem;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: rgba(255,255,255,0.3);
        }

        .users-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .user-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1rem;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
          transition: border-color 0.2s;
        }
        .user-card.status-pending { border-left: 3px solid #f59e0b; }
        .user-card.status-approved { border-left: 3px solid #10b981; }
        .user-card.status-rejected { border-left: 3px solid #ef4444; opacity: 0.65; }

        .user-avatar { flex-shrink: 0; }
        .avatar-img { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }
        .avatar-placeholder {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-weight: 700; font-size: 1.1rem;
        }

        .user-info { flex: 1; min-width: 180px; }
        .user-name {
          color: #fff; font-weight: 600; font-size: 0.95rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .admin-badge {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff; font-size: 0.65rem; font-weight: 700;
          padding: 0.15rem 0.5rem; border-radius: 999px;
          letter-spacing: 0.05em;
        }
        .user-email { color: rgba(255,255,255,0.5); font-size: 0.85rem; margin-top: 0.2rem; }
        .user-date { color: rgba(255,255,255,0.3); font-size: 0.75rem; margin-top: 0.2rem; }

        .status-badge-wrap { flex-shrink: 0; }
        .status-badge {
          padding: 0.35rem 0.85rem; border-radius: 999px;
          font-size: 0.8rem; font-weight: 600;
        }
        .badge-pending { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .badge-approved { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-rejected { background: rgba(239,68,68,0.15); color: #f87171; }

        .user-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .action-btn {
          padding: 0.45rem 1rem; border-radius: 0.6rem; border: none;
          font-size: 0.825rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .action-btn.approve { background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
        .action-btn.approve:hover:not(:disabled) { background: rgba(16,185,129,0.35); }
        .action-btn.reject { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
        .action-btn.reject:hover:not(:disabled) { background: rgba(239,68,68,0.3); }
        .action-btn.promote { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
        .action-btn.promote:hover:not(:disabled) { background: rgba(99,102,241,0.3); }
      `}</style>
    </div>
  );
}
