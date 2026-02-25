export type FunnelStageType = 'AWARENESS' | 'INTEREST' | 'LEAD' | 'QUALIFIED' | 'CONVERSION' | 'RETENTION';

export interface MetricsSummary {
    impressions: number;
    clicks: number;
    spend: number;
    leads: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    cpl: number;
}

export interface ChannelMetrics {
    channel: string;
    metrics: MetricsSummary;
    trend: number; // % change vs prev period
}

export interface FunnelData {
    stage: FunnelStageType;
    count: number;
    conversionRate: number;
}

export interface DashboardKPI {
    totalSpend: number;
    totalLeads: number;
    averageCPL: number;
    overallROAS: number;
    budgetUtilization: number;
    spendTrend: number;
    leadsTrend: number;
}

export const FUNNEL_LABELS: Record<FunnelStageType, string> = {
    AWARENESS: 'Nhận biết',
    INTEREST: 'Quan tâm',
    LEAD: 'Lead',
    QUALIFIED: 'Lead chất lượng',
    CONVERSION: 'Chuyển đổi',
    RETENTION: 'Giữ chân',
};
