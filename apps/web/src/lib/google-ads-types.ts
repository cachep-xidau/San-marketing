/* Google Ads data types — sourced from Google Sheets bridge */

export interface GoogleAdsCampaign {
    date: string;           // yyyy-mm-dd
    account: string;        // Account name/ID
    campaign: string;       // Campaign name
    status: 'ENABLED' | 'PAUSED' | 'REMOVED';
    impressions: number;
    clicks: number;
    spend: number;          // VND
    conversions: number;
    cpa: number;            // Cost per acquisition
    roas: number;           // Return on ad spend
}

export interface GoogleAdsMetrics {
    totalSpend: number;
    totalClicks: number;
    totalImpressions: number;
    totalConversions: number;
    avgCTR: number;         // Click-through rate %
    avgCPA: number;         // Cost per acquisition
    avgROAS: number;
}

export interface GoogleAdsResponse {
    campaigns: GoogleAdsCampaign[];
    metrics: GoogleAdsMetrics;
    accounts: string[];
    lastUpdated: string;
}
