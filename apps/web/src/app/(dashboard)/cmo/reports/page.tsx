'use client';

import { useState, useMemo } from 'react';
import { COMPANIES, CHANNEL_LABELS, CHANNEL_COLORS, formatVND } from '@marketing-hub/shared';
import { getCampaigns, getCompanyStats } from '@/lib/campaigns';
import { useCompany } from '../../layout';
import { IconDownload, IconFilter, IconFile } from '@/app/components/icons';

/* ---- Types ---- */
type TimeRange = '7d' | '30d' | '3m' | '6m';

interface ReportRow {
    id: string;
    channel: string;
    campaignName: string;
    totalLead: number;
    spam: number;
    potential: number;
    quality: number;
    booked: number;
    arrived: number;
    closed: number;
    bill: number;
    budgetActual: number;
}

/* ---- Time multipliers (simulate range-based filtering) ---- */
const RANGE_MULTIPLIER: Record<TimeRange, number> = { '7d': 0.25, '30d': 1, '3m': 2.8, '6m': 5.5 };

/* Previous period multipliers — slightly different to simulate real variance */
const PREV_RANGE_MULTIPLIER: Record<TimeRange, number> = { '7d': 0.23, '30d': 0.92, '3m': 2.5, '6m': 5.0 };

/* Previous period has slightly different conversion rates */
function buildPrevReport(companyId: string, range: TimeRange): ReportRow[] {
    const campaigns = getCampaigns(companyId);
    const m = PREV_RANGE_MULTIPLIER[range];
    return campaigns.map(c => {
        const leads = Math.round(c.metrics.leads * m);
        const spam = Math.floor(leads * 0.13); // slightly worse spam
        const potential = leads - spam;
        const quality = Math.floor(potential * 0.55); // slightly different rates
        const booked = Math.floor(quality * 0.70);
        const arrived = Math.floor(booked * 0.76);
        const closed = Math.floor(arrived * 0.50);
        const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
        const bill = closed * ((seed * 7 % 15_000_000) + 8_000_000);

        return {
            id: c.id,
            channel: c.channel,
            campaignName: c.name,
            totalLead: leads,
            spam,
            potential,
            quality,
            booked,
            arrived,
            closed,
            bill,
            budgetActual: Math.round(c.metrics.spend * m),
        };
    });
}

function rangeLabel(r: TimeRange) {
    return r === '7d' ? '7 ngày' : r === '30d' ? '30 ngày' : r === '3m' ? '3 tháng' : '6 tháng';
}

/* ---- Build report from campaign data ---- */
function buildReport(companyId: string, range: TimeRange): ReportRow[] {
    const campaigns = getCampaigns(companyId);
    const m = RANGE_MULTIPLIER[range];
    return campaigns.map(c => {
        const leads = Math.round(c.metrics.leads * m);
        const spam = Math.floor(leads * 0.12);
        const potential = leads - spam;
        const quality = Math.floor(potential * 0.58);
        const booked = Math.floor(quality * 0.72);
        const arrived = Math.floor(booked * 0.78);
        const closed = Math.floor(arrived * 0.52);
        // Deterministic "random" based on campaign id to avoid SSR hydration mismatch
        const seed = c.id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
        const bill = closed * ((seed * 7 % 15_000_000) + 8_000_000);

        return {
            id: c.id,
            channel: c.channel,
            campaignName: c.name,
            totalLead: leads,
            spam,
            potential,
            quality,
            booked,
            arrived,
            closed,
            bill,
            budgetActual: Math.round(c.metrics.spend * m),
        };
    });
}

/* ---- Funnel Stage Definition ---- */
const FUNNEL_STAGES = [
    { key: 'totalLead', label: 'Lead', color: 'var(--primary)' },
    { key: 'potential', label: 'Tiềm năng', color: '#3B82F6' },
    { key: 'quality', label: 'Chất lượng', color: '#6366F1' },
    { key: 'booked', label: 'Đặt hẹn', color: '#8B5CF6' },
    { key: 'arrived', label: 'Đến PK', color: '#A855F7' },
    { key: 'closed', label: 'Chốt', color: 'var(--success)' },
    { key: 'bill', label: 'Bill', color: '#F59E0B' },
] as const;

/* ---- Aggregate totals ---- */
function companyTotals(rows: ReportRow[]) {
    return {
        totalLead: rows.reduce((s, r) => s + r.totalLead, 0),
        spam: rows.reduce((s, r) => s + r.spam, 0),
        potential: rows.reduce((s, r) => s + r.potential, 0),
        quality: rows.reduce((s, r) => s + r.quality, 0),
        booked: rows.reduce((s, r) => s + r.booked, 0),
        arrived: rows.reduce((s, r) => s + r.arrived, 0),
        closed: rows.reduce((s, r) => s + r.closed, 0),
        bill: rows.reduce((s, r) => s + r.bill, 0),
        budgetActual: rows.reduce((s, r) => s + r.budgetActual, 0),
    };
}

/* ====== Main Component ====== */
export default function ReportPage() {
    const { selectedCompanyId } = useCompany();
    const [activeCompanyId, setActiveCompanyId] = useState<string>(
        selectedCompanyId === 'all' ? 'all' : selectedCompanyId
    );
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [filterChannel, setFilterChannel] = useState('all');

    // Build reports per company for the selected time range
    const allReports = useMemo(() => {
        const map: Record<string, ReportRow[]> = {};
        for (const co of COMPANIES) {
            map[co.id] = buildReport(co.id, timeRange);
        }
        return map;
    }, [timeRange]);

    // Build PREVIOUS period reports for comparison
    const prevReports = useMemo(() => {
        const map: Record<string, ReportRow[]> = {};
        for (const co of COMPANIES) {
            map[co.id] = buildPrevReport(co.id, timeRange);
        }
        return map;
    }, [timeRange]);

    // Aggregated "Tổng công ty" = all companies combined
    const allCompanyRows = useMemo(() => {
        return COMPANIES.flatMap(co => allReports[co.id] || []);
    }, [allReports]);

    // Current rows based on selection
    const currentRows = useMemo(() => {
        let rows = activeCompanyId === 'all' ? allCompanyRows : (allReports[activeCompanyId] || []);
        if (filterChannel !== 'all') rows = rows.filter(r => r.channel === filterChannel);
        return rows;
    }, [allReports, allCompanyRows, activeCompanyId, filterChannel]);

    // Channel list for filter
    const companyChannels = useMemo(() => {
        const base = activeCompanyId === 'all' ? allCompanyRows : (allReports[activeCompanyId] || []);
        const set = new Set<string>();
        base.forEach(r => set.add(r.channel));
        return Array.from(set);
    }, [allReports, allCompanyRows, activeCompanyId]);

    const totals = useMemo(() => companyTotals(currentRows), [currentRows]);

    // Previous period totals for funnel comparison
    const prevAllCompanyRows = useMemo(() => COMPANIES.flatMap(co => prevReports[co.id] || []), [prevReports]);
    const prevCurrentRows = useMemo(() => {
        let rows = activeCompanyId === 'all' ? prevAllCompanyRows : (prevReports[activeCompanyId] || []);
        if (filterChannel !== 'all') rows = rows.filter(r => r.channel === filterChannel);
        return rows;
    }, [prevReports, prevAllCompanyRows, activeCompanyId, filterChannel]);
    const prevTotals = useMemo(() => companyTotals(prevCurrentRows), [prevCurrentRows]);

    // Active company info
    const activeCompanyObj = activeCompanyId === 'all' ? null : COMPANIES.find(c => c.id === activeCompanyId);
    const activeColor = activeCompanyObj?.color || '#6B6F76';
    const activeLabel = activeCompanyObj?.shortName?.toUpperCase() || 'TỔNG CÔNG TY';

    // Build selector cards data
    const selectorCards = useMemo(() => {
        const allTotals = companyTotals(allCompanyRows);
        const allStats = getCampaigns();
        return [
            {
                id: 'all',
                label: 'Tổng công ty',
                shortName: '∑',
                color: '#6B6F76',
                totals: allTotals,
                campaigns: allStats.length,
            },
            ...COMPANIES.map(co => {
                const t = companyTotals(allReports[co.id] || []);
                const stats = getCompanyStats(co.id);
                return {
                    id: co.id,
                    label: co.name,
                    shortName: co.shortName.charAt(0),
                    color: co.color,
                    totals: t,
                    campaigns: stats.total,
                };
            }),
        ];
    }, [allReports, allCompanyRows]);

    return (
        <>
            {/* ═══ Header + Time Toggle (top-right) ═══ */}
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <div>
                    <h1 style={{ fontWeight: 800 }}>Báo cáo</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Báo cáo tổng hợp hiệu quả chiến dịch
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* Time toggle */}
                    <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '0.25rem' }}>
                        {(['7d', '30d', '3m', '6m'] as TimeRange[]).map(opt => (
                            <button
                                key={opt}
                                onClick={() => setTimeRange(opt)}
                                style={{
                                    padding: '0.375rem 0.85rem',
                                    borderRadius: 'var(--radius-xs)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: timeRange === opt ? 600 : 450,
                                    background: timeRange === opt ? 'var(--bg-card)' : 'transparent',
                                    color: timeRange === opt ? 'var(--text)' : 'var(--text-muted)',
                                    boxShadow: timeRange === opt ? 'var(--shadow-sm)' : 'none',
                                    transition: 'all 0.12s ease',
                                }}
                            >
                                {rangeLabel(opt)}
                            </button>
                        ))}
                    </div>
                    <button className="btn btn-outline" style={{ fontSize: '0.8rem' }}>
                        <IconDownload size={14} /> Xuất Excel
                    </button>
                </div>
            </div>

            {/* ═══ 4 Company Selector Cards ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {selectorCards.map(card => {
                    const isActive = activeCompanyId === card.id;
                    const closeRate = card.totals.totalLead > 0 ? (card.totals.closed / card.totals.totalLead * 100) : 0;
                    return (
                        <div
                            key={card.id}
                            onClick={() => { setActiveCompanyId(card.id); setFilterChannel('all'); }}
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
                            {/* Name + badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                <div style={{
                                    width: 26, height: 26, borderRadius: 6,
                                    background: card.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: '0.7rem',
                                }}>{card.shortName}</div>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>{card.label}</span>
                                {isActive && (
                                    <span style={{
                                        fontSize: '0.65rem', fontWeight: 600,
                                        background: card.color, color: 'white',
                                        padding: '0.15rem 0.5rem', borderRadius: 9999,
                                    }}>Đang chọn</span>
                                )}
                            </div>

                            {/* Metrics: 2×2 grid — Lead, Chốt, Tỷ lệ chốt, Doanh thu */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.25rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{card.totals.totalLead.toLocaleString('vi-VN')}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chốt</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--success)' }}>{card.totals.closed.toLocaleString('vi-VN')}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tỷ lệ chốt</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: closeRate >= 20 ? 'var(--success)' : closeRate >= 10 ? 'var(--warning)' : 'var(--danger)' }}>
                                        {closeRate.toFixed(1)}%
                                    </div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chiến dịch</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{card.campaigns}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ═══ Funnel Visualization ═══ */}
            <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconFile size={16} /> Phễu chuyển đổi — {activeLabel}
                </div>

                {/* Stage labels + numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.75rem' }}>
                    {FUNNEL_STAGES.map((stage, i) => {
                        const val = stage.key === 'bill'
                            ? (totals as Record<string, number>)[stage.key] || 0
                            : (totals as Record<string, number>)[stage.key] || 0;
                        const pctTotal = totals.totalLead > 0 ? (val / totals.totalLead * 100) : 0;
                        const prevKey = i > 0 ? FUNNEL_STAGES[i - 1].key : null;
                        const prevVal = prevKey ? (totals as Record<string, number>)[prevKey] || 0 : 0;
                        const pctStep = i === 0 ? 100 : (prevVal > 0 ? (val / prevVal * 100) : 0);

                        return (
                            <div key={stage.key} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.25rem' }}>
                                    {stage.label}
                                </div>
                                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: stage.color, lineHeight: 1.2 }}>
                                    {stage.key === 'bill' ? formatVND(val) : val.toLocaleString('vi-VN')}
                                </div>
                                {/* Percentage labels with period comparison */}
                                <div style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>
                                    {i === 0 ? (
                                        <span style={{ color: 'var(--text-muted)' }}>100%</span>
                                    ) : stage.key === 'bill' ? (
                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    ) : (() => {
                                        // Previous period step rate
                                        const prevStageVal = (prevTotals as Record<string, number>)[stage.key] || 0;
                                        const prevPrevVal = prevKey ? (prevTotals as Record<string, number>)[prevKey] || 0 : 0;
                                        const prevPctStep = prevPrevVal > 0 ? (prevStageVal / prevPrevVal * 100) : 0;
                                        const isImproved = pctStep >= prevPctStep;
                                        return (
                                            <>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: isImproved ? 'var(--success)' : 'var(--danger)',
                                                }}>
                                                    {pctStep.toFixed(1)}%
                                                </span>
                                                <br />
                                                <span style={{ color: 'var(--text-muted)' }}>
                                                    kỳ trước {prevPctStep.toFixed(1)}%
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Gradient bar */}
                <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
                    {FUNNEL_STAGES.map((stage, i) => {
                        const val = (totals as Record<string, number>)[stage.key] || 0;
                        const widthPct = stage.key === 'bill'
                            ? (totals.totalLead > 0 ? (totals.closed / totals.totalLead * 100) : 0)
                            : (totals.totalLead > 0 ? (val / totals.totalLead * 100) : 0);
                        return (
                            <div
                                key={stage.key}
                                style={{
                                    width: `${Math.max(widthPct, 4)}%`,
                                    background: stage.color,
                                    opacity: 1 - i * 0.08,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.65rem', fontWeight: 600, color: 'white',
                                    transition: 'width 0.3s ease',
                                    borderRight: i < FUNNEL_STAGES.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
                                }}
                                title={`${stage.label}: ${stage.key === 'bill' ? formatVND(val) : val.toLocaleString('vi-VN')}`}
                            >
                                {stage.key !== 'bill' && widthPct >= 8 && val.toLocaleString('vi-VN')}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    <span>◆ <strong>X%</strong> = tỷ lệ chuyển đổi so với bước trước</span>
                    <span>◆ <span style={{ color: 'var(--success)' }}>xanh</span> = cao hơn kỳ trước</span>
                    <span>◆ <span style={{ color: 'var(--danger)' }}>đỏ</span> = thấp hơn kỳ trước</span>
                </div>
            </div>



            {/* ═══ Channel Filter ═══ */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <IconFilter size={14} />
                <select
                    className="input"
                    style={{ width: 'auto', minWidth: 160, fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    value={filterChannel}
                    onChange={e => setFilterChannel(e.target.value)}
                >
                    <option value="all">Tất cả kênh</option>
                    {companyChannels.map(ch => (
                        <option key={ch} value={ch}>{CHANNEL_LABELS[ch] || ch}</option>
                    ))}
                </select>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {currentRows.length} chiến dịch
                </span>
            </div>

            {/* ═══ Detail Table ═══ */}
            <div className="card" style={{ overflow: 'auto', padding: 0 }}>
                <table className="table" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-card)' }}>
                            <th style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 3, minWidth: 35 }}>#</th>
                            <th style={{ position: 'sticky', left: 35, background: 'var(--bg-card)', zIndex: 3, minWidth: 90 }}>KÊNH</th>
                            <th style={{ position: 'sticky', left: 125, background: 'var(--bg-card)', zIndex: 3, minWidth: 180, borderRight: '2px solid var(--border)' }}>CHIẾN DỊCH</th>
                            <th style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>TỔNG LEAD</th>
                            <th style={{ textAlign: 'center', color: '#EF4444' }}>SPAM</th>
                            <th style={{ textAlign: 'center' }}>TIỀM NĂNG</th>
                            <th style={{ textAlign: 'center' }}>CHẤT LƯỢNG</th>
                            <th style={{ textAlign: 'center' }}>ĐẶT HẸN</th>
                            <th style={{ textAlign: 'center' }}>ĐẾN PK</th>
                            <th style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>CHỐT</th>
                            <th style={{ textAlign: 'right' }}>BILL</th>
                            <th style={{ textAlign: 'right' }}>NS THỰC TẾ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((row, idx) => (
                            <tr key={row.id + idx}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2, color: 'var(--text-muted)', fontSize: '0.7rem', minWidth: 35 }}>{idx + 1}</td>
                                <td style={{ position: 'sticky', left: 35, background: 'var(--bg-card)', zIndex: 2, minWidth: 90 }}>
                                    <span style={{ color: CHANNEL_COLORS[row.channel] || '#6B7280' }}>●</span>{' '}
                                    {CHANNEL_LABELS[row.channel] || row.channel}
                                </td>
                                <td style={{ position: 'sticky', left: 125, background: 'var(--bg-card)', zIndex: 2, fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 180, borderRight: '2px solid var(--border)' }}>{row.campaignName}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{row.totalLead.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center', color: row.spam > 0 ? '#EF4444' : 'var(--text-muted)' }}>{row.spam.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{row.potential.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{row.quality.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{row.booked.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{row.arrived.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{row.closed.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.bill > 0 ? formatVND(row.bill) : '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{row.budgetActual > 0 ? formatVND(row.budgetActual) : '—'}</td>
                            </tr>
                        ))}

                        {/* Totals */}
                        {currentRows.length > 0 && (
                            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)', background: activeColor + '08' }}>
                                <td style={{ position: 'sticky', left: 0, background: activeColor + '08', zIndex: 2, minWidth: 35 }}></td>
                                <td style={{ position: 'sticky', left: 35, background: activeColor + '08', zIndex: 2, minWidth: 90 }}></td>
                                <td style={{ position: 'sticky', left: 125, background: activeColor + '08', zIndex: 2, fontWeight: 700, minWidth: 180, borderRight: '2px solid var(--border)' }}>TỔNG {activeLabel}</td>
                                <td style={{ textAlign: 'center', color: 'var(--primary)' }}>{totals.totalLead.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center', color: '#EF4444' }}>{totals.spam.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{totals.potential.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{totals.quality.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{totals.booked.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{totals.arrived.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center', color: 'var(--success)' }}>{totals.closed.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'right' }}>{formatVND(totals.bill)}</td>
                                <td style={{ textAlign: 'right' }}>{formatVND(totals.budgetActual)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
