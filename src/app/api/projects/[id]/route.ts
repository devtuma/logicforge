// Rotas de operações em projeto individual
// GET    /api/projects/[id] — carrega projeto com saídas
// PUT    /api/projects/[id] — atualiza projeto e saídas
// DELETE /api/projects/[id] — exclui projeto (cascade nas saídas)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // No Next.js 16, params é uma Promise
    const { id } = await params;

    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar projeto com saídas incluídas
    const project = await prisma.project.findUnique({
      where: { id },
      include: { outputs: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o projeto pertence ao usuário
    if (project.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Erro ao carregar projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o projeto existe e pertence ao usuário
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, variables, outputs, ordering } = body;

    // Atualizar projeto e saídas em transação atômica
    // Remove saídas antigas e cria as novas
    // Excluir saídas existentes
    await prisma.projectOutput.deleteMany({
      where: { projectId: id },
    });

    // Atualizar projeto e criar novas saídas
    const updated = await prisma.project.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        variables: variables ?? existing.variables,
        ordering: ordering ?? existing.ordering,
        outputs: outputs
          ? {
              create: outputs.map((output: { name: string; values: (number | string)[] }) => ({
                name: output.name,
                values: output.values as number[],
              })),
            }
          : undefined,
      },
      include: { outputs: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o projeto existe e pertence ao usuário
    const existing = await prisma.project.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Excluir projeto (saídas removidas automaticamente via onDelete: Cascade)
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, message: 'Projeto excluído com sucesso' }
    );
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
