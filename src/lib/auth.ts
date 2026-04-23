// Configuração do NextAuth.js v4 para autenticação
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    // Login com Google
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    // Login com email/senha
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user || !user.password) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch {
          // Se o banco de dados não estiver disponível, retorna null
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // Adiciona o ID do usuário ao token JWT
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Adiciona o ID do usuário à sessão
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    // Cria usuário no banco ao fazer login com Google
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
              },
            });
          }
        } catch {
          // Se o banco não estiver disponível, permite login mas sem persistência
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
