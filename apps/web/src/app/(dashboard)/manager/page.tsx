'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { COMPANIES, CHANNEL_LABELS, CHANNEL_COLORS, STATUS_COLORS, formatVND } from '@marketing-hub/shared';
import { useCompany } from '../layout';
import { IconPlus, IconClose, IconTarget, IconDollar, IconChart, IconFilter, IconEye } from '@/app/components/icons';
import DatePicker from '@/app/components/DatePicker';

/* ---- Types ---- */
interface CampaignRow {
    id: string;
    companyId: string;
    name: string;
    channel: string;
    status: string;
    startDate?: string;
    endDate?: string;
    metrics: { leads: number; spend: number; quality: number };
}

/* ---- API response types ---- */
interface APICampaign {
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

interface APIMasterStatus {
    companyId: string;
    status: string;
    _count: number;
}

interface APISummary {
    companyId: string;
    _sum: {
        totalLead: number | null;
        budgetActual: string | null;
    };
}

interface APIMasterCampaign {
    companyId: string;
    campaignId: number;
    channel: string;
    name: string;
    status: string;
    startDate?: string;
    endDate?: string;
}

interface APIResponse {
    summary: APISummary[];
    campaigns: APICampaign[];
    masterStatus: APIMasterStatus[];
}

/* ---- Helpers ---- */
function numOrZero(v: number | string | null | undefined): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return parseFloat(v) || 0;
    return v;
}

/* ====== Trend Badge (reusable) ====== */
function TrendBadge({ value }: { value: number }) {
    if (value === 0) return null;
    const isUp = value > 0;
    const color = isUp ? 'var(--success)' : 'var(--danger)';
    return (
        <span style={{ color, fontSize: 'var(--font-sm)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
            <span>{isUp ? '↑' : '↓'}</span>
            {isUp ? '+' : ''}{value.toFixed(1)}%
        </span>
    );
}

export default function ManagerDashboard() {
    const { selectedCompanyId } = useCompany();
    const [, forceUpdate] = useState(0);
    const refresh = () => forceUpdate(n => n + 1);

    const [showCreate, setShowCreate] = useState(false);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [filterChannel, setFilterChannel] = useState('all');
    const [filterStatus, setFilterStatus] = useState('BẬT');

    /* ---- Table sort state ---- */
    const [sortKey, setSortKey] = useState<'leads' | 'spend' | 'quality'>('leads');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const isPortfolio = selectedCompanyId === 'all';
    const [activeCard, setActiveCard] = useState<string>('all');

    const effectiveCompanyId = isPortfolio
        ? (activeCard === 'all' ? undefined : activeCard)
        : selectedCompanyId;

    // Real data from API
    const [apiData, setApiData] = useState<APIResponse | null>(null);
    const [masterCampaigns, setMasterCampaigns] = useState<APIMasterCampaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real data
    useEffect(() => {
        setLoading(true);
        Promise.all([
            fetch('/api/marketing').then(r => r.ok ? r.json() : null),
            fetch('/api/marketing/campaigns').then(r => r.ok ? r.json() : null).catch(() => null),
        ]).then(([marketing, master]) => {
            if (marketing) setApiData(marketing);
            if (master?.campaigns) setMasterCampaigns(master.campaigns);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [forceUpdate]);

    // Build campaign rows from API data — merge master status with entry metrics
    const campaigns = useMemo<CampaignRow[]>(() => {
        if (!apiData?.campaigns) return [];

        // Build metrics map from MarketingEntry groupBy
        const metricsMap = new Map<string, { leads: number; spend: number; quality: number; channel: string; companyId: string }>();
        for (const c of apiData.campaigns) {
            const key = `${c.companyId}:${c.campaignName}`;
            const existing = metricsMap.get(key);
            if (existing) {
                existing.leads += numOrZero(c._sum.totalLead);
                existing.spend += numOrZero(c._sum.budgetActual);
                existing.quality += numOrZero(c._sum.quality);
            } else {
                metricsMap.set(key, {
                    leads: numOrZero(c._sum.totalLead),
                    spend: numOrZero(c._sum.budgetActual),
                    quality: numOrZero(c._sum.quality),
                    channel: c.channel,
                    companyId: c.companyId,
                });
            }
        }

        // Build status map from CampaignMaster
        const statusMap = new Map<string, { status: string; startDate?: string; endDate?: string }>();
        for (const m of masterCampaigns) {
            statusMap.set(`${m.companyId}:${m.name}`, { status: m.status, startDate: m.startDate, endDate: m.endDate });
        }

        // Merge: every unique campaign name gets a row
        const rows: CampaignRow[] = [];
        let idx = 0;
        for (const [key, metrics] of metricsMap) {
            const master = statusMap.get(key);
            const [companyId, ...nameParts] = key.split(':');
            const name = nameParts.join(':');
            rows.push({
                id: `cm-${idx++}`,
                companyId,
                name,
                channel: metrics.channel,
                status: master?.status || 'BẬT',
                startDate: master?.startDate,
                endDate: master?.endDate,
                metrics: { leads: metrics.leads, spend: metrics.spend, quality: metrics.quality },
            });
        }

        // Also add master campaigns with no entry data
        for (const m of masterCampaigns) {
            const key = `${m.companyId}:${m.name}`;
            if (!metricsMap.has(key)) {
                rows.push({
                    id: `cm-${idx++}`,
                    companyId: m.companyId,
                    name: m.name,
                    channel: m.channel,
                    status: m.status,
                    startDate: m.startDate,
                    endDate: m.endDate,
                    metrics: { leads: 0, spend: 0, quality: 0 },
                });
            }
        }

        // Filter by company
        if (effectiveCompanyId) {
            return rows.filter(r => r.companyId === effectiveCompanyId);
        }
        return rows;
    }, [apiData, masterCampaigns, effectiveCompanyId]);

    // Filtered campaigns
    const filtered = useMemo(() => {
        let list = campaigns;
        if (filterChannel !== 'all') list = list.filter(c => c.channel === filterChannel);
        if (filterStatus !== 'all') list = list.filter(c => c.status === filterStatus);
        return list;
    }, [campaigns, filterChannel, filterStatus]);

    const sortedFiltered = useMemo(() => {
        const arr = [...filtered];
        arr.sort((a, b) => {
            const va = a.metrics[sortKey];
            const vb = b.metrics[sortKey];
            return sortDir === 'desc' ? vb - va : va - vb;
        });
        return arr;
    }, [filtered, sortKey, sortDir]);

    const handleSort = useCallback((key: 'leads' | 'spend' | 'quality') => {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    }, [sortKey]);

    const maxLeads = useMemo(() => Math.max(...sortedFiltered.map(c => c.metrics.leads), 1), [sortedFiltered]);
    const maxSpend = useMemo(() => Math.max(...sortedFiltered.map(c => c.metrics.spend), 1), [sortedFiltered]);

    const detailCampaign = detailId ? campaigns.find(c => c.id === detailId) : null;

    const channelsInView = useMemo(() => {
        const set = new Set(campaigns.map(c => c.channel));
        return Array.from(set);
    }, [campaigns]);

    function handleCardSelect(id: string) {
        setActiveCard(id);
        setFilterChannel('all');
        setFilterStatus('BẬT');
    }

    // Selector card data from real API
    const selectorCards = useMemo(() => {
        if (!apiData?.summary) return [];
        const ms = apiData.masterStatus || [];

        const allLeads = apiData.summary.reduce((s, r) => s + numOrZero(r._sum.totalLead), 0);
        const allSpend = apiData.summary.reduce((s, r) => s + numOrZero(r._sum.budgetActual), 0);
        const allActive = ms.filter(m => m.status === 'BẬT').reduce((s, m) => s + m._count, 0);
        const allTotal = ms.reduce((s, m) => s + m._count, 0);

        return [
            {
                id: 'all',
                label: 'Tổng công ty',
                color: '#6B6F76',
                initial: '∑',
                leads: allLeads,
                spend: allSpend,
                cpl: allLeads > 0 ? allSpend / allLeads : 0,
                campaigns: allTotal,
                active: allActive,
            },
            ...COMPANIES.map(co => {
                const row = apiData.summary.find(s => s.companyId === co.id);
                const coActive = ms.filter(m => m.companyId === co.id && m.status === 'BẬT').reduce((s, m) => s + m._count, 0);
                const coTotal = ms.filter(m => m.companyId === co.id).reduce((s, m) => s + m._count, 0);
                const leads = numOrZero(row?._sum.totalLead);
                const spend = numOrZero(row?._sum.budgetActual);
                return {
                    id: co.id,
                    label: co.name,
                    color: co.color,
                    initial: co.shortName.charAt(0),
                    leads,
                    spend,
                    cpl: leads > 0 ? spend / leads : 0,
                    campaigns: coTotal,
                    active: coActive,
                };
            }),
        ];
    }, [apiData]);

    const activeLabel = activeCard === 'all'
        ? 'Tất cả công ty'
        : COMPANIES.find(c => c.id === activeCard)?.name || '';

    return (
        <>
            {/* ═══ Header ═══ */}
            <div className="page-header">
                <div>
                    <h1>{isPortfolio ? 'Quản lý chiến dịch' : `Chiến dịch — ${COMPANIES.find(c => c.id === selectedCompanyId)?.name}`}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-md)', marginTop: '0.25rem' }}>
                        {isPortfolio ? activeLabel : `${campaigns.length} chiến dịch`}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <IconPlus size={14} /> Tạo chiến dịch
                </button>
            </div>

            {/* ═══ 4 Unified Selector Cards (portfolio mode) ═══ */}
            {isPortfolio && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    {selectorCards.map(card => {
                        const isActive = activeCard === card.id;
                        return (
                            <div
                                key={card.id}
                                onClick={() => handleCardSelect(card.id)}
                                className="card"
                                style={{
                                    cursor: 'pointer',
                                    borderTop: `3px solid ${card.color}`,
                                    outline: isActive ? `2px solid ${card.color}` : 'none',
                                    outlineOffset: -1,
                                    opacity: isActive ? 1 : 0.55,
                                    boxShadow: isActive ? 'var(--shadow)' : 'none',
                                    transition: 'all 0.18s ease',
                                    padding: '0.875rem 1rem',
                                }}
                                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
                                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div style={{
                                        width: 26, height: 26, borderRadius: 6,
                                        background: card.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: 'var(--font-sm)',
                                    }}>{card.initial}</div>
                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-md)', flex: 1 }}>{card.label}</span>
                                    {isActive && (
                                        <span style={{
                                            fontSize: 'var(--font-xs)', fontWeight: 600,
                                            background: card.color, color: 'white',
                                            padding: '0.15rem 0.5rem', borderRadius: 9999,
                                        }}>Đang chọn</span>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.25rem' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads</div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{card.leads.toLocaleString('vi-VN')}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chi tiêu</div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{formatVND(card.spend)}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CPL</div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{card.cpl > 0 ? formatVND(card.cpl) : '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chiến dịch</div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{card.active}<span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>/{card.campaigns}</span></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══ Filters ═══ */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: 'var(--font-base)', color: 'var(--text-muted)' }}>
                    <IconFilter size={14} /> Lọc:
                </div>
                <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)}
                    className="dp-trigger"
                    style={{ appearance: 'none', WebkitAppearance: 'none', minWidth: 140, paddingRight: '1.5rem', backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}>
                    <option value="all">Tất cả kênh</option>
                    {channelsInView.map(ch => <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="dp-trigger"
                    style={{ appearance: 'none', WebkitAppearance: 'none', minWidth: 140, paddingRight: '1.5rem', backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}>
                    <option value="all">Tất cả trạng thái</option>
                    <option value="BẬT">BẬT</option>
                    <option value="TẮT">TẮT</option>
                </select>
                <span style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)' }}>{filtered.length} chiến dịch</span>
            </div>

            {/* ═══ Campaign Table ═══ */}
            <div className="card" style={{ overflow: 'auto', padding: 0 }}>
                <table className="table" style={{ fontSize: 'var(--font-sm)', whiteSpace: 'nowrap' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-card)' }}>
                            <th style={{ width: 60 }}>TRẠNG THÁI</th>
                            <th>TÊN CHIẾN DỊCH</th>
                            <th>KÊNH</th>
                            {(['leads', 'spend', 'quality'] as const).map(key => (
                                <th
                                    key={key}
                                    onClick={() => handleSort(key)}
                                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', ...(key === 'leads' ? { fontWeight: 700, color: 'var(--primary)' } : {}) }}
                                >
                                    {{ leads: 'LEADS', spend: 'CHI TIÊU', quality: 'CHẤT LƯỢNG' }[key]}
                                    {sortKey === key && <span style={{ marginLeft: 4, fontSize: 'var(--font-sm)' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                                </th>
                            ))}
                            <th style={{ width: 50 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedFiltered.map(c => (
                            <tr key={c.id} style={{ opacity: c.status === 'TẮT' ? 0.6 : 1 }}>
                                <td>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: 4,
                                        fontSize: 'var(--font-xs)',
                                        fontWeight: 600,
                                        background: c.status === 'BẬT' ? 'var(--success)' : 'var(--border)',
                                        color: c.status === 'BẬT' ? 'white' : 'var(--text-muted)',
                                    }}>{c.status}</span>
                                </td>
                                <td style={{ fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</td>
                                <td><span style={{ color: CHANNEL_COLORS[c.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[c.channel] || c.channel}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{c.metrics.leads.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>{c.metrics.spend > 0 ? formatVND(c.metrics.spend) : '—'}</td>
                                <td style={{ textAlign: 'center' }}>{c.metrics.quality > 0 ? c.metrics.quality.toLocaleString('vi-VN') : '—'}</td>
                                <td>
                                    <button
                                        onClick={() => setDetailId(c.id)}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                    >
                                        <IconEye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ═══ Detail Drawer ═══ */}
            {detailCampaign && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'flex-end', zIndex: 200 }} onClick={() => setDetailId(null)}>
                    <div className="card" style={{ width: 420, height: '100%', borderRadius: 0, overflow: 'auto', animation: 'slideIn 0.25s ease' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{detailCampaign.name}</h2>
                                <div style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                    <span style={{ color: CHANNEL_COLORS[detailCampaign.channel] }}>● {CHANNEL_LABELS[detailCampaign.channel] || detailCampaign.channel}</span>
                                    <span style={{ color: detailCampaign.status === 'BẬT' ? 'var(--success)' : 'var(--text-muted)' }}>{detailCampaign.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><IconClose size={20} /></button>
                        </div>

                        {detailCampaign.startDate && (
                            <div style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Ngày bắt đầu: {detailCampaign.startDate} {detailCampaign.endDate && `— ${detailCampaign.endDate}`}
                            </div>
                        )}

                        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                            <IconChart size={14} /> Chỉ số
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="kpi-card"><h3>Leads</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, color: 'var(--primary)' }}>{detailCampaign.metrics.leads.toLocaleString('vi-VN')}</div></div>
                            <div className="kpi-card"><h3>Chất lượng</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, color: 'var(--success)' }}>{detailCampaign.metrics.quality.toLocaleString('vi-VN')}</div></div>
                            <div className="kpi-card"><h3><IconDollar size={14} /> Chi tiêu</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{detailCampaign.metrics.spend > 0 ? formatVND(detailCampaign.metrics.spend) : '—'}</div></div>
                            {detailCampaign.metrics.leads > 0 && detailCampaign.metrics.spend > 0 && (
                                <div className="kpi-card"><h3><IconTarget size={14} /> CPL</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{formatVND(detailCampaign.metrics.spend / detailCampaign.metrics.leads)}</div></div>
                            )}
                            {detailCampaign.metrics.leads > 0 && detailCampaign.metrics.quality > 0 && (
                                <div className="kpi-card"><h3>Tỷ lệ chất lượng</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, color: 'var(--success)' }}>{(detailCampaign.metrics.quality / detailCampaign.metrics.leads * 100).toFixed(1)}%</div></div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ Create Campaign Modal ═══ */}
            {showCreate && <CreateModal
                companyId={effectiveCompanyId || 'san'}
                onClose={() => setShowCreate(false)}
                onCreate={() => { refresh(); setShowCreate(false); }}
            />}
        </>
    );
}

function CreateModal({ companyId, onClose, onCreate }: { companyId: string; onClose: () => void; onCreate: () => void }) {
    const [coId, setCoId] = useState(companyId);
    const [form, setForm] = useState({ name: '', channel: '', startDate: '', endDate: '' });
    const co = COMPANIES.find(c => c.id === coId);

    function handleSubmit() {
        if (!form.name || !form.channel) return;
        // TODO: Call API to create campaign in CampaignMaster
        onCreate();
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
            <div className="card" style={{ width: '100%', maxWidth: 480, animation: 'slideUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: '1.5rem' }}><IconPlus size={18} /> Tạo chiến dịch mới</h2>

                <div className="form-group">
                    <label>Công ty</label>
                    <select value={coId} onChange={e => { setCoId(e.target.value); setForm({ ...form, channel: '' }); }}
                        style={{ width: '100%', padding: '0.625rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 'var(--font-md)' }}>
                        {COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label>Tên chiến dịch</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: NKH Vest Trắng" />
                </div>

                <div className="form-group">
                    <label>Kênh</label>
                    <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}
                        style={{ width: '100%', padding: '0.625rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: 'var(--font-md)' }}>
                        <option value="">Chọn kênh</option>
                        {co && (
                            <>
                                <optgroup label="Digital">
                                    {co.channels.filter(ch => ch.category === 'DIGITAL').map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
                                </optgroup>
                                <optgroup label="Offline">
                                    {co.channels.filter(ch => ch.category === 'OFFLINE').map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
                                </optgroup>
                            </>
                        )}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                        <label>Ngày bắt đầu</label>
                        <DatePicker
                            value={form.startDate}
                            onChange={v => setForm({ ...form, startDate: v })}
                            placeholder="Chọn ngày"
                        />
                    </div>
                    <div className="form-group">
                        <label>Ngày kết thúc</label>
                        <DatePicker
                            value={form.endDate}
                            onChange={v => setForm({ ...form, endDate: v })}
                            placeholder="Chọn ngày"
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={!form.name || !form.channel} style={{ flex: 1, justifyContent: 'center' }}>
                        <IconPlus size={14} /> Tạo
                    </button>
                </div>
            </div>
        </div>
    );
}
