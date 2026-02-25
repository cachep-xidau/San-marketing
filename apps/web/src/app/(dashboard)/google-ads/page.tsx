'use client';

import { useState, useEffect, useMemo } from 'react';
import type { GoogleAdsResponse, GoogleAdsCampaign } from '@/lib/google-ads-types';
import { IconSync, IconFilter } from '@/app/components/icons';

/* ---- Format helpers ---- */
function fmtMoney(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toFixed(0);
}

function fmtNum(v: number): string {
    return v.toLocaleString('vi-VN');
}

function fmtPct(v: number): string {
    return `${v.toFixed(2)}%`;
}

/* ---- KPI Card ---- */
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
        <div className="kpi-card">
            <h3>{label}</h3>
            <div className="value" style={{ color: color || 'var(--text)' }}>{value}</div>
            {sub && <div className="trend" style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)' }}>{sub}</div>}
        </div>
    );
}

/* ---- Status badge ---- */
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; color: string; label: string }> = {
        ENABLED: { bg: 'rgba(34,197,94,0.1)', color: '#16a34a', label: 'Đang chạy' },
        PAUSED: { bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'Tạm dừng' },
        REMOVED: { bg: 'rgba(239,68,68,0.1)', color: '#dc2626', label: 'Đã xóa' },
    };
    const c = config[status] || config.ENABLED;
    return (
        <span style={{
            padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: 'var(--font-sm)',
            fontWeight: 600, background: c.bg, color: c.color, whiteSpace: 'nowrap',
        }}>
            {c.label}
        </span>
    );
}

/* ---- Main Page ---- */
export default function GoogleAdsPage() {
    const [data, setData] = useState<GoogleAdsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = () => {
        setLoading(true);
        fetch('/api/google-ads')
            .then(r => r.json())
            .then((d: GoogleAdsResponse) => { setData(d); setLoading(false); setRefreshing(false); })
            .catch(() => { setLoading(false); setRefreshing(false); });
    };

    useEffect(() => { fetchData(); }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    /* ---- Filtered campaigns ---- */
    const filtered = useMemo(() => {
        if (!data?.campaigns) return [];
        let list = data.campaigns;
        if (filterAccount !== 'all') list = list.filter(c => c.account === filterAccount);
        if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
        return list;
    }, [data, filterAccount, filterStatus]);

    /* ---- Recalc metrics for filtered view ---- */
    const metrics = useMemo(() => {
        if (filtered.length === 0) return data?.metrics || {
            totalSpend: 0, totalClicks: 0, totalImpressions: 0,
            totalConversions: 0, avgCTR: 0, avgCPA: 0, avgROAS: 0,
        };
        const totalSpend = filtered.reduce((s, c) => s + c.spend, 0);
        const totalClicks = filtered.reduce((s, c) => s + c.clicks, 0);
        const totalImpressions = filtered.reduce((s, c) => s + c.impressions, 0);
        const totalConversions = filtered.reduce((s, c) => s + c.conversions, 0);
        return {
            totalSpend,
            totalClicks,
            totalImpressions,
            totalConversions,
            avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            avgCPA: totalConversions > 0 ? totalSpend / totalConversions : 0,
            avgROAS: totalSpend > 0
                ? filtered.reduce((s, c) => s + c.roas * c.spend, 0) / totalSpend
                : 0,
        };
    }, [filtered, data]);

    /* ---- Aggregate by campaign name (group dates) ---- */
    const aggregated = useMemo(() => {
        const map = new Map<string, GoogleAdsCampaign & { days: number }>();
        for (const c of filtered) {
            const key = `${c.account}|${c.campaign}`;
            const existing = map.get(key);
            if (existing) {
                existing.impressions += c.impressions;
                existing.clicks += c.clicks;
                existing.spend += c.spend;
                existing.conversions += c.conversions;
                existing.days += 1;
            } else {
                map.set(key, { ...c, days: 1 });
            }
        }
        // Recalc CPA/ROAS for aggregated
        return Array.from(map.values()).map(c => ({
            ...c,
            cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
            roas: c.spend > 0 ? (c.conversions * c.cpa) / c.spend : 0,
        })).sort((a, b) => b.spend - a.spend);
    }, [filtered]);

    const isDemo = !data || data.campaigns.length > 0;
    const noConfig = data && data.campaigns.length > 0 && !process.env.NEXT_PUBLIC_GOOGLE_SHEETS_CONFIGURED;

    if (loading) {
        return (
            <div style={{ padding: '2rem' }}>
                <div className="page-header"><h1>Google Ads</h1></div>
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                    Đang tải dữ liệu...
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 19.5h20L12 2z" stroke="#FBBC04" strokeWidth={2} strokeLinejoin="round" />
                            <circle cx="12" cy="14" r="2.5" fill="#4285F4" />
                        </svg>
                        Google Ads
                    </h1>
                    <p style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Dữ liệu quảng cáo Google Ads{data?.lastUpdated && ` • Cập nhật: ${new Date(data.lastUpdated).toLocaleString('vi-VN')}`}
                    </p>
                </div>
                <button className="btn btn-outline" onClick={handleRefresh} disabled={refreshing}>
                    <IconSync size={14} className={refreshing ? 'spin' : ''} />
                    {refreshing ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            {/* Demo banner */}
            <div style={{
                background: 'rgba(66, 133, 244, 0.06)', border: '1px solid rgba(66, 133, 244, 0.15)',
                borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem',
                fontSize: 'var(--font-base)', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
                <span style={{ fontSize: 'var(--font-lg)' }}>ℹ️</span>
                <span>
                    <strong>Demo mode</strong> — Chưa kết nối Google Sheets. Hiện đang hiển thị dữ liệu mẫu.
                    Cài đặt <code>GOOGLE_SHEETS_ID</code> và <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> trong env để kết nối.
                </span>
            </div>

            {/* KPI Grid */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                <KpiCard label="CHI PHÍ" value={`${fmtMoney(metrics.totalSpend)}₫`} color="#e53935" />
                <KpiCard label="CLICKS" value={fmtNum(metrics.totalClicks)} sub={`CTR: ${fmtPct(metrics.avgCTR)}`} />
                <KpiCard label="IMPRESSIONS" value={fmtNum(metrics.totalImpressions)} />
                <KpiCard label="CONVERSIONS" value={fmtNum(metrics.totalConversions)} sub={`CPA: ${fmtMoney(metrics.avgCPA)}₫`} />
                <KpiCard label="ROAS" value={metrics.avgROAS.toFixed(1)} sub="Trả về / chi phí" color="#2e7d32" />
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <IconFilter size={14} />
                        <span style={{ fontSize: 'var(--font-base)', fontWeight: 500 }}>Bộ lọc:</span>
                    </div>

                    <select
                        className="dp-trigger"
                        value={filterAccount}
                        onChange={e => setFilterAccount(e.target.value)}
                        style={{ appearance: 'none', WebkitAppearance: 'none', minWidth: 140, paddingRight: '1.5rem', backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                    >
                        <option value="all">Tất cả tài khoản</option>
                        {data?.accounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <select
                        className="dp-trigger"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{ appearance: 'none', WebkitAppearance: 'none', minWidth: 140, paddingRight: '1.5rem', backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="ENABLED">Đang chạy</option>
                        <option value="PAUSED">Tạm dừng</option>
                        <option value="REMOVED">Đã xóa</option>
                    </select>

                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        {aggregated.length} chiến dịch
                    </span>
                </div>
            </div>

            {/* Campaign Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>TÀI KHOẢN</th>
                                <th>CHIẾN DỊCH</th>
                                <th>TRẠNG THÁI</th>
                                <th style={{ textAlign: 'right' }}>IMPRESSIONS</th>
                                <th style={{ textAlign: 'right' }}>CLICKS</th>
                                <th style={{ textAlign: 'right' }}>CHI PHÍ</th>
                                <th style={{ textAlign: 'right' }}>CONVERSIONS</th>
                                <th style={{ textAlign: 'right' }}>CPA</th>
                                <th style={{ textAlign: 'right' }}>ROAS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregated.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        Không có dữ liệu
                                    </td>
                                </tr>
                            ) : (
                                aggregated.map((c, i) => (
                                    <tr key={i}>
                                        <td style={{ fontSize: 'var(--font-base)', fontWeight: 500 }}>{c.account}</td>
                                        <td>
                                            <div style={{ fontSize: 'var(--font-base)', fontWeight: 500 }}>{c.campaign}</div>
                                            {c.days > 1 && (
                                                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                                                    {c.days} ngày
                                                </div>
                                            )}
                                        </td>
                                        <td><StatusBadge status={c.status} /></td>
                                        <td style={{ textAlign: 'right', fontSize: 'var(--font-base)' }}>{fmtNum(c.impressions)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 'var(--font-base)' }}>{fmtNum(c.clicks)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 'var(--font-base)', fontWeight: 600, color: '#e53935' }}>
                                            {fmtMoney(c.spend)}₫
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: 'var(--font-base)', fontWeight: 600 }}>
                                            {c.conversions}
                                        </td>
                                        <td style={{ textAlign: 'right', fontSize: 'var(--font-base)' }}>
                                            {fmtMoney(c.cpa)}₫
                                        </td>
                                        <td style={{
                                            textAlign: 'right', fontSize: 'var(--font-base)', fontWeight: 600,
                                            color: c.roas >= 3 ? '#16a34a' : c.roas >= 2 ? '#d97706' : '#dc2626',
                                        }}>
                                            {c.roas.toFixed(1)}x
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
