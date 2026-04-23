// Hook customizado para operações CRUD de projeto via API

import { useState, useCallback } from 'react';
import type { ProjectData } from '@/lib/engine/types';

export interface UseProjectReturn {
  loading: boolean;
  error: string | null;
  saveProject: (data: ProjectData & { id?: string; name: string }) => Promise<string | null>;
  loadProject: (id: string) => Promise<ProjectData | null>;
  deleteProject: (id: string) => Promise<boolean>;
  clearError: () => void;
}

export function useProject(): UseProjectReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Limpa o estado de erro */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Salva um projeto via API (POST para novo, PUT para existente).
   * Retorna o ID do projeto salvo ou null em caso de erro.
   */
  const saveProject = useCallback(
    async (data: ProjectData & { id?: string; name: string }): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id
          ? `/api/projects/${data.id}`
          : '/api/projects';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Erro ao salvar projeto (${response.status})`
          );
        }

        const result = await response.json();
        return result.id || data.id || null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro desconhecido ao salvar';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Carrega um projeto pelo ID via API.
   * Retorna os dados do projeto ou null em caso de erro.
   */
  const loadProject = useCallback(
    async (id: string): Promise<ProjectData | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${id}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Erro ao carregar projeto (${response.status})`
          );
        }

        const data = await response.json();
        return {
          variables: data.variables,
          outputs: data.outputs,
          ordering: data.ordering,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro desconhecido ao carregar';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Remove um projeto pelo ID via API.
   * Retorna true se removido com sucesso, false caso contrário.
   */
  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Erro ao excluir projeto (${response.status})`
          );
        }

        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro desconhecido ao excluir';
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    saveProject,
    loadProject,
    deleteProject,
    clearError,
  };
}
