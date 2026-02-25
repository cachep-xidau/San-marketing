/**
 * Daily Metrics Data Layer
 *
 * Generates deterministic daily metrics for all campaigns over 180 days.
 * Uses seeded random + trend patterns to create realistic data distributions.
 * Daily values are normalized so they sum to exactly each campaign's total metrics.
 */

import { getCampaigns, type CampaignItem } from './campaigns';

/* ---- Types ---- */
export type TimeRange = 'this_month' | 'last_month' | '3m' | 'custom';

export interface DailyEntry {
    date: string; // YYYY-MM-DD
    campaignId: string;
    leads: number;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
}

export interface AggregatedMetrics {
    leads: number;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
}

export interface PeriodComparison {
    current: AggregatedMetrics;
    previous: AggregatedMetrics;
    delta: { leads: number; clicks: number; impressions: number; conversions: number; spend: number };
}

/* ---- Seeded PRNG (mulberry32) ---- */
function seedHash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

function mulberry32(seed: number) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ---- Trend Patterns ---- */
type TrendPattern = 'growing' | 'declining' | 'stable' | 'seasonal' | 'spike';

function getTrendPattern(campaignId: string): TrendPattern {
    const patterns: TrendPattern[] = ['growing', 'declining', 'stable', 'seasonal', 'spike'];
    const h = seedHash(campaignId + '_trend');
    return patterns[h % patterns.length];
}

/** Returns a weight 0–1 for dayIndex (0 = oldest, totalDays-1 = newest) based on pattern */
function trendWeight(pattern: TrendPattern, dayIndex: number, totalDays: number): number {
    const t = dayIndex / (totalDays - 1); // 0→1 (old→new)
    switch (pattern) {
        case 'growing':
            return 0.4 + 0.6 * t; // ramps up toward recent
        case 'declining':
            return 1.0 - 0.5 * t; // fades toward recent
        case 'stable':
            return 0.85 + 0.15 * Math.sin(t * Math.PI * 2);
        case 'seasonal':
            return 0.5 + 0.5 * Math.sin(t * Math.PI * 4); // two cycles
        case 'spike':
            // spike around 70% mark
            return 0.3 + 0.7 * Math.exp(-50 * (t - 0.7) ** 2);
        default:
            return 1;
    }
}

/* ---- Generate & Cache ---- */
const TOTAL_DAYS = 180;
let _cache: Map<string, DailyEntry[]> | null = null;

function getBaseDate(): Date {
    // "today" for our data — use a fixed reference so data is deterministic
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function dateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function generateDailyData(): Map<string, DailyEntry[]> {
    const allCampaigns = getCampaigns();
    const base = getBaseDate();
    const result = new Map<string, DailyEntry[]>();

    for (const camp of allCampaigns) {
        const pattern = getTrendPattern(camp.id);
        const rng = mulberry32(seedHash(camp.id + '_daily'));
        const entries: DailyEntry[] = [];

        // Step 1: raw weights per day
        const rawWeights: number[] = [];
        for (let i = 0; i < TOTAL_DAYS; i++) {
            const tw = trendWeight(pattern, i, TOTAL_DAYS);
            const noise = 0.5 + rng() * 1.0; // 0.5–1.5 noise
            rawWeights.push(tw * noise);
        }

        // Step 2: normalize so daily values sum to campaign totals
        const sumW = rawWeights.reduce((s, w) => s + w, 0);
        const metrics = camp.metrics;

        for (let i = 0; i < TOTAL_DAYS; i++) {
            const frac = rawWeights[i] / sumW;
            const d = new Date(base);
            d.setDate(d.getDate() - (TOTAL_DAYS - 1 - i)); // oldest first

            entries.push({
                date: dateStr(d),
                campaignId: camp.id,
                leads: Math.round(metrics.leads * frac),
                clicks: Math.round(metrics.clicks * frac),
                impressions: Math.round(metrics.impressions * frac),
                conversions: Math.round(metrics.conversions * frac),
                spend: Math.round(metrics.spend * frac),
            });
        }

        // Step 3: fix rounding so totals match exactly (adjust last day)
        const summed = entries.reduce((acc, e) => ({
            leads: acc.leads + e.leads,
            clicks: acc.clicks + e.clicks,
            impressions: acc.impressions + e.impressions,
            conversions: acc.conversions + e.conversions,
            spend: acc.spend + e.spend,
        }), { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 });

        const last = entries[entries.length - 1];
        last.leads += metrics.leads - summed.leads;
        last.clicks += metrics.clicks - summed.clicks;
        last.impressions += metrics.impressions - summed.impressions;
        last.conversions += metrics.conversions - summed.conversions;
        last.spend += metrics.spend - summed.spend;

        result.set(camp.id, entries);
    }

    return result;
}

function ensureCache() {
    if (!_cache) _cache = generateDailyData();
    return _cache;
}

/* ---- Public API ---- */

export function rangeToDays(range: TimeRange): number {
    switch (range) {
        case 'this_month': return 30;
        case 'last_month': return 30;
        case '3m': return 90;
        case 'custom': return 180;
    }
}

export function rangeToLabel(range: TimeRange): string {
    switch (range) {
        case 'this_month': return 'Tháng này';
        case 'last_month': return 'Tháng trước';
        case '3m': return '3 tháng';
        case 'custom': return 'Tuỳ chọn';
    }
}

export function getRangeDates(range: TimeRange): { start: Date; end: Date } {
    const end = getBaseDate();
    const start = new Date(end);
    start.setDate(start.getDate() - rangeToDays(range) + 1);
    return { start, end };
}

export function getPreviousRangeDates(range: TimeRange): { start: Date; end: Date } {
    const days = rangeToDays(range);
    const end = new Date(getBaseDate());
    end.setDate(end.getDate() - days);
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    return { start, end };
}

/** Sum metrics for a single campaign in a date range */
export function getCampaignMetricsForRange(campaignId: string, start: Date, end: Date): AggregatedMetrics {
    const cache = ensureCache();
    const entries = cache.get(campaignId) || [];
    const s = dateStr(start);
    const e = dateStr(end);

    const result = { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
    for (const entry of entries) {
        if (entry.date >= s && entry.date <= e) {
            result.leads += entry.leads;
            result.clicks += entry.clicks;
            result.impressions += entry.impressions;
            result.conversions += entry.conversions;
            result.spend += entry.spend;
        }
    }
    return result;
}

/** Aggregate metrics for all campaigns of a company in a date range */
export function getCompanyMetricsForRange(companyId: string, start: Date, end: Date): AggregatedMetrics {
    const campaigns = getCampaigns(companyId);
    const result = { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
    for (const c of campaigns) {
        const m = getCampaignMetricsForRange(c.id, start, end);
        result.leads += m.leads;
        result.clicks += m.clicks;
        result.impressions += m.impressions;
        result.conversions += m.conversions;
        result.spend += m.spend;
    }
    return result;
}

/** Portfolio-level aggregation */
export function getAllMetricsForRange(start: Date, end: Date): AggregatedMetrics {
    const campaigns = getCampaigns();
    const result = { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
    for (const c of campaigns) {
        const m = getCampaignMetricsForRange(c.id, start, end);
        result.leads += m.leads;
        result.clicks += m.clicks;
        result.impressions += m.impressions;
        result.conversions += m.conversions;
        result.spend += m.spend;
    }
    return result;
}

/** Channel breakdown for a range */
export function getChannelBreakdownForRange(
    companyId: string | undefined,
    start: Date,
    end: Date,
): { channel: string; leads: number; clicks: number; conversions: number; spend: number }[] {
    const campaigns = getCampaigns(companyId);
    const map: Record<string, { leads: number; clicks: number; conversions: number; spend: number }> = {};

    for (const c of campaigns) {
        const m = getCampaignMetricsForRange(c.id, start, end);
        if (!map[c.channel]) map[c.channel] = { leads: 0, clicks: 0, conversions: 0, spend: 0 };
        map[c.channel].leads += m.leads;
        map[c.channel].clicks += m.clicks;
        map[c.channel].conversions += m.conversions;
        map[c.channel].spend += m.spend;
    }

    return Object.entries(map)
        .map(([channel, d]) => ({ channel, ...d }))
        .sort((a, b) => b.leads - a.leads);
}

/** Full comparison: current range + previous range + deltas */
export function getComparison(
    companyId: string | undefined,
    range: TimeRange,
): PeriodComparison {
    const { start: cs, end: ce } = getRangeDates(range);
    const { start: ps, end: pe } = getPreviousRangeDates(range);

    const getCurrent = companyId
        ? () => getCompanyMetricsForRange(companyId, cs, ce)
        : () => getAllMetricsForRange(cs, ce);
    const getPrev = companyId
        ? () => getCompanyMetricsForRange(companyId, ps, pe)
        : () => getAllMetricsForRange(ps, pe);

    const current = getCurrent();
    const previous = getPrev();

    const delta = {
        leads: previous.leads > 0 ? ((current.leads - previous.leads) / previous.leads) * 100 : 0,
        clicks: previous.clicks > 0 ? ((current.clicks - previous.clicks) / previous.clicks) * 100 : 0,
        impressions: previous.impressions > 0 ? ((current.impressions - previous.impressions) / previous.impressions) * 100 : 0,
        conversions: previous.conversions > 0 ? ((current.conversions - previous.conversions) / previous.conversions) * 100 : 0,
        spend: previous.spend > 0 ? ((current.spend - previous.spend) / previous.spend) * 100 : 0,
    };

    return { current, previous, delta };
}

/** Company-level comparison */
export function getCompanyComparison(companyId: string, range: TimeRange): PeriodComparison {
    return getComparison(companyId, range);
}

/** Daily series for charts — returns array of daily aggregated values */
export interface DailySeriesPoint {
    date: string;
    leads: number;
    clicks: number;
    impressions: number;
    conversions: number;
    spend: number;
}

export function getDailySeries(
    companyId: string | undefined,
    start: Date,
    end: Date,
): DailySeriesPoint[] {
    const cache = ensureCache();
    const campaigns = getCampaigns(companyId);
    const s = dateStr(start);
    const e = dateStr(end);

    // Aggregate all campaigns per day
    const dayMap: Record<string, DailySeriesPoint> = {};

    for (const camp of campaigns) {
        const entries = cache.get(camp.id) || [];
        for (const entry of entries) {
            if (entry.date >= s && entry.date <= e) {
                if (!dayMap[entry.date]) {
                    dayMap[entry.date] = { date: entry.date, leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 };
                }
                dayMap[entry.date].leads += entry.leads;
                dayMap[entry.date].clicks += entry.clicks;
                dayMap[entry.date].impressions += entry.impressions;
                dayMap[entry.date].conversions += entry.conversions;
                dayMap[entry.date].spend += entry.spend;
            }
        }
    }

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
}
