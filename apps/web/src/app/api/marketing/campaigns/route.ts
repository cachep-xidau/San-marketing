import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const campaigns = await prisma.campaignMaster.findMany({
            orderBy: [{ companyId: 'asc' }, { campaignId: 'asc' }],
        });

        return NextResponse.json({
            campaigns: campaigns.map(c => ({
                companyId: c.companyId,
                campaignId: c.campaignId,
                channel: c.channel,
                name: c.name,
                status: c.status,
                startDate: c.startDate,
                endDate: c.endDate,
            })),
            total: campaigns.length,
        }, {
            headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
        });
    } catch (error) {
        console.error('CampaignMaster API error:', error);
        return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }
}
