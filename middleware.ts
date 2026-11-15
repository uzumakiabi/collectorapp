import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized: ({ token }) => !!token?.id,
  },
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.svg|og-image\\.png|login|signup|forgot-password|reset-password).*)',
  ],
};
