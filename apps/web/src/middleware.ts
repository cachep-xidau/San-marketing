import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/'];

const AUTH_SECRET = new TextEncoder().encode(
    process.env.AUTH_SECRET || 'fallback-dev-secret-change-me'
);

const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
    CMO: ['/cmo', '/manager', '/staff', '/settings'],
    HEAD: ['/cmo', '/manager', '/staff', '/settings'],
    MANAGER: ['/manager', '/staff', '/settings'],
    STAFF: ['/staff', '/settings'],
};

const ROLE_DEFAULT: Record<string, string> = {
    CMO: '/cmo',
    HEAD: '/cmo',
    MANAGER: '/manager',
    STAFF: '/staff',
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths and API routes
    if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Get JWT from cookie
    const token = request.cookies.get('mh_session')?.value;
    if (!token) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Verify JWT signature — reject tampered cookies
    let session: { role: string };
    try {
        const { payload } = await jwtVerify(token, AUTH_SECRET);
        session = { role: payload.role as string };
    } catch {
        // Invalid/expired JWT — clear cookie and redirect
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.set('mh_session', '', { path: '/', maxAge: 0 });
        return response;
    }

    // Check role access
    const allowedPaths = ROLE_ALLOWED_PATHS[session.role] || [];
    const hasAccess = allowedPaths.some(p => pathname.startsWith(p));

    if (!hasAccess) {
        const defaultPath = ROLE_DEFAULT[session.role] || '/';
        return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
