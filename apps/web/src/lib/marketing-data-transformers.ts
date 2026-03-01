/**
 * Data transformation functions for marketing data
 */

import { COMPANIES } from '@marketing-hub/shared';
import { numOrZero, toMonthLabel } from './marketing-data-helpers';
import type { TimeRange } from '@/lib/daily-metrics';
import type {
    APISummary,
    APIDaily,
    APIChannel,
    APIMasterStatus,
} from './marketing-api-client';

/* ---- Types ---- */
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

export interface CompanyCard {
    id: string;
    label: string;
    color: string;
    initial: string;
    metrics: AggregatedMetrics;
    delta: { leads: number; clicks: number; impressions: number; conversions: number; spend: number };
    campaigns: number;
    active: number;
}

export interface ChannelEntry {
    channel: string;
    leads: number;
    clicks: number;
    conversions: number;
    spend: number;
}

/**
 * Transform summary data into company selector cards
 */
export function transformSelectorCards(
    summary: APISummary[],
    masterStatus: APIMasterStatus[]
): CompanyCard[] {
    const allLeads = summary.reduce((s, r) => s + numOrZero(r._sum.totalLead), 0);
    const allSpend = summary.reduce((s, r) => s + numOrZero(r._sum.budgetActual), 0);
    const allQuality = summary.reduce((s, r) => s + numOrZero(r._sum.quality), 0);

    const ms = masterStatus || [];
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
        const row = summary.find(s => s.companyId === co.id);
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
}

/**
 * Transform daily data into monthly series points
 */
export function transformDailySeries(
    daily: APIDaily[],
    activeCard: string
): DailySeriesPoint[] {
    const filtered = activeCard === 'all'
        ? daily
        : daily.filter(d => d.companyId === activeCard);

    const byMonth = new Map<string, { leads: number; spend: number; quality: number }>();
    for (const d of filtered) {
        const monthKey = toMonthLabel(d.date);
        const existing = byMonth.get(monthKey) || { leads: 0, spend: 0, quality: 0 };
        existing.leads += numOrZero(d._sum.totalLead);
        existing.spend += numOrZero(d._sum.budgetActual);
        existing.quality += numOrZero(d._sum.quality);
        byMonth.set(monthKey, existing);
    }

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
}

/**
 * Transform channel data into channel breakdown
 */
export function transformChannelBreakdown(
    channels: APIChannel[],
    activeCard: string
): ChannelEntry[] {
    const filtered = activeCard === 'all'
        ? channels
        : channels.filter(c => c.companyId === activeCard);

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
}

/**
 * Get totals for active card
 */
export function getActiveCardTotals(
    selectorCards: CompanyCard[],
    activeCard: string
): AggregatedMetrics {
    const card = selectorCards.find(c => c.id === activeCard);
    return card?.metrics || { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
}
