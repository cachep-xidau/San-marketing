import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = new TextEncoder().encode(
    process.env.AUTH_SECRET || 'fallback-dev-secret-change-me'
);

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/mh_session=([^;]+)/);

    if (!match) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(match[1], AUTH_SECRET);
        return NextResponse.json({
            user: {
                email: payload.email as string,
                name: payload.name as string,
                role: payload.role as string,
            },
        });
    } catch {
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
