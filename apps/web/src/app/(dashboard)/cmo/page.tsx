'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { COMPANIES, CHANNEL_LABELS, CHANNEL_COLORS, formatVND } from '@marketing-hub/shared';
import { type TimeRange } from '@/lib/daily-metrics';
import { useMarketingData, type DailySeriesPoint } from '@/lib/use-marketing-data';
import { fetchSession } from '@/lib/auth';
import { useCompany } from '../layout';
import { IconTarget, IconDollar, IconChart } from '@/app/components/icons';
import TimeFilterBar from '@/app/components/TimeFilterBar';

/* ---- Company Logos ---- */
const COMPANY_LOGOS: Record<string, string> = {
    san: '/logos/san-dentist.png',
    teennie: '/logos/teennie.webp',
    tgil: '/logos/thegioiimplant.png',
};



/* ====== X-Axis Label Generator ====== */
const WEEKDAY_VN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MONTH_VN = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

interface AxisLabel {
    label: string;
    /** Fractional position 0–1 along the X axis */
    position: number;
}

function getXAxisLabels(series: DailySeriesPoint[], _range: TimeRange): AxisLabel[] {
    if (series.length === 0) return [];
    const len = series.length;
    // Monthly data — use the month label directly (e.g. T1/2025)
    return series.map((d, i) => ({
        label: d.date, // Already "T1/2025" format from hook
        position: len === 1 ? 0.5 : i / (len - 1),
    }));
}

/* ====== Sparkline SVG with X-Axis + Tooltip ====== */
function Sparkline({
    data,
    labels,
    dates,
    width = 360,
    height = 80,
    color = '#C47035',
    fillOpacity = 0.18,
    formatValue,
}: {
    data: number[];
    labels: AxisLabel[];
    dates?: string[];
    width?: number;
    height?: number;
    color?: string;
    fillOpacity?: number;
    formatValue?: (v: number) => string;
}) {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const padX = 4;
    const padTop = 14; // extra space for tooltip
    const axisHeight = 18;
    const chartH = height - padTop - axisHeight;
    const chartW = width - padX * 2;

    const points = data.map((v, i) => {
        const x = padX + (i / (data.length - 1)) * chartW;
        const y = padTop + chartH - ((v - min) / range) * chartH;
        return { x, y, value: v };
    });

    const linePath = `M${points.map(p => `${p.x},${p.y}`).join(' L')}`;
    const fillPath = `${linePath} L${padX + chartW},${padTop + chartH} L${padX},${padTop + chartH} Z`;
    const gradId = `grad-${color.replace('#', '')}-${width}`;

    const fmtVal = formatValue || ((v: number) => v.toLocaleString('vi-VN'));

    return (
        <svg
            width="100%"
            height={height + 12}
            viewBox={`0 0 ${width} ${height + 12}`}
            preserveAspectRatio="none"
            style={{ display: 'block', overflow: 'visible' }}
            onMouseLeave={() => setHoverIdx(null)}
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={fillOpacity * 2.5} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>
            <path d={fillPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

            {/* Hit-area circles + hover dot */}
            {points.map((p, i) => (
                <g key={i}>
                    <circle
                        cx={p.x} cy={p.y} r={10}
                        fill="transparent"
                        onMouseEnter={() => setHoverIdx(i)}
                        style={{ cursor: 'crosshair' }}
                    />
                    {hoverIdx === i && (
                        <>
                            <circle cx={p.x} cy={p.y} r={4} fill="white" stroke={color} strokeWidth={2} />
                            <line x1={p.x} y1={padTop} x2={p.x} y2={padTop + chartH} stroke={color} strokeWidth={0.5} strokeDasharray="3 2" opacity={0.4} />
                        </>
                    )}
                </g>
            ))}

            {/* Tooltip */}
            {hoverIdx !== null && (() => {
                const p = points[hoverIdx];
                const dateStr = dates?.[hoverIdx]
                    ? (() => { const d = new Date(dates[hoverIdx] + 'T00:00:00'); return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`; })()
                    : '';
                const label = `${fmtVal(p.value)}${dateStr ? ` · ${dateStr}` : ''}`;
                return (
                    <g>
                        <rect x={p.x - 42} y={p.y - 26} width={84} height={20} rx={4} fill="var(--text, #1F2937)" opacity={0.9} />
                        <text x={p.x} y={p.y - 13} textAnchor="middle" fill="white" fontSize={9} fontWeight={600} fontFamily="inherit">
                            {label}
                        </text>
                    </g>
                );
            })()}

            {/* X-axis labels */}
            {labels.map((l, i) => (
                <text
                    key={i}
                    x={padX + l.position * chartW}
                    y={height - 2}
                    textAnchor="middle"
                    fill="var(--text-muted, #9CA3AF)"
                    fontSize={10}
                    fontFamily="inherit"
                >{l.label}</text>
            ))}
        </svg>
    );
}

/* ====== Trend Badge ====== */
function TrendBadge({ value, suffix }: { value: number; suffix?: string }) {
    if (value === 0) return null;
    const isUp = value > 0;
    const color = isUp ? 'var(--success)' : 'var(--danger)';
    return (
        <span style={{ color, fontSize: 'var(--font-base)', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
            <span>{isUp ? '↑' : '↓'}</span>
            {isUp ? '+' : ''}{value.toFixed(1)}%{suffix ? ` ${suffix}` : ''}
        </span>
    );
}

/* ====== Chart Card — Side by Side 35/65 ====== */
function ChartCard({
    title,
    icon,
    value,
    delta,
    data,
    labels,
    dates,
    color,
    periodLabel,
    formatValue,
}: {
    title: string;
    icon: React.ReactNode;
    value: string;
    delta: number;
    data: number[];
    labels: AxisLabel[];
    dates?: string[];
    color: string;
    periodLabel: string;
    formatValue?: (v: number) => string;
}) {
    return (
        <div className="card" style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'stretch',
            minHeight: 100,
        }}>
            {/* Left: value + trend (35%) */}
            <div style={{
                flex: '0 0 35%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    color: 'var(--text-muted)',
                    fontSize: 'var(--font-sm)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.35rem',
                }}>
                    {icon}
                    {title}
                </div>
                <div style={{ fontSize: 'var(--font-2xl)', fontWeight: 700, lineHeight: 1.15, marginBottom: '0.3rem' }}>
                    {value}
                </div>
                <TrendBadge value={delta} suffix={`vs ${periodLabel} trước`} />
            </div>

            {/* Right: chart (65%) */}
            <div style={{
                flex: '1 1 65%',
                display: 'flex',
                alignItems: 'center',
                minWidth: 0,
            }}>
                <Sparkline data={data} labels={labels} dates={dates} width={360} height={80} color={color} formatValue={formatValue} />
            </div>
        </div>
    );
}

/* ====== Main Page ====== */
export default function CMODashboard() {
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const { selectedCompanyId } = useCompany();
    const [timeRange, setTimeRange] = useState<TimeRange>('this_month');
    const [activeCard, setActiveCard] = useState<string>('all');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    // Fetch user session
    useEffect(() => {
        fetchSession().then(s => { if (s) setUser(s); });
    }, []);

    const { loading, selectorCards, dailySeries, channelBreakdown, totals, delta } = useMarketingData(timeRange, activeCard, customStart, customEnd);
    const periodLabel = timeRange === 'custom' ? `${customStart} — ${customEnd}` : (timeRange === 'this_month' ? 'Tháng này' : timeRange === 'last_month' ? 'Tháng trước' : '3 tháng');


    const xAxisLabels = useMemo(() => getXAxisLabels(dailySeries, timeRange), [dailySeries, timeRange]);
    const avgCPL = totals.spend > 0 && totals.leads > 0 ? totals.spend / totals.leads : 0;

    const channelTotals = useMemo(() => ({
        leads: channelBreakdown.reduce((s, c) => s + c.leads, 0),
        conversions: channelBreakdown.reduce((s, c) => s + c.conversions, 0),
        spend: channelBreakdown.reduce((s, c) => s + c.spend, 0),
    }), [channelBreakdown]);

    const activeLabel = activeCard === 'all'
        ? 'Tất cả công ty'
        : COMPANIES.find(c => c.id === activeCard)?.name || '';

    /* ---- Table sort state ---- */
    const [sortKey, setSortKey] = useState<'leads' | 'conversions' | 'spend' | 'cpl'>('leads');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const sortedChannels = useMemo(() => {
        return [...channelBreakdown].sort((a, b) => {
            let va: number, vb: number;
            if (sortKey === 'cpl') {
                va = a.spend > 0 && a.leads > 0 ? a.spend / a.leads : 0;
                vb = b.spend > 0 && b.leads > 0 ? b.spend / b.leads : 0;
            } else {
                va = a[sortKey];
                vb = b[sortKey];
            }
            return sortDir === 'desc' ? vb - va : va - vb;
        });
    }, [channelBreakdown, sortKey, sortDir]);

    const handleSort = useCallback((key: 'leads' | 'conversions' | 'spend' | 'cpl') => {
        if (sortKey === key) {
            setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    }, [sortKey]);

    const maxLeads = useMemo(() => Math.max(...channelBreakdown.map(c => c.leads), 1), [channelBreakdown]);
    const maxConversions = useMemo(() => Math.max(...channelBreakdown.map(c => c.conversions), 1), [channelBreakdown]);

    return (
        <>
            {/* ═══ Header + Time Pills ═══ */}
            <div className="page-header">
                <div>
                    <h1 style={{ fontWeight: 800 }}>Tổng quan</h1>
                    {user && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-md)', marginTop: '0.25rem' }}>
                        {user.name} — {activeLabel}
                    </p>}
                </div>
                <TimeFilterBar
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomDateChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
                />
            </div>

            {/* ═══ 4 Unified Selector Cards ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {selectorCards.map(card => {
                    const isActive = activeCard === card.id;
                    const cpl = card.metrics.spend > 0 && card.metrics.leads > 0
                        ? card.metrics.spend / card.metrics.leads : 0;

                    return (
                        <div
                            key={card.id}
                            onClick={() => setActiveCard(card.id)}
                            className="card"
                            style={{
                                cursor: 'pointer',
                                borderTop: `3px solid ${card.color}`,
                                outline: isActive ? `2px solid ${card.color}` : 'none',
                                outlineOffset: -1,
                                opacity: isActive ? 1 : 0.55,
                                boxShadow: isActive ? 'var(--shadow)' : 'none',
                                transition: 'opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
                                padding: '0.875rem 1rem',
                            }}
                            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; } }}
                            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; } }}
                        >
                            {/* Name + badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                {COMPANY_LOGOS[card.id] ? (
                                    <img
                                        src={COMPANY_LOGOS[card.id]}
                                        alt={card.label}
                                        style={{
                                            width: 26, height: 26, borderRadius: 6,
                                            objectFit: 'contain',
                                            background: 'white',
                                            border: '1px solid var(--border)',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 26, height: 26, borderRadius: 6,
                                        background: card.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: 'var(--font-sm)',
                                    }}>{card.initial}</div>
                                )}
                                <span style={{ fontWeight: 600, fontSize: 'var(--font-md)', flex: 1 }}>{card.label}</span>
                                {isActive && (
                                    <span style={{
                                        fontSize: 'var(--font-xs)', fontWeight: 600,
                                        background: card.color, color: 'white',
                                        padding: '0.15rem 0.5rem', borderRadius: 9999,
                                    }}>Đang chọn</span>
                                )}
                            </div>

                            {/* Metrics: 2x2 grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 0.25rem' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Leads</div>
                                    <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{card.metrics.leads.toLocaleString('vi-VN')}</div>
                                    <TrendBadge value={card.delta.leads} />
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Chi tiêu</div>
                                    <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{formatVND(card.metrics.spend)}</div>
                                    <TrendBadge value={card.delta.spend} />
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-sm)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CPL</div>
                                    <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{cpl > 0 ? formatVND(cpl) : '—'}</div>
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

            {/* ═══ Sparkline Chart Row — Side-by-Side Layout ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <ChartCard
                    title="Tổng Leads"
                    icon={<IconTarget size={12} />}
                    value={totals.leads.toLocaleString('vi-VN')}
                    delta={delta.leads}
                    data={dailySeries.map(d => d.leads)}
                    labels={xAxisLabels}
                    dates={dailySeries.map(d => d.date)}
                    color="#C47035"
                    periodLabel={periodLabel}
                />
                <ChartCard
                    title="Tổng chi tiêu"
                    icon={<IconDollar size={12} />}
                    value={formatVND(totals.spend)}
                    delta={delta.spend}
                    data={dailySeries.map(d => d.spend)}
                    labels={xAxisLabels}
                    dates={dailySeries.map(d => d.date)}
                    color="#3B82F6"
                    periodLabel={periodLabel}
                    formatValue={formatVND}
                />
                <ChartCard
                    title="CPL trung bình"
                    icon={<IconChart size={12} />}
                    value={avgCPL > 0 ? formatVND(avgCPL) : '—'}
                    delta={delta.leads !== 0 ? -(delta.leads) * 0.4 : 0}
                    data={dailySeries.map(d => d.spend > 0 && d.leads > 0 ? d.spend / d.leads : 0)}
                    labels={xAxisLabels}
                    dates={dailySeries.map(d => d.date)}
                    color="#8B5CF6"
                    periodLabel={periodLabel}
                    formatValue={formatVND}
                />
            </div>

            {/* ═══ Mini Channel Bar Chart ═══ */}
            {(() => {
                const top5 = [...channelBreakdown].sort((a, b) => b.leads - a.leads).slice(0, 5);
                const barMax = Math.max(...top5.map(c => c.leads), 1);
                return (
                    <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>Top kênh theo leads</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {top5.map(ch => (
                                <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: 80, fontSize: 'var(--font-sm)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
                                        <span style={{ color: CHANNEL_COLORS[ch.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[ch.channel] || ch.channel}
                                    </span>
                                    <div style={{ flex: 1, height: 14, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(ch.leads / barMax) * 100}%`,
                                            height: '100%',
                                            background: CHANNEL_COLORS[ch.channel] || '#6B7280',
                                            opacity: 0.6,
                                            borderRadius: 4,
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600, width: 40, textAlign: 'right', flexShrink: 0 }}>{ch.leads}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* ═══ Channel Performance Table ═══ */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600, marginBottom: '1rem' }}>
                    <IconChart size={18} /> Hiệu suất theo kênh
                    <span style={{ fontWeight: 400, fontSize: 'var(--font-base)', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        ({periodLabel} gần nhất — {activeLabel})
                    </span>
                </h2>
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Kênh</th>
                                {(['leads', 'conversions', 'spend', 'cpl'] as const).map(key => (
                                    <th
                                        key={key}
                                        onClick={() => handleSort(key)}
                                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                                    >
                                        {{ leads: 'Leads', conversions: 'Conversions', spend: 'Chi tiêu', cpl: 'CPL' }[key]}
                                        {sortKey === key && <span style={{ marginLeft: 4, fontSize: 'var(--font-sm)' }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedChannels.map((ch, idx) => (
                                <tr
                                    key={ch.channel}
                                    style={{
                                        transition: 'background 0.12s ease',
                                        animation: `fadeIn 0.2s ease ${idx * 0.02}s both`,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.03))'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                                >
                                    <td style={{ fontWeight: 500 }}>
                                        <span style={{ color: CHANNEL_COLORS[ch.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[ch.channel] || ch.channel}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ minWidth: 32 }}>{ch.leads.toLocaleString('vi-VN')}</span>
                                            <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', maxWidth: 60 }}>
                                                <div style={{ width: `${(ch.leads / maxLeads) * 100}%`, height: '100%', background: '#C47035', opacity: 0.5, borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ minWidth: 32 }}>{ch.conversions.toLocaleString('vi-VN')}</span>
                                            <div style={{ flex: 1, height: 5, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden', maxWidth: 60 }}>
                                                <div style={{ width: `${(ch.conversions / maxConversions) * 100}%`, height: '100%', background: 'var(--success)', opacity: 0.5, borderRadius: 3 }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td>{ch.spend > 0 ? formatVND(ch.spend) : '—'}</td>
                                    <td style={{ fontWeight: 600 }}>
                                        {ch.spend > 0 && ch.leads > 0 ? formatVND(ch.spend / ch.leads) : '—'}
                                    </td>
                                </tr>
                            ))}
                            {sortedChannels.length > 1 && (
                                <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                                    <td>Tổng</td>
                                    <td>{channelTotals.leads.toLocaleString('vi-VN')}</td>
                                    <td>{channelTotals.conversions.toLocaleString('vi-VN')}</td>
                                    <td>{formatVND(channelTotals.spend)}</td>
                                    <td>{channelTotals.spend > 0 && channelTotals.leads > 0 ? formatVND(channelTotals.spend / channelTotals.leads) : '—'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* fadeIn animation */}
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }`}</style>
        </>
    );
}
