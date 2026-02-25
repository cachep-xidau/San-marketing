import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const VALID_COMPANIES = ['san', 'teennie', 'tgil'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const channel = searchParams.get('channel');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Validate companyId
    if (companyId && !VALID_COMPANIES.includes(companyId)) {
        return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 });
    }

    // Validate date format
    if (startDate && !DATE_RE.test(startDate)) {
        return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 });
    }
    if (endDate && !DATE_RE.test(endDate)) {
        return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
    }
    if (startDate && endDate && startDate > endDate) {
        return NextResponse.json({ error: 'start must be ≤ end' }, { status: 400 });
    }

    const limit = Math.min(Number(searchParams.get('limit')) || 500, 2000);

    const where: Record<string, unknown> = {};

    if (companyId) where.companyId = companyId;
    if (channel && channel !== 'all') where.channel = channel;

    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    try {
        const entries = await prisma.marketingEntry.findMany({
            where,
            orderBy: { date: 'desc' },
            take: limit,
        });

        // Transform to LeadEntry format for Staff page
        const rows = entries.map((e, i) => {
            const d = new Date(e.date);
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            return {
                id: e.id,
                date: dateStr,
                month: e.month,
                campaignId: String(e.campaignId),
                campaignName: e.campaignName,
                channel: e.channel,
                total: e.totalLead,
                spam: e.spam,
                potential: e.potential,
                quality: e.quality,
                booked: e.booked,
                arrived: e.arrived,
                closed: e.closed,
                bills: Number(e.bill),
                budgetTarget: Number(e.budgetTarget),
                budgetActual: Number(e.budgetActual),
                enteredBy: 'Import',
            };
        });

        return NextResponse.json({ entries: rows, total: rows.length });
    } catch (error) {
        console.error('Marketing entries API error:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }
}
