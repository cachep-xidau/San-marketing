import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import type { GoogleAdsCampaign, GoogleAdsMetrics, GoogleAdsResponse } from '@/lib/google-ads-types';

/* ---- Config ---- */
function getSheetConfig() {
    const sheetId = process.env.GOOGLE_SHEETS_ID;
    const serviceKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!sheetId || !serviceKey) {
        return null;
    }

    try {
        const credentials = JSON.parse(Buffer.from(serviceKey, 'base64').toString('utf-8'));
        return { sheetId, credentials };
    } catch {
        return null;
    }
}

/* ---- In-memory cache (5 min) ---- */
let cache: { data: GoogleAdsResponse; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

/* ---- Parse sheet rows ---- */
function parseRows(rows: string[][]): GoogleAdsCampaign[] {
    // Skip header row
    return rows.slice(1).map(row => ({
        date: row[0] || '',
        account: row[1] || '',
        campaign: row[2] || '',
        status: (row[3] as GoogleAdsCampaign['status']) || 'ENABLED',
        impressions: parseInt(row[4]) || 0,
        clicks: parseInt(row[5]) || 0,
        spend: parseFloat(row[6]) || 0,
        conversions: parseInt(row[7]) || 0,
        cpa: parseFloat(row[8]) || 0,
        roas: parseFloat(row[9]) || 0,
    })).filter(r => r.date && r.campaign); // skip empty rows
}

function computeMetrics(campaigns: GoogleAdsCampaign[]): GoogleAdsMetrics {
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
    const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgROAS = totalSpend > 0
        ? campaigns.reduce((s, c) => s + c.roas * c.spend, 0) / totalSpend
        : 0;

    return { totalSpend, totalClicks, totalImpressions, totalConversions, avgCTR, avgCPA, avgROAS };
}

/* ---- GET handler ---- */
export async function GET(request: Request) {
    // Check query params for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Try cache first
    if (cache && Date.now() - cache.ts < CACHE_TTL && !startDate && !endDate) {
        return NextResponse.json(cache.data);
    }

    const config = getSheetConfig();

    // If no Google Sheets config, return demo data
    if (!config) {
        const demoData = getDemoData();
        return NextResponse.json(demoData);
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: config.credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: config.sheetId,
            range: 'A:J', // Date through ROAS
        });

        const rows = (response.data.values as string[][]) || [];
        let campaigns = parseRows(rows);

        // Date filtering
        if (startDate) campaigns = campaigns.filter(c => c.date >= startDate);
        if (endDate) campaigns = campaigns.filter(c => c.date <= endDate);

        const metrics = computeMetrics(campaigns);
        const accounts = [...new Set(campaigns.map(c => c.account))];

        const result: GoogleAdsResponse = {
            campaigns,
            metrics,
            accounts,
            lastUpdated: new Date().toISOString(),
        };

        // Cache if no date filter
        if (!startDate && !endDate) {
            cache = { data: result, ts: Date.now() };
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Google Sheets API error:', error);
        // Fallback to demo data on error
        return NextResponse.json(getDemoData());
    }
}

/* ---- Demo data (when no Google Sheets configured) ---- */
function getDemoData(): GoogleAdsResponse {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const campaigns: GoogleAdsCampaign[] = [
        { date: fmt(today), account: 'San Clinic', campaign: 'Brand Awareness - San', status: 'ENABLED', impressions: 45200, clicks: 1850, spend: 12500000, conversions: 42, cpa: 297619, roas: 3.2 },
        { date: fmt(today), account: 'San Clinic', campaign: 'NKH Vest Trắng - Search', status: 'ENABLED', impressions: 28700, clicks: 1240, spend: 8900000, conversions: 35, cpa: 254286, roas: 4.1 },
        { date: fmt(today), account: 'San Clinic', campaign: 'Retargeting - Website Visitors', status: 'ENABLED', impressions: 15300, clicks: 720, spend: 4200000, conversions: 18, cpa: 233333, roas: 5.5 },
        { date: fmt(today), account: 'Teennie', campaign: 'Teen Skincare - Display', status: 'ENABLED', impressions: 62100, clicks: 2100, spend: 9800000, conversions: 28, cpa: 350000, roas: 2.8 },
        { date: fmt(today), account: 'Teennie', campaign: 'Mụn Trứng Cá - Search', status: 'PAUSED', impressions: 8900, clicks: 380, spend: 3200000, conversions: 12, cpa: 266667, roas: 3.1 },
        { date: fmt(today), account: 'TGIL', campaign: 'TGIL Premium - Ads', status: 'ENABLED', impressions: 21500, clicks: 890, spend: 7600000, conversions: 22, cpa: 345455, roas: 2.4 },
        { date: fmt(new Date(today.getTime() - 86400000)), account: 'San Clinic', campaign: 'Brand Awareness - San', status: 'ENABLED', impressions: 41800, clicks: 1720, spend: 11800000, conversions: 38, cpa: 310526, roas: 3.0 },
        { date: fmt(new Date(today.getTime() - 86400000)), account: 'San Clinic', campaign: 'NKH Vest Trắng - Search', status: 'ENABLED', impressions: 26400, clicks: 1180, spend: 8400000, conversions: 32, cpa: 262500, roas: 3.9 },
    ];

    const metrics = computeMetrics(campaigns);
    const accounts = [...new Set(campaigns.map(c => c.account))];

    return {
        campaigns,
        metrics,
        accounts,
        lastUpdated: new Date().toISOString(),
    };
}
