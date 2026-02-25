'use client';

import { useState, useMemo, useCallback } from 'react';
import { COMPANIES, CHANNEL_LABELS, CHANNEL_COLORS, STATUS_COLORS, formatVND } from '@marketing-hub/shared';
import { getCampaigns, getCompanyStats, toggleCampaignStatus, addCampaign, type CampaignItem } from '@/lib/campaigns';
import { useCompany } from '../layout';
import { IconPlus, IconClose, IconTarget, IconDollar, IconChart, IconFilter, IconEye } from '@/app/components/icons';
import DatePicker from '@/app/components/DatePicker';

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
    const [filterStatus, setFilterStatus] = useState('BẬT'); // Default: only active

    /* ---- Table sort state ---- */
    const [sortKey, setSortKey] = useState<'leads' | 'spend' | 'clicks'>('leads');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const isPortfolio = selectedCompanyId === 'all';
    const [activeCard, setActiveCard] = useState<string>('all');

    // Effective company for data
    const effectiveCompanyId = isPortfolio
        ? (activeCard === 'all' ? undefined : activeCard)
        : selectedCompanyId;

    const campaigns = useMemo(
        () => getCampaigns(effectiveCompanyId),
        [effectiveCompanyId, forceUpdate],
    );

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
            const va = sortKey === 'leads' ? a.metrics.leads : sortKey === 'spend' ? a.metrics.spend : a.metrics.clicks;
            const vb = sortKey === 'leads' ? b.metrics.leads : sortKey === 'spend' ? b.metrics.spend : b.metrics.clicks;
            return sortDir === 'desc' ? vb - va : va - vb;
        });
        return arr;
    }, [filtered, sortKey, sortDir]);

    const handleSort = useCallback((key: 'leads' | 'spend' | 'clicks') => {
        if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortKey(key); setSortDir('desc'); }
    }, [sortKey]);

    /* ---- Max values for inline bars ---- */
    const maxLeads = useMemo(() => Math.max(...sortedFiltered.map(c => c.metrics.leads), 1), [sortedFiltered]);
    const maxSpend = useMemo(() => Math.max(...sortedFiltered.map(c => c.metrics.spend), 1), [sortedFiltered]);

    const detailCampaign = detailId ? campaigns.find(c => c.id === detailId) : null;

    // Channels in current view
    const channelsInView = useMemo(() => {
        const set = new Set(campaigns.map(c => c.channel));
        return Array.from(set);
    }, [campaigns]);

    function handleToggle(id: string) {
        toggleCampaignStatus(id);
        refresh();
    }

    function handleCardSelect(id: string) {
        setActiveCard(id);
        setFilterChannel('all');
        setFilterStatus('BẬT');
    }

    // ---- Selector card data ----
    const selectorCards = useMemo(() => {
        const allCampaigns = getCampaigns();
        const allLeads = allCampaigns.reduce((s, c) => s + c.metrics.leads, 0);
        const allSpend = allCampaigns.reduce((s, c) => s + c.metrics.spend, 0);

        return [
            {
                id: 'all',
                label: 'Tổng công ty',
                color: '#6B6F76',
                initial: '∑',
                leads: allLeads,
                spend: allSpend,
                cpl: allLeads > 0 ? allSpend / allLeads : 0,
                campaigns: allCampaigns.length,
                active: allCampaigns.filter(c => c.status === 'BẬT').length,
            },
            ...COMPANIES.map(co => {
                const stats = getCompanyStats(co.id);
                return {
                    id: co.id,
                    label: co.name,
                    color: co.color,
                    initial: co.shortName.charAt(0),
                    leads: stats.totalLeads,
                    spend: stats.totalSpend,
                    cpl: stats.totalLeads > 0 ? stats.totalSpend / stats.totalLeads : 0,
                    campaigns: stats.total,
                    active: stats.active,
                };
            }),
        ];
    }, [forceUpdate]);

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
                            <th style={{ width: 60 }}>BẬT/TẮT</th>
                            <th>TÊN CHIẾN DỊCH</th>
                            <th>KÊNH</th>
                            {(['leads', 'spend', 'clicks'] as const).map(key => (
                                <th
                                    key={key}
                                    onClick={() => handleSort(key)}
                                    style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', ...(key === 'leads' ? { fontWeight: 700, color: 'var(--primary)' } : {}) }}
                                >
                                    {{ leads: 'LEADS', spend: 'CHI TIÊU', clicks: 'CLICKS' }[key]}
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
                                    <div
                                        onClick={() => handleToggle(c.id)}
                                        style={{
                                            width: 40, height: 22, borderRadius: 11,
                                            background: c.status === 'BẬT' ? 'var(--success)' : 'var(--border)',
                                            cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                                        }}
                                    >
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: 'white',
                                            position: 'absolute', top: 2,
                                            left: c.status === 'BẬT' ? 20 : 2,
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }} />
                                    </div>
                                </td>
                                <td style={{ fontWeight: 500, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</td>
                                <td><span style={{ color: CHANNEL_COLORS[c.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[c.channel] || c.channel}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{c.metrics.leads.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>{c.metrics.spend > 0 ? formatVND(c.metrics.spend) : '—'}</td>
                                <td style={{ textAlign: 'center' }}>{c.metrics.clicks > 0 ? c.metrics.clicks.toLocaleString('vi-VN') : '—'}</td>
                                <td>
                                    <button
                                        onClick={() => setDetailId(c.id)}
                                        aria-label="Xem chi tiết"
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
                                    <span style={{ color: CHANNEL_COLORS[detailCampaign.channel] }}>● {CHANNEL_LABELS[detailCampaign.channel]}</span>
                                    <span style={{ color: STATUS_COLORS[detailCampaign.status] }}>{detailCampaign.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setDetailId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><IconClose size={20} /></button>
                        </div>

                        {detailCampaign.startDate && (
                            <div style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Ngày bắt đầu: {detailCampaign.startDate} {detailCampaign.endDate && `— ${detailCampaign.endDate}`}
                            </div>
                        )}

                        {/* Duration badge */}
                        {detailCampaign.startDate && (() => {
                            const start = new Date(detailCampaign.startDate + 'T00:00:00');
                            const end = detailCampaign.endDate ? new Date(detailCampaign.endDate + 'T00:00:00') : new Date();
                            const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
                            return (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-sm)', color: 'var(--text-muted)', background: 'var(--bg)', padding: '0.25rem 0.6rem', borderRadius: 6, marginBottom: '1rem' }}>
                                    📅 {days} ngày {!detailCampaign.endDate && '(đang chạy)'}
                                </div>
                            );
                        })()}

                        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                            <IconChart size={14} /> Chỉ số
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div className="kpi-card"><h3>Impressions</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{detailCampaign.metrics.impressions.toLocaleString('vi-VN')}</div></div>
                            <div className="kpi-card"><h3>Clicks</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{detailCampaign.metrics.clicks.toLocaleString('vi-VN')}</div></div>
                            <div className="kpi-card"><h3>Leads</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, color: 'var(--primary)' }}>{detailCampaign.metrics.leads.toLocaleString('vi-VN')}</div></div>
                            <div className="kpi-card"><h3>Conversions</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, color: 'var(--success)' }}>{detailCampaign.metrics.conversions.toLocaleString('vi-VN')}</div></div>
                            <div className="kpi-card"><h3><IconDollar size={14} /> Chi tiêu</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{detailCampaign.metrics.spend > 0 ? formatVND(detailCampaign.metrics.spend) : '—'}</div></div>
                            {detailCampaign.metrics.leads > 0 && detailCampaign.metrics.spend > 0 && (
                                <div className="kpi-card"><h3><IconTarget size={14} /> CPL</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{formatVND(detailCampaign.metrics.spend / detailCampaign.metrics.leads)}</div></div>
                            )}
                            {detailCampaign.metrics.impressions > 0 && detailCampaign.metrics.clicks > 0 && (
                                <div className="kpi-card"><h3>CTR</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600 }}>{(detailCampaign.metrics.clicks / detailCampaign.metrics.impressions * 100).toFixed(2)}%</div></div>
                            )}
                            {detailCampaign.metrics.leads > 0 && detailCampaign.metrics.conversions > 0 && (
                                <div className="kpi-card"><h3>Tỷ lệ chuyển đổi</h3><div style={{ fontSize: 'var(--font-lg)', fontWeight: 600, color: 'var(--success)' }}>{(detailCampaign.metrics.conversions / detailCampaign.metrics.leads * 100).toFixed(1)}%</div></div>
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
        addCampaign({ companyId: coId, ...form });
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
