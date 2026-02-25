import type { UserRole } from '@marketing-hub/shared';

export interface SessionUser {
    email: string;
    name: string;
    role: UserRole;
}

/**
 * Fetch current user from server-side JWT session.
 * Since the cookie is HttpOnly, we must call the API to read it.
 */
export async function fetchSession(): Promise<SessionUser | null> {
    try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) return null;
        const data = await res.json();
        return data.user || null;
    } catch {
        return null;
    }
}

/**
 * Logout — calls server to clear HttpOnly cookie
 */
export async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/';
}
