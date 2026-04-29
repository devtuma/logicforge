import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/users — lista todos os usuários
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

// PATCH /api/admin/users — atualiza status ou role de um usuário
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const { userId, status, role } = body as {
    userId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    role?: 'USER' | 'ADMIN';
  };

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  // Impede o admin de se auto-revogar
  if (userId === session.user.id && status === 'REJECTED') {
    return NextResponse.json(
      { error: 'Você não pode revogar seu próprio acesso' },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(status && { status }),
      ...(role && { role }),
    },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  return NextResponse.json(updated);
}
