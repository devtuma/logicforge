// Configuração do NextAuth.js v4 para autenticação
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    // Login com Google (só ativo se as credenciais estiverem configuradas)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Login com email/senha
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({ where: { email } });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          // Bloqueia login se não aprovado
          if (user.status === 'REJECTED') {
            throw new Error('REJECTED');
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            status: user.status,
          };
        } catch (e: unknown) {
          if (e instanceof Error && e.message === 'REJECTED') throw e;
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // Adiciona id, role e status ao token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.status = (user as { status?: string }).status;
      }
      // Sempre re-busca status do banco para refletir aprovações em tempo real
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, status: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.status = dbUser.status;
          }
        } catch {
          // mantém valores do token se banco indisponível
        }
      }
      return token;
    },
    // Expõe id, role e status na sessão
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.status = token.status as string;
      }
      return session;
    },
    // Cria usuário no banco ao fazer login com Google; bloqueia se REJECTED
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (!existing) {
            await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                status: 'PENDING',
                role: 'USER',
              },
            });
            // Redireciona para pending após registro via Google
            return '/pending';
          }

          if (existing.status === 'REJECTED') return false;
          if (existing.status === 'PENDING') return '/pending';
        } catch {
          // Permite login mas sem persistência se banco indisponível
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
