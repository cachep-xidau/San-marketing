import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Timer } from '@/lib/api-timing';
import { withCache } from '@/lib/redis-cache';
import { buildMasterStatusKey } from '@/lib/cache-keys';

const VALID_COMPANIES = ['san', 'teennie', 'tgil'];
const CACHE_HEADERS = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

export async function GET(request: Request) {
    const timer = new Timer();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;

    if (companyId && !VALID_COMPANIES.includes(companyId)) {
        return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 });
    }

    const cacheKey = buildMasterStatusKey(companyId);
    const where: Record<string, unknown> = {};
    if (companyId) where.companyId = companyId;

    try {
        timer.mark('validation');

        const result = await withCache(
            cacheKey,
            async () => {
                const data = await prisma.campaignMaster.groupBy({
                    by: ['companyId', 'status'],
                    where,
                    _count: true,
                });

                timer.mark('query');

                return {
                    data,
                    meta: { totalRows: data.length },
                };
            },
            { ttl: 600 }
        );

        timer.mark('cache');
        timer.end('GET /api/marketing/master-status', cacheKey, { cache: 'hit', rows: result.data.length });

        return NextResponse.json(result, { headers: CACHE_HEADERS });
    } catch (error) {
        console.error('Marketing master status API error:', error);
        return NextResponse.json({ error: 'Failed to fetch master status data' }, { status: 500 });
    }
}
