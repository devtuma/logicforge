// Rotas de listagem e criação de projetos
// GET  /api/projects — lista projetos do usuário autenticado
// POST /api/projects — cria novo projeto com saídas

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar projetos do usuário com as saídas incluídas
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: { outputs: true },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, variables, outputs, ordering } = body;

    // Validação dos campos obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome do projeto é obrigatório' },
        { status: 400 }
      );
    }

    if (!variables || !Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json(
        { error: 'Variáveis são obrigatórias' },
        { status: 400 }
      );
    }

    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      return NextResponse.json(
        { error: 'Pelo menos uma saída é obrigatória' },
        { status: 400 }
      );
    }

    // Criar projeto e saídas em uma transação atômica
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        variables,
        ordering: ordering || 'binary',
        userId: session.user!.id,
        outputs: {
          create: outputs.map((output: { name: string; values: (number | string)[] }) => ({
            name: output.name,
            values: output.values as number[],
          })),
        },
      },
      include: { outputs: true },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar projeto:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
