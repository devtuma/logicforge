import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Rotas do admin: só ADMIN
    if (pathname.startsWith('/admin')) {
      if (token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/projects', req.url));
      }
    }

    // Dashboard: só APPROVED (ou ADMIN)
    if (pathname.startsWith('/projects') || pathname.startsWith('/settings')) {
      if (token?.status !== 'APPROVED' && token?.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/pending', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/projects/:path*', '/settings/:path*', '/admin/:path*'],
};
