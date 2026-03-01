import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Timer } from '@/lib/api-timing';
import { withCache } from '@/lib/redis-cache';
import { buildChannelsKey } from '@/lib/cache-keys';

const VALID_COMPANIES = ['san', 'teennie', 'tgil'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET(request: Request) {
    const timer = new Timer();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    if (companyId && !VALID_COMPANIES.includes(companyId)) {
        return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 });
    }
    if (startDate && !DATE_RE.test(startDate)) {
        return NextResponse.json({ error: 'Invalid start date format (YYYY-MM-DD)' }, { status: 400 });
    }
    if (endDate && !DATE_RE.test(endDate)) {
        return NextResponse.json({ error: 'Invalid end date format (YYYY-MM-DD)' }, { status: 400 });
    }
    if (startDate && endDate && startDate > endDate) {
        return NextResponse.json({ error: 'start must be ≤ end' }, { status: 400 });
    }

    const cacheKey = buildChannelsKey(companyId, startDate, endDate);
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;
    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    try {
        timer.mark('validation');

        const result = await withCache(
            cacheKey,
            async () => {
                const data = await prisma.marketingChannelDaily.findMany({
                    where,
                    orderBy: [{ companyId: 'asc' }, { channel: 'asc' }, { date: 'asc' }],
                });

                timer.mark('query');

                return {
                    data,
                    meta: { totalRows: data.length },
                };
            },
            { ttl: 300 }
        );

        timer.mark('cache');
        timer.end('GET /api/marketing/channels', cacheKey, { cache: 'hit', rows: result.data.length });

        return NextResponse.json(result, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Marketing channels API error:', error);
        return NextResponse.json({ error: 'Failed to fetch channels data' }, { status: 500 });
    }
}
