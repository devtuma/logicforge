// Página do editor de projeto individual
// Server Component — params é uma Promise no Next.js 16

import { ProjectEditor } from '@/components/editor/ProjectEditor';

/** Tipo dos dados de projeto carregados da API */
interface ProjectAPIData {
  id: string;
  name: string;
  variables: Array<{ name: string; description: string }>;
  outputs: Array<{ name: string; values: Array<0 | 1 | 'X'> }>;
  ordering: 'binary' | 'gray';
}

/** Busca os dados do projeto na API */
async function fetchProject(id: string): Promise<ProjectAPIData | null> {
  // Projeto novo — não precisa buscar
  if (id === 'new') return null;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function ProjectEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16: params é uma Promise — deve usar await
  const { id } = await params;

  const project = await fetchProject(id);

  return (
    <div>
      {/* Indicador de projeto novo */}
      {id === 'new' && (
        <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/20 text-sm text-foreground">
          Configure as variáveis e saídas abaixo e clique em{' '}
          <strong>Gerar Tabela</strong> para começar.
        </div>
      )}

      <ProjectEditor initialData={project ?? undefined} />
    </div>
  );
}
