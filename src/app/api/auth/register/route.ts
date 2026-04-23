// Rota de registro de novos usuários
// POST /api/auth/register — cria conta com email e senha

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // Validação dos campos obrigatórios
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Validação do formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Validação da senha (mínimo 6 caracteres)
    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe uma conta com este email' },
        { status: 409 }
      );
    }

    // Gerar hash da senha com bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário no banco de dados
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Conta criada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
