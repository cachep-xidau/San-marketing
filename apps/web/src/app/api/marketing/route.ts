import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_COMPANIES = ['san', 'teennie', 'tgil'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---- In-memory cache (5 min TTL) ---- */
const cache = new Map<string, { data: object; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

const CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Validate companyId
    if (companyId && !VALID_COMPANIES.includes(companyId)) {
        return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 });
    }

    // Validate date format
    if (startDate && !DATE_RE.test(startDate)) {
        return NextResponse.json({ error: 'Invalid start date format (YYYY-MM-DD)' }, { status: 400 });
    }
    if (endDate && !DATE_RE.test(endDate)) {
        return NextResponse.json({ error: 'Invalid end date format (YYYY-MM-DD)' }, { status: 400 });
    }

    // Validate start ≤ end
    if (startDate && endDate && startDate > endDate) {
        return NextResponse.json({ error: 'start must be ≤ end' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `${companyId || 'all'}:${startDate || ''}:${endDate || ''}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return NextResponse.json(cached.data, { headers: CACHE_HEADERS });
    }

    const where: Record<string, unknown> = {};

    if (companyId) {
        where.companyId = companyId;
    }

    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const sumFields = {
        totalLead: true, spam: true, potential: true, quality: true,
        booked: true, arrived: true, closed: true, bill: true,
        budgetTarget: true, budgetActual: true,
    } as const;

    try {
        // All 5 queries run in PARALLEL
        const [summary, daily, campaigns, channels, masterStatus] = await Promise.all([
            // 1. Aggregated summary by company
            prisma.marketingEntry.groupBy({
                by: ['companyId'],
                where,
                _sum: sumFields,
                _count: true,
            }),

            // 2. Daily aggregation
            prisma.marketingEntry.groupBy({
                by: ['date', 'companyId'],
                where,
                _sum: {
                    totalLead: true, spam: true, potential: true, quality: true,
                    booked: true, arrived: true, closed: true, bill: true,
                    budgetActual: true,
                },
                orderBy: { date: 'asc' },
            }),

            // 3. Campaign breakdown
            prisma.marketingEntry.groupBy({
                by: ['companyId', 'channel', 'campaignName'],
                where,
                _sum: sumFields,
                _count: true,
            }),

            // 4. Channel breakdown
            prisma.marketingEntry.groupBy({
                by: ['companyId', 'channel'],
                where,
                _sum: {
                    totalLead: true, spam: true, potential: true, quality: true,
                    booked: true, arrived: true, closed: true, bill: true,
                    budgetActual: true,
                },
            }),

            // 5. Campaign master status (BẬT/TẮT)
            prisma.campaignMaster.groupBy({
                by: ['companyId', 'status'],
                _count: true,
            }),
        ]);

        const result = {
            summary,
            daily,
            campaigns,
            channels,
            masterStatus,
            meta: {
                totalRows: daily.length,
                dateRange: {
                    start: daily[0]?.date,
                    end: daily[daily.length - 1]?.date,
                },
            },
        };

        // Store in cache
        cache.set(cacheKey, { data: result, ts: Date.now() });

        return NextResponse.json(result, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Marketing data API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch marketing data' },
            { status: 500 },
        );
    }
}
