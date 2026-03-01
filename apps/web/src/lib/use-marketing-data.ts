'use client';

/**
 * Hook: Real marketing data from Neon PostgreSQL
 *
 * Fetches data via split endpoints for better performance:
 * - /api/marketing/summary - Company summary totals
 * - /api/marketing/trend - Daily trend data
 * - /api/marketing/channels - Channel breakdown
 * - /api/marketing/campaigns - Campaign breakdown (paginated)
 * - /api/marketing/master-status - Campaign master status
 *
 * Time ranges: this_month, last_month, 3m, 6m
 */

import { useState, useEffect, useMemo } from 'react';
import type { TimeRange } from '@/lib/daily-metrics';
import { getMonthRange } from './marketing-date-range';
import { fetchAllMarketingData, type APISummary, type APIDaily, type APIChannel, type APIMasterStatus } from './marketing-api-client';
import { transformSelectorCards, transformDailySeries, transformChannelBreakdown, getActiveCardTotals, type AggregatedMetrics, type DailySeriesPoint, type CompanyCard, type ChannelEntry } from './marketing-data-transformers';

// Re-export types for backward compatibility
export type { AggregatedMetrics, DailySeriesPoint, CompanyCard, ChannelEntry } from './marketing-data-transformers';

/* ---- Main Hook ---- */
export function useMarketingData(timeRange: TimeRange, activeCard: string, customStart?: string, customEnd?: string) {
    const [summary, setSummary] = useState<APISummary[] | null>(null);
    const [daily, setDaily] = useState<APIDaily[] | null>(null);
    const [channels, setChannels] = useState<APIChannel[] | null>(null);
    const [masterStatus, setMasterStatus] = useState<APIMasterStatus[] | null>(null);

    // Granular loading states
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [isLoadingTrend, setIsLoadingTrend] = useState(true);
    const [isLoadingChannels, setIsLoadingChannels] = useState(true);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
    const [isLoadingMasterStatus, setIsLoadingMasterStatus] = useState(true);

    const { start, end } = getMonthRange(timeRange, customStart, customEnd);

    // Fetch all endpoints in parallel
    useEffect(() => {
        const loadData = async () => {
            setIsLoadingSummary(true);
            setIsLoadingTrend(true);
            setIsLoadingChannels(true);
            setIsLoadingCampaigns(true);
            setIsLoadingMasterStatus(true);

            try {
                const data = await fetchAllMarketingData(start, end);
                setSummary(data.summary.length > 0 ? data.summary : null);
                setDaily(data.daily.length > 0 ? data.daily : null);
                setChannels(data.channels.length > 0 ? data.channels : null);
                setMasterStatus(data.masterStatus.length > 0 ? data.masterStatus : null);
            } finally {
                setIsLoadingSummary(false);
                setIsLoadingTrend(false);
                setIsLoadingChannels(false);
                setIsLoadingCampaigns(false);
                setIsLoadingMasterStatus(false);
            }
        };

        loadData();
    }, [start, end]);

    /* ---- Selector cards ---- */
    const selectorCards = useMemo<CompanyCard[]>(() => {
        if (!summary) return [];
        return transformSelectorCards(summary, masterStatus || []);
    }, [summary, masterStatus]);

    /* ---- Monthly series (aggregated by month) ---- */
    const dailySeries = useMemo<DailySeriesPoint[]>(() => {
        if (!daily) return [];
        return transformDailySeries(daily, activeCard);
    }, [daily, activeCard]);

    /* ---- Channel breakdown ---- */
    const channelBreakdown = useMemo<ChannelEntry[]>(() => {
        if (!channels) return [];
        return transformChannelBreakdown(channels, activeCard);
    }, [channels, activeCard]);

    /* ---- Totals for active card ---- */
    const totals = useMemo<AggregatedMetrics>(() => {
        return getActiveCardTotals(selectorCards, activeCard);
    }, [selectorCards, activeCard]);

    // Overall loading state (true only if ALL are loading)
    const loading = isLoadingSummary && isLoadingTrend && isLoadingChannels && isLoadingCampaigns && isLoadingMasterStatus;

    // Partial loading: at least one endpoint still loading
    const isPartialLoading = isLoadingSummary || isLoadingTrend || isLoadingChannels || isLoadingCampaigns || isLoadingMasterStatus;

    return {
        loading,
        isLoadingSummary,
        isLoadingTrend,
        isLoadingChannels,
        isLoadingCampaigns,
        isLoadingMasterStatus,
        isPartialLoading,
        selectorCards,
        dailySeries,
        channelBreakdown,
        totals,
        delta: { leads: 0, clicks: 0, impressions: 0, conversions: 0, spend: 0 },
        dataRange: { start, end },
    };
}
