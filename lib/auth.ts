import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        if (!rateLimit(`login:${credentials.email.toLowerCase()}`, 10, 15 * 60 * 1000)) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (!user) return null;
          const isValid = await bcrypt.compare(credentials.password, user.hashedPassword);
          if (!isValid) return null;
          return { id: user.id, email: user.email, name: user.name, tokenVersion: user.tokenVersion };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tokenVersion = user.tokenVersion;
      } else if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true },
        });
        if (!dbUser || dbUser.tokenVersion !== token.tokenVersion) {
          delete token.id;
          delete token.tokenVersion;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        return { expires: session.expires } as any;
      }
      if (session?.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
