import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/'];

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

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.includes(pathname)) {
        return NextResponse.next();
    }

    // Parse session from cookie
    const sessionCookie = request.cookies.get('mh_session');
    if (!sessionCookie?.value) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    let session: { role: string };
    try {
        session = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Check role access
    const allowedPaths = ROLE_ALLOWED_PATHS[session.role] || [];
    const hasAccess = allowedPaths.some(p => pathname.startsWith(p));

    if (!hasAccess) {
        // Redirect to role's default dashboard
        const defaultPath = ROLE_DEFAULT[session.role] || '/';
        return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
