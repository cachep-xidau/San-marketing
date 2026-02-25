import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_PATHS = ['/', '/api/auth/login', '/api/auth/logout'];

function getAuthSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error('AUTH_SECRET environment variable is required');
    return new TextEncoder().encode(secret);
}

const ROLE_ALLOWED_PATHS: Record<string, string[]> = {
    CMO: ['/cmo', '/manager', '/staff', '/settings', '/api/marketing', '/api/auth/me'],
    HEAD: ['/cmo', '/manager', '/staff', '/settings', '/api/marketing', '/api/auth/me'],
    MANAGER: ['/manager', '/staff', '/settings', '/api/marketing', '/api/auth/me'],
    STAFF: ['/staff', '/settings', '/api/marketing', '/api/auth/me'],
};

const ROLE_DEFAULT: Record<string, string> = {
    CMO: '/cmo',
    HEAD: '/cmo',
    MANAGER: '/manager',
    STAFF: '/staff',
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.next();
    }

    // Allow static assets
    if (pathname.startsWith('/_next/') || pathname.startsWith('/logos/') || pathname === '/robots.txt') {
        return NextResponse.next();
    }

    // Get JWT from cookie
    const token = request.cookies.get('mh_session')?.value;
    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Verify JWT signature — reject tampered cookies
    let session: { role: string };
    try {
        const { payload } = await jwtVerify(token, getAuthSecret());
        session = { role: payload.role as string };
    } catch {
        // Invalid/expired JWT — clear cookie and redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const response = NextResponse.redirect(new URL('/', request.url));
        response.cookies.set('mh_session', '', { path: '/', maxAge: 0 });
        return response;
    }

    // Check role access
    const allowedPaths = ROLE_ALLOWED_PATHS[session.role] || [];
    const hasAccess = allowedPaths.some(p => pathname.startsWith(p));

    if (!hasAccess) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const defaultPath = ROLE_DEFAULT[session.role] || '/';
        return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|logos/).*)'],
};
