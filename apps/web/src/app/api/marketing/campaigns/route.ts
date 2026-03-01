import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Timer } from '@/lib/api-timing';
import { withCache } from '@/lib/redis-cache';
import { buildCampaignsKey } from '@/lib/cache-keys';

const VALID_COMPANIES = ['san', 'teennie', 'tgil'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};
const DEFAULT_LIMIT = 100;

export async function GET(request: Request) {
    const timer = new Timer();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

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

    const limit = limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    if (isNaN(limit) || limit <= 0 || limit > 1000) {
        return NextResponse.json({ error: 'Invalid limit (1-1000)' }, { status: 400 });
    }
    if (isNaN(offset) || offset < 0) {
        return NextResponse.json({ error: 'Invalid offset' }, { status: 400 });
    }

    const cacheKey = buildCampaignsKey(companyId, startDate, endDate, limit, offset);
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
                const [data, total] = await Promise.all([
                    prisma.marketingCampaignDaily.groupBy({
                        by: ['companyId', 'channel', 'campaignName'],
                        where,
                        _sum: {
                            totalLead: true,
                            spam: true,
                            potential: true,
                            quality: true,
                            booked: true,
                            arrived: true,
                            closed: true,
                            bill: true,
                            budgetTarget: true,
                            budgetActual: true,
                        },
                        _count: true,
                        orderBy: [{ companyId: 'asc' }, { channel: 'asc' }, { campaignName: 'asc' }],
                        take: limit,
                        skip: offset,
                    }),
                    prisma.marketingCampaignDaily.groupBy({
                        by: ['companyId', 'channel', 'campaignName'],
                        where,
                    }).then(rows => rows.length),
                ]);

                timer.mark('query');

                return {
                    campaigns: data,
                    meta: {
                        totalRows: total,
                        limit,
                        offset,
                        hasMore: offset + limit < total,
                    },
                };
            },
            { ttl: 300 }
        );

        timer.mark('cache');
        timer.end('GET /api/marketing/campaigns', cacheKey, { cache: 'hit', rows: result.campaigns.length });

        return NextResponse.json(result, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Marketing campaigns API error:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns data' }, { status: 500 });
    }
}
