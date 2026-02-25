import type { CampaignStatus } from '@marketing-hub/shared';

export interface CampaignItem {
    id: string;
    companyId: string;
    name: string;
    channel: string;
    status: CampaignStatus;
    startDate?: string;
    endDate?: string;
    metrics: { impressions: number; clicks: number; leads: number; conversions: number; spend: number };
}

/* Helper — random but consistent metrics for demo */
function m(imp: number, clk: number, ld: number, conv: number, sp: number) {
    return { impressions: imp, clicks: clk, leads: ld, conversions: conv, spend: sp };
}

/* ---- San Dentist — 39 real campaigns ---- */
const SAN_CAMPAIGNS: CampaignItem[] = [
    { id: 's1', companyId: 'san', name: 'THÁNH SÚN ÁO BÔNG ĐEN', channel: 'page_san', status: 'BẬT', metrics: m(245_000, 12_400, 342, 68, 52_000_000) },
    { id: 's2', companyId: 'san', name: 'NGÔ KIẾN HUY VEST TRẮNG', channel: 'page_san', status: 'BẬT', metrics: m(312_000, 18_900, 456, 92, 78_000_000) },
    { id: 's3', companyId: 'san', name: 'NGÔ KIẾN HUY VEST ĐEN THẢ TYM', channel: 'page_san', status: 'TẮT', metrics: m(189_000, 9_200, 198, 41, 35_000_000) },
    { id: 's4', companyId: 'san', name: 'VTV1 - San+TGIP', channel: 'page_san', status: 'TẮT', metrics: m(92_000, 4_100, 87, 15, 18_000_000) },
    { id: 's5', companyId: 'san', name: 'Bảng giá San Dentist', channel: 'page_san', status: 'TẮT', metrics: m(156_000, 8_300, 234, 52, 42_000_000) },
    { id: 's6', companyId: 'san', name: 'Liên hoàn cước San Dentist', channel: 'page_san', status: 'TẮT', metrics: m(178_000, 11_200, 289, 58, 45_000_000) },
    { id: 's7', companyId: 'san', name: 'Răng Tết', channel: 'page_san', status: 'TẮT', metrics: m(134_000, 7_800, 167, 34, 28_000_000) },
    { id: 's8', companyId: 'san', name: 'Răng sứ 48H', channel: 'page_san', status: 'TẮT', metrics: m(98_000, 5_400, 123, 25, 22_000_000) },
    { id: 's9', companyId: 'san', name: 'Tuấn Cry - Hình Ảnh', channel: 'page_san', status: 'TẮT', metrics: m(67_000, 3_200, 78, 12, 15_000_000) },
    { id: 's10', companyId: 'san', name: 'Ưu đãi Combo 16 răng sứ', channel: 'page_san', status: 'TẮT', metrics: m(145_000, 9_100, 198, 45, 38_000_000) },
    { id: 's11', companyId: 'san', name: 'Ưu đãi 10% San Dentist', channel: 'page_san', status: 'TẮT', metrics: m(112_000, 6_800, 156, 32, 25_000_000) },
    { id: 's12', companyId: 'san', name: 'Web San', channel: 'web', status: 'BẬT', metrics: m(89_000, 12_300, 234, 67, 18_000_000) },
    { id: 's13', companyId: 'san', name: 'Zalo OA San', channel: 'zalo_oa', status: 'BẬT', metrics: m(45_000, 3_200, 89, 23, 8_000_000) },
    { id: 's14', companyId: 'san', name: 'Instagram San', channel: 'instagram', status: 'BẬT', metrics: m(167_000, 8_900, 145, 34, 22_000_000) },
    { id: 's15', companyId: 'san', name: 'Hotline San', channel: 'hotline', status: 'BẬT', metrics: m(0, 0, 312, 156, 0) },
    { id: 's16', companyId: 'san', name: 'Giới thiệu San', channel: 'gioi_thieu', status: 'BẬT', metrics: m(0, 0, 189, 98, 0) },
    { id: 's17', companyId: 'san', name: 'Vãng lai San', channel: 'vang_lai', status: 'BẬT', metrics: m(0, 0, 78, 45, 0) },
    { id: 's18', companyId: 'san', name: 'Đối tác', channel: 'doi_tac', status: 'BẬT', metrics: m(0, 0, 56, 34, 0) },
    { id: 's19', companyId: 'san', name: 'San', channel: 'khac', status: 'BẬT', metrics: m(0, 0, 23, 12, 0) },
    { id: 's20', companyId: 'san', name: 'Data trường', channel: 'data_truong', status: 'BẬT', metrics: m(0, 0, 145, 67, 0) },
    { id: 's21', companyId: 'san', name: 'Tiktok San', channel: 'tiktok', status: 'BẬT', metrics: m(234_000, 15_600, 178, 42, 32_000_000) },
    { id: 's22', companyId: 'san', name: 'Ngô Kiến Huy vest xám', channel: 'page_san', status: 'BẬT', metrics: m(278_000, 16_700, 389, 78, 65_000_000) },
    { id: 's23', companyId: 'san', name: 'Nhã Phương', channel: 'page_san', status: 'BẬT', startDate: '2025-05-23', metrics: m(198_000, 14_200, 312, 65, 48_000_000) },
    { id: 's24', companyId: 'san', name: 'Đại tiệc răng sứ - NKH - Vest Trắng', channel: 'page_san', status: 'BẬT', metrics: m(345_000, 21_300, 478, 98, 82_000_000) },
    { id: 's25', companyId: 'san', name: 'Tuấn Cry - Video', channel: 'page_san', status: 'TẮT', metrics: m(89_000, 5_600, 98, 18, 18_000_000) },
    { id: 's26', companyId: 'san', name: 'Trọn gói 15tr', channel: 'page_san', status: 'TẮT', metrics: m(123_000, 7_800, 167, 38, 28_000_000) },
    { id: 's27', companyId: 'san', name: '6Triệu', channel: 'page_san', status: 'TẮT', metrics: m(78_000, 4_500, 89, 21, 16_000_000) },
    { id: 's28', companyId: 'san', name: 'Du lịch', channel: 'page_san', status: 'TẮT', metrics: m(56_000, 3_100, 45, 8, 12_000_000) },
    { id: 's29', companyId: 'san', name: 'Thánh súng áo trắng', channel: 'page_san', status: 'TẮT', metrics: m(189_000, 10_800, 256, 54, 42_000_000) },
    { id: 's30', companyId: 'san', name: 'Review', channel: 'page_san', status: 'TẮT', metrics: m(67_000, 4_200, 78, 15, 14_000_000) },
    { id: 's31', companyId: 'san', name: 'KOL', channel: 'page_san', status: 'TẮT', metrics: m(234_000, 12_100, 289, 62, 55_000_000) },
    { id: 's32', companyId: 'san', name: 'Carousel', channel: 'page_san', status: 'TẮT', metrics: m(98_000, 5_900, 123, 28, 20_000_000) },
    { id: 's33', companyId: 'san', name: 'TGT8', channel: 'page_san', status: 'TẮT', metrics: m(45_000, 2_800, 56, 12, 9_000_000) },
    { id: 's34', companyId: 'san', name: 'Trọn bộ', channel: 'page_san', status: 'TẮT', metrics: m(112_000, 6_700, 145, 32, 24_000_000) },
    { id: 's35', companyId: 'san', name: 'LHC', channel: 'page_san', status: 'TẮT', metrics: m(78_000, 4_100, 89, 18, 15_000_000) },
    { id: 's36', companyId: 'san', name: 'NKH 3Không', channel: 'page_san', status: 'TẮT', metrics: m(156_000, 9_400, 212, 45, 35_000_000) },
    { id: 's37', companyId: 'san', name: 'Tặng trụ', channel: 'page_san', status: 'TẮT', metrics: m(89_000, 5_200, 134, 28, 22_000_000) },
    { id: 's38', companyId: 'san', name: 'Đại tiệc', channel: 'page_san', status: 'TẮT', metrics: m(198_000, 11_600, 267, 56, 45_000_000) },
    { id: 's39', companyId: 'san', name: 'Phục hình', channel: 'page_san', status: 'TẮT', metrics: m(67_000, 3_800, 78, 15, 13_000_000) },
];

/* ---- Teennie — 30 real campaigns from Master sheet ---- */
const TEENNIE_CAMPAIGNS: CampaignItem[] = [
    { id: 't1', companyId: 'teennie', name: 'A 5 TRIỆU NỀN XANH', channel: 'page_teennie', status: 'TẮT', metrics: m(145_000, 8_900, 234, 48, 32_000_000) },
    { id: 't2', companyId: 'teennie', name: 'B TIẾN LUẬT CHỮ HỒNG', channel: 'page_teennie', status: 'BẬT', metrics: m(189_000, 12_300, 312, 65, 45_000_000) },
    { id: 't3', companyId: 'teennie', name: 'NGÔ KIẾN HUY HỒNG', channel: 'page_teennie', status: 'TẮT', metrics: m(267_000, 15_600, 345, 72, 58_000_000) },
    { id: 't4', companyId: 'teennie', name: 'TEENNIE - ASMR', channel: 'page_teennie', status: 'TẮT', metrics: m(98_000, 5_400, 89, 18, 15_000_000) },
    { id: 't5', companyId: 'teennie', name: 'NIỀNG RĂNG XINH, GIÁ HỌC SINH', channel: 'page_teennie', status: 'TẮT', metrics: m(178_000, 10_200, 256, 52, 42_000_000) },
    { id: 't6', companyId: 'teennie', name: 'NKH 0đ', channel: 'page_teennie', status: 'TẮT', metrics: m(134_000, 7_800, 167, 34, 28_000_000) },
    { id: 't7', companyId: 'teennie', name: 'Tết', channel: 'page_teennie', status: 'TẮT', metrics: m(112_000, 6_500, 145, 32, 25_000_000) },
    { id: 't8', companyId: 'teennie', name: 'Niềng Răng 5 Triệu - Tiến Luật', channel: 'page_teennie', status: 'TẮT', metrics: m(198_000, 11_800, 278, 58, 48_000_000) },
    { id: 't9', companyId: 'teennie', name: 'Flex Mèo', channel: 'page_teennie', status: 'TẮT', metrics: m(89_000, 4_900, 98, 21, 16_000_000) },
    { id: 't10', companyId: 'teennie', name: 'NKH Feedback', channel: 'page_teennie', status: 'TẮT', metrics: m(156_000, 9_300, 189, 42, 32_000_000) },
    { id: 't11', companyId: 'teennie', name: 'Review', channel: 'page_teennie', status: 'TẮT', metrics: m(67_000, 3_800, 78, 15, 12_000_000) },
    { id: 't12', companyId: 'teennie', name: 'Carousel', channel: 'page_teennie', status: 'TẮT', metrics: m(78_000, 4_500, 89, 18, 14_000_000) },
    { id: 't13', companyId: 'teennie', name: 'Du lịch', channel: 'page_teennie', status: 'TẮT', metrics: m(56_000, 3_100, 45, 8, 9_000_000) },
    { id: 't14', companyId: 'teennie', name: 'KOL', channel: 'page_teennie', status: 'TẮT', metrics: m(198_000, 11_200, 234, 52, 42_000_000) },
    { id: 't15', companyId: 'teennie', name: 'Tiktok Teennie NKH', channel: 'tiktok', status: 'TẮT', metrics: m(345_000, 21_000, 189, 42, 28_000_000) },
    { id: 't16', companyId: 'teennie', name: 'Khác Teennie', channel: 'khac', status: 'BẬT', metrics: m(0, 0, 34, 18, 0) },
    { id: 't17', companyId: 'teennie', name: 'Tiktok Teennie', channel: 'tiktok', status: 'BẬT', metrics: m(289_000, 18_400, 198, 45, 32_000_000) },
    { id: 't18', companyId: 'teennie', name: 'Web Teennie', channel: 'web', status: 'BẬT', metrics: m(56_000, 7_800, 145, 38, 12_000_000) },
    { id: 't19', companyId: 'teennie', name: 'Zalo OA Teennie', channel: 'zalo_oa', status: 'BẬT', metrics: m(34_000, 2_100, 56, 15, 6_000_000) },
    { id: 't20', companyId: 'teennie', name: 'Instagram Teennie', channel: 'instagram', status: 'BẬT', metrics: m(98_000, 6_200, 78, 18, 15_000_000) },
    { id: 't21', companyId: 'teennie', name: 'Hotline Teennie', channel: 'hotline', status: 'BẬT', metrics: m(0, 0, 167, 89, 0) },
    { id: 't22', companyId: 'teennie', name: 'Giới thiệu Teennie', channel: 'gioi_thieu', status: 'BẬT', metrics: m(0, 0, 123, 67, 0) },
    { id: 't23', companyId: 'teennie', name: 'Vãng lai Teennie', channel: 'vang_lai', status: 'BẬT', metrics: m(0, 0, 45, 28, 0) },
    { id: 't24', companyId: 'teennie', name: 'Đối tác Teennie', channel: 'doi_tac', status: 'BẬT', metrics: m(0, 0, 34, 18, 0) },
    { id: 't25', companyId: 'teennie', name: 'Nhã Phương Teennie', channel: 'page_teennie', status: 'BẬT', startDate: '2025-05-23', metrics: m(167_000, 10_800, 245, 52, 38_000_000) },
    { id: 't26', companyId: 'teennie', name: 'Liên hoàn cước Teennie', channel: 'page_teennie', status: 'TẮT', metrics: m(134_000, 8_200, 178, 38, 28_000_000) },
    { id: 't27', companyId: 'teennie', name: 'Đại tiệc Teennie', channel: 'page_teennie', status: 'TẮT', metrics: m(145_000, 9_100, 198, 42, 32_000_000) },
    { id: 't28', companyId: 'teennie', name: 'Combo niềng răng', channel: 'page_teennie', status: 'TẮT', metrics: m(89_000, 5_200, 112, 24, 18_000_000) },
    { id: 't29', companyId: 'teennie', name: 'NKH Vest Trắng Teennie', channel: 'page_teennie', status: 'TẮT', metrics: m(234_000, 14_500, 312, 68, 52_000_000) },
    { id: 't30', companyId: 'teennie', name: 'Phục hình Teennie', channel: 'page_teennie', status: 'TẮT', metrics: m(56_000, 3_200, 67, 14, 11_000_000) },
];

/* ---- TGIL — 29 real campaigns from Master sheet ---- */
const TGIL_CAMPAIGNS: CampaignItem[] = [
    { id: 'g1', companyId: 'tgil', name: 'HTV9', channel: 'page_tgil', status: 'TẮT', metrics: m(198_000, 11_200, 234, 52, 48_000_000) },
    { id: 'g2', companyId: 'tgil', name: 'VTV1 - Bác Sĩ Dũng', channel: 'page_tgil', status: 'BẬT', metrics: m(267_000, 16_800, 389, 82, 72_000_000) },
    { id: 'g3', companyId: 'tgil', name: 'Bảng giá Implant', channel: 'page_tgil', status: 'TẮT', metrics: m(145_000, 8_900, 198, 45, 35_000_000) },
    { id: 'g4', companyId: 'tgil', name: 'VTV - Liên hoàn cước - Trường Giang', channel: 'page_tgil', status: 'TẮT', metrics: m(312_000, 19_200, 412, 92, 85_000_000) },
    { id: 'g5', companyId: 'tgil', name: 'Trồng răng Ưu đãi 5%', channel: 'page_tgil', status: 'TẮT', metrics: m(89_000, 5_400, 112, 25, 18_000_000) },
    { id: 'g6', companyId: 'tgil', name: 'THVL1 - Bác sĩ Dũng', channel: 'page_tgil', status: 'TẮT', metrics: m(156_000, 9_800, 198, 42, 32_000_000) },
    { id: 'g7', companyId: 'tgil', name: 'ALL ON 4', channel: 'page_tgil', status: 'TẮT', metrics: m(112_000, 7_200, 145, 38, 28_000_000) },
    { id: 'g8', companyId: 'tgil', name: 'Implant 4tr', channel: 'page_tgil', status: 'TẮT', metrics: m(178_000, 10_800, 234, 52, 42_000_000) },
    { id: 'g9', companyId: 'tgil', name: 'Trọn gói 4tr', channel: 'page_tgil', status: 'TẮT', metrics: m(134_000, 7_600, 167, 35, 25_000_000) },
    { id: 'g10', companyId: 'tgil', name: 'Du lịch', channel: 'page_tgil', status: 'TẮT', metrics: m(45_000, 2_800, 45, 8, 8_000_000) },
    { id: 'g11', companyId: 'tgil', name: 'Review', channel: 'page_tgil', status: 'TẮT', metrics: m(67_000, 4_200, 78, 15, 12_000_000) },
    { id: 'g12', companyId: 'tgil', name: 'KOL', channel: 'page_tgil', status: 'TẮT', metrics: m(189_000, 11_400, 256, 58, 48_000_000) },
    { id: 'g13', companyId: 'tgil', name: 'Carousel', channel: 'page_tgil', status: 'TẮT', metrics: m(78_000, 4_800, 89, 18, 14_000_000) },
    { id: 'g14', companyId: 'tgil', name: 'Phục hình', channel: 'page_tgil', status: 'TẮT', metrics: m(98_000, 5_600, 112, 25, 18_000_000) },
    { id: 'g15', companyId: 'tgil', name: 'DATA TRƯỜNG', channel: 'data_truong', status: 'BẬT', metrics: m(0, 0, 198, 89, 0) },
    { id: 'g16', companyId: 'tgil', name: 'Khác TGIL', channel: 'khac', status: 'BẬT', metrics: m(0, 0, 45, 22, 0) },
    { id: 'g17', companyId: 'tgil', name: 'Tiktok TGIL', channel: 'tiktok', status: 'BẬT', metrics: m(234_000, 15_200, 167, 38, 28_000_000) },
    { id: 'g18', companyId: 'tgil', name: 'Nhã Phương', channel: 'page_tgil', status: 'BẬT', startDate: '2025-05-23', metrics: m(198_000, 12_400, 289, 62, 48_000_000) },
    { id: 'g19', companyId: 'tgil', name: 'Web TGIP', channel: 'web', status: 'BẬT', metrics: m(78_000, 9_200, 167, 45, 15_000_000) },
    { id: 'g20', companyId: 'tgil', name: 'Zalo OA TGIL', channel: 'zalo_oa', status: 'BẬT', metrics: m(34_000, 2_400, 78, 28, 7_000_000) },
    { id: 'g21', companyId: 'tgil', name: 'Hotline TGIL', channel: 'hotline', status: 'BẬT', metrics: m(0, 0, 245, 134, 0) },
    { id: 'g22', companyId: 'tgil', name: 'Giới thiệu TGIL', channel: 'gioi_thieu', status: 'BẬT', metrics: m(0, 0, 134, 72, 0) },
    { id: 'g23', companyId: 'tgil', name: 'Vãng lai TGIL', channel: 'vang_lai', status: 'BẬT', metrics: m(0, 0, 56, 32, 0) },
    { id: 'g24', companyId: 'tgil', name: 'Instagram TGIL', channel: 'instagram', status: 'BẬT', metrics: m(89_000, 5_200, 78, 18, 12_000_000) },
    { id: 'g25', companyId: 'tgil', name: 'Đối tác TGIL', channel: 'doi_tac', status: 'BẬT', metrics: m(0, 0, 89, 56, 0) },
    { id: 'g26', companyId: 'tgil', name: 'Tư Vấn Lại', channel: 'tu_van_lai', status: 'BẬT', metrics: m(0, 0, 156, 98, 0) },
    { id: 'g27', companyId: 'tgil', name: 'NKH Implant', channel: 'page_tgil', status: 'TẮT', metrics: m(145_000, 8_900, 189, 42, 32_000_000) },
    { id: 'g28', companyId: 'tgil', name: 'Đại tiệc Implant', channel: 'page_tgil', status: 'TẮT', metrics: m(178_000, 10_200, 234, 52, 42_000_000) },
    { id: 'g29', companyId: 'tgil', name: 'Tặng trụ Implant', channel: 'page_tgil', status: 'TẮT', metrics: m(112_000, 6_800, 145, 32, 22_000_000) },
];

/* ---- Combined store ---- */
let campaigns: CampaignItem[] = [...SAN_CAMPAIGNS, ...TEENNIE_CAMPAIGNS, ...TGIL_CAMPAIGNS];
let nextId = 200;

/* ---- API ---- */
export function getCampaigns(companyId?: string): CampaignItem[] {
    if (!companyId || companyId === 'all') return campaigns;
    return campaigns.filter(c => c.companyId === companyId);
}

export function getCampaignById(id: string): CampaignItem | undefined {
    return campaigns.find(c => c.id === id);
}

export function toggleCampaignStatus(id: string): CampaignStatus | null {
    const c = campaigns.find(x => x.id === id);
    if (!c) return null;
    c.status = c.status === 'BẬT' ? 'TẮT' : 'BẬT';
    return c.status;
}

export function addCampaign(data: { companyId: string; name: string; channel: string; startDate?: string; endDate?: string }): CampaignItem {
    const item: CampaignItem = {
        id: `c${nextId++}`,
        companyId: data.companyId,
        name: data.name,
        channel: data.channel,
        status: 'BẬT',
        startDate: data.startDate,
        endDate: data.endDate,
        metrics: { impressions: 0, clicks: 0, leads: 0, conversions: 0, spend: 0 },
    };
    campaigns = [item, ...campaigns];
    return item;
}

export function deleteCampaign(id: string): boolean {
    const idx = campaigns.findIndex(c => c.id === id);
    if (idx === -1) return false;
    campaigns.splice(idx, 1);
    return true;
}

/* ---- Aggregate helpers ---- */
export function getCompanyStats(companyId: string) {
    const list = getCampaigns(companyId);
    const active = list.filter(c => c.status === 'BẬT');
    return {
        total: list.length,
        active: active.length,
        inactive: list.length - active.length,
        totalLeads: list.reduce((s, c) => s + c.metrics.leads, 0),
        totalSpend: list.reduce((s, c) => s + c.metrics.spend, 0),
        totalImpressions: list.reduce((s, c) => s + c.metrics.impressions, 0),
        totalClicks: list.reduce((s, c) => s + c.metrics.clicks, 0),
        totalConversions: list.reduce((s, c) => s + c.metrics.conversions, 0),
    };
}

// Legacy compat
export function updateCampaignStatus(id: string, status: CampaignStatus): boolean {
    const c = campaigns.find(x => x.id === id);
    if (!c) return false;
    c.status = status;
    return true;
}
