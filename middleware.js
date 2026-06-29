import { NextResponse } from 'next/server';

/** Supabase sometimes redirects to Site URL root (/?code=) instead of /auth/callback */
export function middleware(request) {
  const url = request.nextUrl;
  if (url.pathname === '/auth/callback') {
    return NextResponse.next();
  }

  const hasCode = url.searchParams.has('code');
  const hasOAuthError =
    url.searchParams.has('error') || url.searchParams.has('error_description');
  if (!hasCode && !hasOAuthError) {
    return NextResponse.next();
  }

  const dest = url.clone();
  dest.pathname = '/auth/callback';
  if (!dest.searchParams.has('next')) {
    dest.searchParams.set('next', '/account');
  }
  return NextResponse.redirect(dest);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|js|css|uploads).*)'],
};
