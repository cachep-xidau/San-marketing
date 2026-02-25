import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const where: Record<string, unknown> = {};

    if (companyId) {
        where.companyId = companyId;
    }

    if (startDate || endDate) {
        where.date = {};
        if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
        if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    try {
        // Aggregated summary by company
        const summary = await prisma.marketingEntry.groupBy({
            by: ['companyId'],
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
        });

        // Daily aggregation
        const daily = await prisma.marketingEntry.groupBy({
            by: ['date', 'companyId'],
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
                budgetActual: true,
            },
            orderBy: { date: 'asc' },
        });

        // Campaign breakdown
        const campaigns = await prisma.marketingEntry.groupBy({
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
        });

        // Channel breakdown
        const channels = await prisma.marketingEntry.groupBy({
            by: ['companyId', 'channel'],
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
                budgetActual: true,
            },
        });

        // Campaign master status (BẬT/TẮT)
        const masterStatus = await prisma.campaignMaster.groupBy({
            by: ['companyId', 'status'],
            _count: true,
        });

        return NextResponse.json({
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
        });
    } catch (error) {
        console.error('Marketing data API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch marketing data' },
            { status: 500 },
        );
    }
}
