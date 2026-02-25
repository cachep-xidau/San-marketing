import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const channel = searchParams.get('channel');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

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
            take: 500,
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
