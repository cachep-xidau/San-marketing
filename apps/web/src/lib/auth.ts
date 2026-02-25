import type { UserRole } from '@marketing-hub/shared';

export interface SessionUser {
    email: string;
    name: string;
    role: UserRole;
}

/**
 * Parse session from cookie (client-side)
 */
export function getSession(): SessionUser | null {
    if (typeof document === 'undefined') return null;

    const cookie = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('mh_session='));

    if (!cookie) return null;

    try {
        return JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
    } catch {
        return null;
    }
}

/**
 * Parse session from cookie string (server-side)
 */
export function getSessionFromCookies(cookieHeader: string | null): SessionUser | null {
    if (!cookieHeader) return null;

    const cookie = cookieHeader
        .split(';')
        .find(c => c.trim().startsWith('mh_session='));

    if (!cookie) return null;

    try {
        return JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
    } catch {
        return null;
    }
}

/**
 * Logout — clear session cookie
 */
export function logout() {
    document.cookie = 'mh_session=;path=/;max-age=0';
}
