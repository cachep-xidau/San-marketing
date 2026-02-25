'use client';

/**
 * Hook: Real marketing data from Neon PostgreSQL
 *
 * Fetches data via /api/marketing and aggregates by MONTH.
 * Time ranges: this_month, last_month, 3m, 6m
 */

import { useState, useEffect, useMemo } from 'react';
import type { TimeRange } from '@/lib/daily-metrics';
import { COMPANIES } from '@marketing-hub/shared';

/* ---- Types ---- */
export interface AggregatedMetrics {
    leads: number;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
}

export interface DailySeriesPoint {
    date: string; // YYYY-MM label for monthly
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

interface APIMasterStatus {
    companyId: string;
    status: string;
    _count: number;
}

interface APIResponse {
    summary: APISummary[];
    daily: APIDaily[];
    campaigns: APICampaign[];
    channels: APIChannel[];
    masterStatus: APIMasterStatus[];
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

/**
 * Compute start/end date range based on month-based TimeRange.
 * Uses the data's actual latest date as reference point.
 */
function getMonthRange(range: TimeRange, customStart?: string, customEnd?: string): { start: string; end: string } {
    if (range === 'custom' && customStart && customEnd) {
        return { start: customStart, end: customEnd };
    }

    // Reference date: Feb 2026 (latest data)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    switch (range) {
        case 'this_month': {
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);
            return { start: fmt(start), end: fmt(end) };
        }
        case 'last_month': {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 0);
            return { start: fmt(start), end: fmt(end) };
        }
        case '3m': {
            const start = new Date(year, month - 2, 1);
            const end = new Date(year, month + 1, 0);
            return { start: fmt(start), end: fmt(end) };
        }
        default: {
            // fallback: 3 months
            const start = new Date(year, month - 2, 1);
            const end = new Date(year, month + 1, 0);
            return { start: fmt(start), end: fmt(end) };
        }
    }
}

function fmt(d: Date): string {
    return d.toISOString().split('T')[0];
}

function toMonthLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return `T${d.getMonth() + 1}/${d.getFullYear()}`;
}

/* ---- Main Hook ---- */
export function useMarketingData(timeRange: TimeRange, activeCard: string, customStart?: string, customEnd?: string) {
    const [data, setData] = useState<APIResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const { start, end } = getMonthRange(timeRange, customStart, customEnd);

    // Fetch filtered data from API
    useEffect(() => {
        setLoading(true);
        fetch(`/api/marketing?start=${start}&end=${end}`)
            .then(r => r.json())
            .then((d: APIResponse) => {
                setData(d);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [start, end]);

    /* ---- Selector cards ---- */
    const selectorCards = useMemo<CompanyCard[]>(() => {
        if (!data?.summary) return [];

        const allLeads = data.summary.reduce((s, r) => s + numOrZero(r._sum.totalLead), 0);
        const allSpend = data.summary.reduce((s, r) => s + numOrZero(r._sum.budgetActual), 0);
        const allQuality = data.summary.reduce((s, r) => s + numOrZero(r._sum.quality), 0);

        // Campaign master BẬT/TẮT counts
        const ms = data.masterStatus || [];
        const allActive = ms.filter(m => m.status === 'BẬT').reduce((s, m) => s + m._count, 0);
        const allTotal = ms.reduce((s, m) => s + m._count, 0);

        const cards: CompanyCard[] = [
            {
                id: 'all',
                label: 'Tổng công ty',
                color: '#6B6F76',
                initial: '∑',
                metrics: {
                    leads: allLeads, clicks: 0, impressions: 0,
                    conversions: allQuality, spend: allSpend,
                },
                delta: { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 },
                campaigns: allTotal,
                active: allActive,
            },
        ];

        for (const co of COMPANIES) {
            const row = data.summary.find(s => s.companyId === co.id);
            const coActive = ms.filter(m => m.companyId === co.id && m.status === 'BẬT').reduce((s, m) => s + m._count, 0);
            const coTotal = ms.filter(m => m.companyId === co.id).reduce((s, m) => s + m._count, 0);

            cards.push({
                id: co.id,
                label: co.name,
                color: co.color,
                initial: co.shortName.charAt(0),
                metrics: {
                    leads: numOrZero(row?._sum.totalLead), clicks: 0, impressions: 0,
                    conversions: numOrZero(row?._sum.quality),
                    spend: numOrZero(row?._sum.budgetActual),
                },
                delta: { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 },
                campaigns: coTotal,
                active: coActive,
            });
        }

        return cards;
    }, [data]);

    /* ---- Monthly series (aggregated by month) ---- */
    const dailySeries = useMemo<DailySeriesPoint[]>(() => {
        if (!data?.daily) return [];

        const filtered = activeCard === 'all'
            ? data.daily
            : data.daily.filter(d => d.companyId === activeCard);

        // Group by MONTH instead of day
        const byMonth = new Map<string, { leads: number; spend: number; quality: number }>();
        for (const d of filtered) {
            const monthKey = toMonthLabel(d.date);
            const existing = byMonth.get(monthKey) || { leads: 0, spend: 0, quality: 0 };
            existing.leads += numOrZero(d._sum.totalLead);
            existing.spend += numOrZero(d._sum.budgetActual);
            existing.quality += numOrZero(d._sum.quality);
            byMonth.set(monthKey, existing);
        }

        // Sort by date (T1/2025 < T2/2025 < ... < T12/2025 < T1/2026)
        return Array.from(byMonth.entries())
            .sort(([a], [b]) => {
                const [mA, yA] = a.replace('T', '').split('/').map(Number);
                const [mB, yB] = b.replace('T', '').split('/').map(Number);
                return yA !== yB ? yA - yB : mA - mB;
            })
            .map(([month, v]) => ({
                date: month,
                leads: v.leads,
                clicks: 0,
                impressions: 0,
                conversions: v.quality,
                spend: v.spend,
            }));
    }, [data, activeCard]);

    /* ---- Channel breakdown ---- */
    const channelBreakdown = useMemo<ChannelEntry[]>(() => {
        if (!data?.channels) return [];

        const filtered = activeCard === 'all'
            ? data.channels
            : data.channels.filter(c => c.companyId === activeCard);

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
        if (!data?.summary) return { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
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
