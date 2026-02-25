import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const AUTH_SECRET = new TextEncoder().encode(
    process.env.AUTH_SECRET || 'fallback-dev-secret-change-me'
);

// Users defined SERVER-SIDE ONLY — never shipped to client bundle
const USERS: Record<string, { password: string; name: string; role: string }> = {
    'cmo@sgroup.vn': { password: 'demo', name: 'Minh (CMO)', role: 'CMO' },
    'head@sgroup.vn': { password: 'demo', name: 'Lan (Head)', role: 'HEAD' },
    'manager@sgroup.vn': { password: 'demo', name: 'Hùng (Manager)', role: 'MANAGER' },
    'staff@sgroup.vn': { password: 'demo', name: 'Trang (Staff)', role: 'STAFF' },
};

// In-memory rate limiter
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = attempts.get(ip);

    if (!record || record.resetAt < now) {
        attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return true;
    }

    if (record.count >= MAX_ATTEMPTS) {
        return false;
    }

    record.count++;
    return true;
}

export async function POST(request: Request) {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!checkRateLimit(ip)) {
        return NextResponse.json(
            { error: 'Quá nhiều lần thử. Vui lòng đợi 15 phút.' },
            { status: 429 }
        );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    const user = USERS[email.toLowerCase()];
    if (!user || user.password !== password) {
        return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // Create signed JWT
    const token = await new SignJWT({
        email: email.toLowerCase(),
        name: user.name,
        role: user.role,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(AUTH_SECRET);

    // Set HttpOnly, Secure cookie
    const response = NextResponse.json({
        success: true,
        role: user.role,
    });

    response.cookies.set('mh_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
}
