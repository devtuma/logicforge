// Página de listagem de projetos
// Server Component com fallback para modo sem banco de dados

import Link from 'next/link';
import { ProjectEditor } from '@/components/editor/ProjectEditor';

/** Tipo simplificado de projeto para exibição na lista */
interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  variableCount: number;
  outputCount: number;
  updatedAt: string;
}

/** Tenta buscar projetos da API interna */
async function fetchProjects(): Promise<ProjectSummary[] | null> {
  try {
    // Em ambiente de desenvolvimento sem banco, retorna null para exibir fallback
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/projects`, {
      cache: 'no-store',
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Sem conexão com API — modo fallback
    return null;
  }
}

/** Ícone de pasta vazia */
function EmptyIcon() {
  return (
    <svg className="h-16 w-16 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l2 2 4-4" />
    </svg>
  );
}

/** Card de projeto individual */
function ProjectCard({ project }: { project: ProjectSummary }) {
  const updatedDate = new Date(project.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group block rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md hover:border-accent/40 transition-all duration-200"
    >
      <h3 className="text-base font-bold text-foreground group-hover:text-accent transition-colors mb-1">
        {project.name}
      </h3>
      <p className="text-sm text-muted line-clamp-2 mb-4">
        {project.description || 'Sem descrição'}
      </p>
      <div className="flex items-center gap-4 text-xs text-muted">
        <span>{project.variableCount} variáveis</span>
        <span>{project.outputCount} saídas</span>
        <span className="ml-auto">{updatedDate}</span>
      </div>
    </Link>
  );
}

export default async function ProjectsPage() {
  const projects = await fetchProjects();

  // Modo fallback: sem banco de dados, exibe o editor diretamente
  if (projects === null) {
    return (
      <div>
        <div className="mb-6 p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-foreground">
          <strong>Modo offline:</strong> Banco de dados não conectado. Usando o editor diretamente.
        </div>
        <ProjectEditor />
      </div>
    );
  }

  return (
    <div>
      {/* Cabeçalho da página */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Meus Projetos</h2>
          <p className="text-sm text-muted mt-1">
            {projects.length} projeto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Projeto
        </Link>
      </div>

      {/* Lista de projetos ou estado vazio */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <EmptyIcon />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            Nenhum projeto encontrado
          </h3>
          <p className="mt-2 text-sm text-muted max-w-sm">
            Crie seu primeiro projeto para começar a simplificar expressões booleanas para CLPs.
          </p>
          <Link
            href="/projects/new"
            className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-colors"
          >
            Criar primeiro projeto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
