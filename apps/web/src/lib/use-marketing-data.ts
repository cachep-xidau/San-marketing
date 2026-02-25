'use client';

/**
 * Hook: Real marketing data from Neon PostgreSQL
 *
 * Replaces mock data layer with real DB queries via /api/marketing.
 * Returns same data shapes as the legacy daily-metrics.ts functions.
 */

import { useState, useEffect, useMemo } from 'react';
import type { TimeRange } from '@/lib/daily-metrics';
import { COMPANIES } from '@marketing-hub/shared';

/* ---- Types (match existing interfaces) ---- */
export interface AggregatedMetrics {
    leads: number;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
}

export interface DailySeriesPoint {
    date: string;
    leads: number;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
}

interface CompanyCard {
    id: string;
    label: string;
    color: string;
    initial: string;
    metrics: AggregatedMetrics;
    delta: { leads: number; clicks: number; impressions: number; conversions: number; spend: number };
    campaigns: number;
    active: number;
}

interface ChannelEntry {
    channel: string;
    leads: number;
    clicks: number;
    conversions: number;
    spend: number;
}

/* ---- API response types ---- */
interface APISummary {
    companyId: string;
    _sum: {
        totalLead: number | null;
        spam: number | null;
        potential: number | null;
        quality: number | null;
        booked: number | null;
        arrived: number | null;
        closed: number | null;
        bill: string | null;
        budgetTarget: string | null;
        budgetActual: string | null;
    };
    _count: number;
}

interface APIDaily {
    date: string;
    companyId: string;
    _sum: {
        totalLead: number | null;
        spam: number | null;
        potential: number | null;
        quality: number | null;
        booked: number | null;
        arrived: number | null;
        closed: number | null;
        bill: string | null;
        budgetActual: string | null;
    };
}

interface APIChannel {
    companyId: string;
    channel: string;
    _sum: {
        totalLead: number | null;
        quality: number | null;
        budgetActual: string | null;
    };
}

interface APICampaign {
    companyId: string;
    channel: string;
    campaignName: string;
    _sum: {
        totalLead: number | null;
        quality: number | null;
        budgetActual: string | null;
    };
    _count: number;
}

interface APIResponse {
    summary: APISummary[];
    daily: APIDaily[];
    campaigns: APICampaign[];
    channels: APIChannel[];
    meta: {
        totalRows: number;
        dateRange: { start: string; end: string };
    };
}

/* ---- Helpers ---- */
function numOrZero(v: number | string | null | undefined): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return parseFloat(v) || 0;
    return v;
}

function rangeToDays(range: TimeRange): number {
    switch (range) {
        case '7d': return 7;
        case '30d': return 30;
        case '3m': return 90;
        case '6m': return 180;
        default: return 30;
    }
}

function getDateRange(range: TimeRange): { start: string; end: string } {
    // Data is from Feb 2025 – May 2025, so use the actual data range
    // We'll set "end" to the latest data date and compute "start" from there
    const end = new Date('2025-05-16');
    const days = rangeToDays(range);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

/* ---- Main Hook ---- */
export function useMarketingData(timeRange: TimeRange, activeCard: string) {
    const [data, setData] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const { start, end } = getDateRange(timeRange);

    // Fetch data
    useEffect(() => {
        setLoading(true);
        const url = `/api/marketing?start=${start}&end=${end}`;
        fetch(url)
            .then(r => r.json())
            .then((d: APIResponse) => {
                setData(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [start, end]);

    /* ---- Selector cards ---- */
    const selectorCards = useMemo<CompanyCard[]>(() => {
        if (!data) return [];

        // All-company totals
        const allLeads = data.summary.reduce((s, r) => s + numOrZero(r._sum.totalLead), 0);
        const allSpend = data.summary.reduce((s, r) => s + numOrZero(r._sum.budgetActual), 0);
        const allQuality = data.summary.reduce((s, r) => s + numOrZero(r._sum.quality), 0);
        const uniqueCampaigns = new Set(data.campaigns.map(c => c.campaignName)).size;

        const cards: CompanyCard[] = [
            {
                id: 'all',
                label: 'Tổng công ty',
                color: '#6B6F76',
                initial: '∑',
                metrics: {
                    leads: allLeads,
                    clicks: 0,
                    impressions: 0,
                    conversions: allQuality,
                    spend: allSpend,
                },
                delta: { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 },
                campaigns: uniqueCampaigns,
                active: uniqueCampaigns,
            },
        ];

        for (const co of COMPANIES) {
            const row = data.summary.find(s => s.companyId === co.id);
            const companyCampaigns = new Set(
                data.campaigns.filter(c => c.companyId === co.id).map(c => c.campaignName),
            ).size;

            cards.push({
                id: co.id,
                label: co.name,
                color: co.color,
                initial: co.shortName.charAt(0),
                metrics: {
                    leads: numOrZero(row?._sum.totalLead),
                    clicks: 0,
                    impressions: 0,
                    conversions: numOrZero(row?._sum.quality),
                    spend: numOrZero(row?._sum.budgetActual),
                },
                delta: { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 },
                campaigns: companyCampaigns,
                active: companyCampaigns,
            });
        }

        return cards;
    }, [data]);

    /* ---- Daily series ---- */
    const dailySeries = useMemo<DailySeriesPoint[]>(() => {
        if (!data) return [];

        // Filter by activeCard
        const filtered = activeCard === 'all'
            ? data.daily
            : data.daily.filter(d => d.companyId === activeCard);

        // Group by date
        const byDate = new Map<string, { leads: number; spend: number; quality: number }>();
        for (const d of filtered) {
            const dateKey = d.date.split('T')[0];
            const existing = byDate.get(dateKey) || { leads: 0, spend: 0, quality: 0 };
            existing.leads += numOrZero(d._sum.totalLead);
            existing.spend += numOrZero(d._sum.budgetActual);
            existing.quality += numOrZero(d._sum.quality);
            byDate.set(dateKey, existing);
        }

        return Array.from(byDate.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => ({
                date,
                leads: v.leads,
                clicks: 0,
                impressions: 0,
                conversions: v.quality,
                spend: v.spend,
            }));
    }, [data, activeCard]);

    /* ---- Channel breakdown ---- */
    const channelBreakdown = useMemo<ChannelEntry[]>(() => {
        if (!data) return [];

        const filtered = activeCard === 'all'
            ? data.channels
            : data.channels.filter(c => c.companyId === activeCard);

        // Group by channel
        const byChannel = new Map<string, ChannelEntry>();
        for (const ch of filtered) {
            const key = ch.channel;
            const existing = byChannel.get(key) || { channel: key, leads: 0, clicks: 0, conversions: 0, spend: 0 };
            existing.leads += numOrZero(ch._sum.totalLead);
            existing.conversions += numOrZero(ch._sum.quality);
            existing.spend += numOrZero(ch._sum.budgetActual);
            byChannel.set(key, existing);
        }

        return Array.from(byChannel.values()).sort((a, b) => b.leads - a.leads);
    }, [data, activeCard]);

    /* ---- Totals for active card ---- */
    const totals = useMemo<AggregatedMetrics>(() => {
        if (!data) return { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
        const card = selectorCards.find(c => c.id === activeCard);
        return card?.metrics || { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
    }, [selectorCards, activeCard]);

    return {
        loading,
        selectorCards,
        dailySeries,
        channelBreakdown,
        totals,
        delta: { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 },
        dataRange: data?.meta?.dateRange,
    };
}
