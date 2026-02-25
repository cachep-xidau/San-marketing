import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

function getAuthSecret() {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET environment variable is required');
    }
    return new TextEncoder().encode(secret);
}

// User details kept server-side — JWT only contains sub + role
const USER_DETAILS: Record<string, { name: string; role: string }> = {
    'cmo@sgroup.vn': { name: 'Minh (CMO)', role: 'CMO' },
    'head@sgroup.vn': { name: 'Lan (Head)', role: 'HEAD' },
    'manager@sgroup.vn': { name: 'Hùng (Manager)', role: 'MANAGER' },
    'staff@sgroup.vn': { name: 'Trang (Staff)', role: 'STAFF' },
};

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/mh_session=([^;]+)/);

    if (!match) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(match[1], getAuthSecret());
        const email = payload.sub as string;
        const details = USER_DETAILS[email];

        if (!details) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({
            user: {
                email,
                name: details.name,
                role: details.role,
            },
        });
    } catch {
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
