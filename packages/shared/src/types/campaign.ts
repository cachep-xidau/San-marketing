/* ---- Company ---- */
export interface Company {
    id: string;
    name: string;
    shortName: string;
    color: string;
    channels: ChannelDef[];
}

export interface ChannelDef {
    id: string;
    label: string;
    category: 'DIGITAL' | 'OFFLINE';
    color: string;
}

/* ---- Companies Registry ---- */
export const COMPANIES: Company[] = [
    {
        id: 'san', name: 'San Dentist', shortName: 'San', color: '#6366F1',
        channels: [
            { id: 'page_san', label: 'Page San', category: 'DIGITAL', color: '#1877F2' },
            { id: 'web', label: 'Web', category: 'DIGITAL', color: '#10B981' },
            { id: 'zalo_oa', label: 'Zalo OA', category: 'DIGITAL', color: '#0068FF' },
            { id: 'instagram', label: 'Instagram', category: 'DIGITAL', color: '#E1306C' },
            { id: 'tiktok', label: 'TikTok', category: 'DIGITAL', color: '#000000' },
            { id: 'hotline', label: 'Hotline', category: 'OFFLINE', color: '#F59E0B' },
            { id: 'gioi_thieu', label: 'Giới thiệu', category: 'OFFLINE', color: '#8B5CF6' },
            { id: 'vang_lai', label: 'Vãng lai', category: 'OFFLINE', color: '#EC4899' },
            { id: 'doi_tac', label: 'Đối tác', category: 'OFFLINE', color: '#14B8A6' },
            { id: 'data_truong', label: 'Data trường', category: 'OFFLINE', color: '#F97316' },
            { id: 'khac', label: 'Khác', category: 'OFFLINE', color: '#6B7280' },
        ],
    },
    {
        id: 'teennie', name: 'Teennie', shortName: 'Teennie', color: '#EC4899',
        channels: [
            { id: 'page_teennie', label: 'Page Teennie', category: 'DIGITAL', color: '#1877F2' },
            { id: 'web', label: 'Web', category: 'DIGITAL', color: '#10B981' },
            { id: 'tiktok', label: 'TikTok', category: 'DIGITAL', color: '#000000' },
            { id: 'instagram', label: 'Instagram', category: 'DIGITAL', color: '#E1306C' },
            { id: 'zalo_oa', label: 'Zalo OA', category: 'DIGITAL', color: '#0068FF' },
            { id: 'hotline', label: 'Hotline', category: 'OFFLINE', color: '#F59E0B' },
            { id: 'gioi_thieu', label: 'Giới thiệu', category: 'OFFLINE', color: '#8B5CF6' },
            { id: 'vang_lai', label: 'Vãng lai', category: 'OFFLINE', color: '#EC4899' },
            { id: 'khac', label: 'Khác', category: 'OFFLINE', color: '#6B7280' },
        ],
    },
    {
        id: 'tgil', name: 'Thegioiimplant', shortName: 'TGIL', color: '#F59E0B',
        channels: [
            { id: 'page_tgil', label: 'Page TGIL', category: 'DIGITAL', color: '#1877F2' },
            { id: 'web', label: 'Web', category: 'DIGITAL', color: '#10B981' },
            { id: 'zalo_oa', label: 'Zalo OA', category: 'DIGITAL', color: '#0068FF' },
            { id: 'tiktok', label: 'TikTok', category: 'DIGITAL', color: '#000000' },
            { id: 'hotline', label: 'Hotline', category: 'OFFLINE', color: '#F59E0B' },
            { id: 'gioi_thieu', label: 'Giới thiệu', category: 'OFFLINE', color: '#8B5CF6' },
            { id: 'doi_tac', label: 'Đối tác', category: 'OFFLINE', color: '#14B8A6' },
            { id: 'vang_lai', label: 'Vãng lai', category: 'OFFLINE', color: '#EC4899' },
            { id: 'tu_van_lai', label: 'Tư Vấn Lại', category: 'OFFLINE', color: '#7C3AED' },
            { id: 'khac', label: 'Khác', category: 'OFFLINE', color: '#6B7280' },
        ],
    },
];

export function getCompany(id: string): Company | undefined {
    return COMPANIES.find(c => c.id === id);
}

export function getChannelLabel(companyId: string, channelId: string): string {
    const company = getCompany(companyId);
    return company?.channels.find(ch => ch.id === channelId)?.label || channelId;
}

export function getChannelColor(companyId: string, channelId: string): string {
    const company = getCompany(companyId);
    return company?.channels.find(ch => ch.id === channelId)?.color || '#6B7280';
}

/* ---- Campaign Status (BẬT/TẮT) ---- */
export type CampaignStatus = 'BẬT' | 'TẮT';

export const STATUS_LABELS: Record<CampaignStatus, string> = {
    'BẬT': 'Đang bật',
    'TẮT': 'Đã tắt',
};

export const STATUS_COLORS: Record<CampaignStatus, string> = {
    'BẬT': '#10B981',
    'TẮT': '#6B7280',
};

/* ---- Legacy exports for backward compat ---- */
export type ChannelType = string;
export type CampaignStatusType = CampaignStatus;
export type PaceStatusType = 'ON_TRACK' | 'BEHIND' | 'AHEAD' | 'OVERSPENT';

export interface CampaignSummary {
    id: string;
    companyId: string;
    name: string;
    channel: string;
    status: CampaignStatus;
    startDate?: string;
    endDate?: string;
    todaySpend: number;
    totalLeads: number;
}

export interface BudgetSummary {
    planned: number;
    actualSpend: number;
    paceStatus: PaceStatusType;
    utilizationPct: number;
}

export interface GoalSummary {
    targetLeads?: number;
    targetCPL?: number;
    actualLeads: number;
    actualCPL: number;
    progressPct: number;
}

/* ---- Legacy CHANNEL_ maps (kept for pages not yet refactored) ---- */
/* Keys include BOTH normalized IDs (page_san) and raw DB strings (Page, 2 PAGE TEENNIE) */
export const CHANNEL_LABELS: Record<string, string> = {
    // Normalized IDs
    page_san: 'Page San', page_teennie: 'Page Teennie', page_tgil: 'Page TGIL',
    web: 'Web', zalo_oa: 'Zalo OA', instagram: 'Instagram', tiktok: 'TikTok',
    hotline: 'Hotline', gioi_thieu: 'Giới thiệu', vang_lai: 'Vãng lai',
    doi_tac: 'Đối tác', data_truong: 'Data trường', khac: 'Khác',
    tu_van_lai: 'Tư Vấn Lại',
    FACEBOOK: 'Facebook Ads', TIKTOK: 'TikTok Ads', ZALO: 'Zalo OA/Ads', CRM: 'CRM',
    // Raw DB string values (from Google Sheet import)
    'Page': 'Page San',
    '2 PAGE TEENNIE': 'Page Teennie',
    '3 PAGE TGIL': 'Page TGIL',
    'Web': 'Web',
    'Zalo OA': 'Zalo OA',
    'Instagram': 'Instagram',
    'TikTok': 'TikTok',
    'Tiktok': 'TikTok',
    'Hotline': 'Hotline',
    'Giới Thiệu': 'Giới thiệu',
    'Giới thiệu': 'Giới thiệu',
    'Vãng Lai': 'Vãng lai',
    'Vãng lai': 'Vãng lai',
    'Đối Tác': 'Đối tác',
    'Đối tác': 'Đối tác',
    'Data Trường': 'Data trường',
    'Data trường': 'Data trường',
    'Khác': 'Khác',
    'Tư Vấn Lại': 'Tư Vấn Lại',
    'Facebook': 'Facebook',
    'Google': 'Google Ads',
};

export const CHANNEL_COLORS: Record<string, string> = {
    // Normalized IDs
    page_san: '#1877F2', page_teennie: '#E91E90', page_tgil: '#F59E0B',
    web: '#10B981', zalo_oa: '#0068FF', instagram: '#E1306C', tiktok: '#010101',
    hotline: '#F59E0B', gioi_thieu: '#8B5CF6', vang_lai: '#EC4899',
    doi_tac: '#14B8A6', data_truong: '#F97316', khac: '#6B7280',
    tu_van_lai: '#7C3AED',
    FACEBOOK: '#1877F2', TIKTOK: '#010101', ZALO: '#0068FF', CRM: '#10B981',
    // Raw DB string values (from Google Sheet import)
    'Page': '#1877F2',
    '2 PAGE TEENNIE': '#E91E90',
    '3 PAGE TGIL': '#F59E0B',
    'Web': '#10B981',
    'Zalo OA': '#0068FF',
    'Instagram': '#E1306C',
    'TikTok': '#010101',
    'Tiktok': '#010101',
    'Hotline': '#EAB308',
    'Giới Thiệu': '#8B5CF6',
    'Giới thiệu': '#8B5CF6',
    'Vãng Lai': '#EC4899',
    'Vãng lai': '#EC4899',
    'Đối Tác': '#14B8A6',
    'Đối tác': '#14B8A6',
    'Data Trường': '#F97316',
    'Data trường': '#F97316',
    'Khác': '#6B7280',
    'Tư Vấn Lại': '#7C3AED',
    'Facebook': '#1877F2',
    'Google': '#4285F4',
};

