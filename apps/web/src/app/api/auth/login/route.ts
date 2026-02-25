import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

function getAuthSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET environment variable is required');
    }
    return new TextEncoder().encode(secret);
}

// Users defined SERVER-SIDE ONLY — never shipped to client bundle
// Passwords hashed with bcrypt (10 rounds)
const USERS: Record<string, { passwordHash: string; name: string; role: string }> = {
    'cmo@sgroup.vn': { passwordHash: '$2b$10$0rQPFJCDTSU7KnMR4OAOm.A/rejX5sKWGf6gaq7vRPooRLraeI/KW', name: 'Minh (CMO)', role: 'CMO' },
    'head@sgroup.vn': { passwordHash: '$2b$10$0rQPFJCDTSU7KnMR4OAOm.A/rejX5sKWGf6gaq7vRPooRLraeI/KW', name: 'Lan (Head)', role: 'HEAD' },
    'manager@sgroup.vn': { passwordHash: '$2b$10$0rQPFJCDTSU7KnMR4OAOm.A/rejX5sKWGf6gaq7vRPooRLraeI/KW', name: 'Hùng (Manager)', role: 'MANAGER' },
    'staff@sgroup.vn': { passwordHash: '$2b$10$0rQPFJCDTSU7KnMR4OAOm.A/rejX5sKWGf6gaq7vRPooRLraeI/KW', name: 'Trang (Staff)', role: 'STAFF' },
};

// In-memory rate limiter (best-effort on serverless — resets on cold start)
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
        const response = NextResponse.json(
            { error: 'Quá nhiều lần thử. Vui lòng đợi 15 phút.' },
            { status: 429 }
        );
        response.headers.set('Retry-After', '900');
        return response;
    }

    // Parse body safely
    let email: string, password: string;
    try {
        const body = await request.json();
        email = body.email;
        password = body.password;
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!email || !password) {
        return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    const user = USERS[email.toLowerCase()];
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    // Create signed JWT — only store role and subject (no PII in token)
    const token = await new SignJWT({
        sub: email.toLowerCase(),
        role: user.role,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(getAuthSecret());

    // Set HttpOnly, Secure, SameSite=Strict cookie
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
