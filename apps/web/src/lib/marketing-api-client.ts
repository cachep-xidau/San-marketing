/**
 * Marketing API client functions
 * Splits the monolithic /api/marketing endpoint into focused endpoints
 */

/* ---- API response types ---- */
export interface APISummary {
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

export interface APIDaily {
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

export interface APIChannel {
    companyId: string;
    channel: string;
    _sum: {
        totalLead: number | null;
        quality: number | null;
        budgetActual: string | null;
    };
}

export interface APICampaign {
    companyId: string;
    channel: string;
    campaignName: string;
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

export interface APIMasterStatus {
    companyId: string;
    status: string;
    _count: number;
}

function parseArrayPayload<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
        return (payload as { data: T[] }).data;
    }
    return [];
}

/* ---- Fetch functions ---- */

/**
 * Fetch company summary totals
 */
export async function fetchSummary(start: string, end: string): Promise<APISummary[]> {
    const res = await fetch(`/api/marketing/summary?start=${start}&end=${end}`);
    if (!res.ok) return [];
    return parseArrayPayload<APISummary>(await res.json());
}

/**
 * Fetch daily trend data
 */
export async function fetchTrend(start: string, end: string): Promise<APIDaily[]> {
    const res = await fetch(`/api/marketing/trend?start=${start}&end=${end}`);
    if (!res.ok) return [];
    return parseArrayPayload<APIDaily>(await res.json());
}

/**
 * Fetch channel breakdown
 */
export async function fetchChannels(start: string, end: string): Promise<APIChannel[]> {
    const res = await fetch(`/api/marketing/channels?start=${start}&end=${end}`);
    if (!res.ok) return [];
    return parseArrayPayload<APIChannel>(await res.json());
}

/**
 * Fetch campaign breakdown (paginated)
 */
export async function fetchCampaigns(start: string, end: string, page = 1, limit = 1000): Promise<APICampaign[]> {
    const res = await fetch(`/api/marketing/campaigns?start=${start}&end=${end}&page=${page}&limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (Array.isArray(data?.campaigns)) return data.campaigns;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

/**
 * Fetch campaign master status
 */
export async function fetchMasterStatus(): Promise<APIMasterStatus[]> {
    const res = await fetch('/api/marketing/master-status');
    if (!res.ok) return [];
    return parseArrayPayload<APIMasterStatus>(await res.json());
}

/**
 * Fetch all endpoints in parallel
 * Returns an object with all data arrays
 */
export async function fetchAllMarketingData(start: string, end: string) {
    const [summaryData, trendData, channelsData, campaignsData, masterStatusData] = await Promise.allSettled([
        fetchSummary(start, end),
        fetchTrend(start, end),
        fetchChannels(start, end),
        fetchCampaigns(start, end),
        fetchMasterStatus(),
    ]);

    return {
        summary: summaryData.status === 'fulfilled' ? summaryData.value : [],
        daily: trendData.status === 'fulfilled' ? trendData.value : [],
        channels: channelsData.status === 'fulfilled' ? channelsData.value : [],
        campaigns: campaignsData.status === 'fulfilled' ? campaignsData.value : [],
        masterStatus: masterStatusData.status === 'fulfilled' ? masterStatusData.value : [],
    };
}
