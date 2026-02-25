'use client';

import { useState } from 'react';
import { CHANNEL_LABELS, CHANNEL_COLORS, formatVND } from '@marketing-hub/shared';
import type { ChannelType } from '@marketing-hub/shared';
import { IconCheck, IconAlertTriangle, IconTrendUp, IconChart } from '@/app/components/icons';

/* ---- Data ---- */
interface ChannelMetrics {
    channel: ChannelType;
    spend: number;
    leads: number;
    cpl: number;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
    roas: number;
    campaigns: number;
}

type TimeRange = '7d' | '30d' | '90d';

const DATA: Record<TimeRange, ChannelMetrics[]> = {
    '7d': [
        { channel: 'FACEBOOK', spend: 42_000_000, leads: 230, cpl: 182_608, impressions: 185_000, clicks: 12_400, ctr: 6.7, conversions: 45, roas: 3.4, campaigns: 5 },
        { channel: 'TIKTOK', spend: 28_000_000, leads: 142, cpl: 197_183, impressions: 320_000, clicks: 18_200, ctr: 5.7, conversions: 28, roas: 2.9, campaigns: 3 },
        { channel: 'ZALO', spend: 15_000_000, leads: 68, cpl: 220_588, impressions: 95_000, clicks: 5_800, ctr: 6.1, conversions: 12, roas: 2.1, campaigns: 2 },
    ],
    '30d': [
        { channel: 'FACEBOOK', spend: 125_400_000, leads: 680, cpl: 184_411, impressions: 720_000, clicks: 48_200, ctr: 6.7, conversions: 134, roas: 3.2, campaigns: 8 },
        { channel: 'TIKTOK', spend: 78_200_000, leads: 390, cpl: 200_513, impressions: 1_200_000, clicks: 68_400, ctr: 5.7, conversions: 78, roas: 2.8, campaigns: 4 },
        { channel: 'ZALO', spend: 42_200_000, leads: 177, cpl: 238_418, impressions: 310_000, clicks: 18_600, ctr: 6.0, conversions: 35, roas: 2.1, campaigns: 3 },
    ],
    '90d': [
        { channel: 'FACEBOOK', spend: 380_000_000, leads: 2050, cpl: 185_365, impressions: 2_100_000, clicks: 142_800, ctr: 6.8, conversions: 410, roas: 3.3, campaigns: 12 },
        { channel: 'TIKTOK', spend: 235_000_000, leads: 1180, cpl: 199_152, impressions: 3_600_000, clicks: 201_600, ctr: 5.6, conversions: 236, roas: 2.7, campaigns: 5 },
        { channel: 'ZALO', spend: 128_000_000, leads: 540, cpl: 237_037, impressions: 920_000, clicks: 55_200, ctr: 6.0, conversions: 108, roas: 2.0, campaigns: 4 },
    ],
};

/* Trend data for sparklines */
const DAILY_LEADS: Record<TimeRange, Record<ChannelType, number[]>> = {
    '7d': {
        FACEBOOK: [28, 35, 32, 38, 30, 34, 33],
        TIKTOK: [18, 22, 20, 19, 21, 23, 19],
        ZALO: [8, 10, 12, 9, 11, 8, 10],
    },
    '30d': {
        FACEBOOK: [20, 22, 25, 23, 28, 24, 20, 26, 30, 22, 18, 25, 27, 23, 20, 24, 28, 22, 25, 23, 27, 24, 22, 20, 26, 28, 25, 23, 22, 24],
        TIKTOK: [10, 12, 14, 11, 15, 13, 12, 14, 16, 11, 10, 13, 15, 12, 11, 14, 15, 13, 12, 14, 13, 11, 15, 13, 12, 14, 13, 12, 11, 13],
        ZALO: [5, 6, 7, 5, 8, 6, 5, 7, 8, 5, 4, 6, 7, 5, 5, 6, 7, 6, 5, 7, 6, 5, 7, 6, 5, 6, 7, 5, 6, 6],
    },
    '90d': {
        FACEBOOK: [20, 22, 25, 23, 28, 24, 20, 26, 30, 22, 18, 25, 27, 23, 20, 24, 28, 22, 25, 23, 27, 24, 22, 20, 26, 28, 25, 23, 22, 24, 20, 22, 25, 23, 28, 24, 20, 26, 30, 22, 18, 25, 27, 23, 20, 24, 28, 22, 25, 23, 27, 24, 22, 20, 26, 28, 25, 23, 22, 24, 20, 22, 25, 23, 28, 24, 20, 26, 30, 22, 18, 25, 27, 23, 20, 24, 28, 22, 25, 23, 27, 24, 22, 20, 26, 28, 25, 23, 22, 24],
        TIKTOK: [10, 12, 14, 11, 15, 13, 12, 14, 16, 11, 10, 13, 15, 12, 11, 14, 15, 13, 12, 14, 13, 11, 15, 13, 12, 14, 13, 12, 11, 13, 10, 12, 14, 11, 15, 13, 12, 14, 16, 11, 10, 13, 15, 12, 11, 14, 15, 13, 12, 14, 13, 11, 15, 13, 12, 14, 13, 12, 11, 13, 10, 12, 14, 11, 15, 13, 12, 14, 16, 11, 10, 13, 15, 12, 11, 14, 15, 13, 12, 14, 13, 11, 15, 13, 12, 14, 13, 12, 11, 13],
        ZALO: [5, 6, 7, 5, 8, 6, 5, 7, 8, 5, 4, 6, 7, 5, 5, 6, 7, 6, 5, 7, 6, 5, 7, 6, 5, 6, 7, 5, 6, 6, 5, 6, 7, 5, 8, 6, 5, 7, 8, 5, 4, 6, 7, 5, 5, 6, 7, 6, 5, 7, 6, 5, 7, 6, 5, 6, 7, 5, 6, 6, 5, 6, 7, 5, 8, 6, 5, 7, 8, 5, 4, 6, 7, 5, 5, 6, 7, 6, 5, 7, 6, 5, 7, 6, 5, 6, 7, 5, 6, 6],
    },
};

/* SVG Mini Bar Chart */
function MiniBarChart({ data, color, height = 60, width = 200 }: { data: number[]; color: string; height?: number; width?: number }) {
    const max = Math.max(...data);
    const barW = Math.max(1, (width - data.length) / data.length);
    const gap = 1;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: 'block' }}>
            {data.map((v, i) => {
                const h = max > 0 ? (v / max) * (height - 4) : 0;
                return (
                    <rect
                        key={i}
                        x={i * (barW + gap)}
                        y={height - h - 2}
                        width={barW}
                        height={h}
                        rx={1}
                        fill={color}
                        opacity={0.7}
                    />
                );
            })}
        </svg>
    );
}

/* Horizontal Bar (for spend distribution) */
function SpendBar({ data }: { data: ChannelMetrics[] }) {
    const total = data.reduce((s, d) => s + d.spend, 0);
    return (
        <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem' }}>
            {data.map(d => (
                <div
                    key={d.channel}
                    style={{
                        width: `${(d.spend / total) * 100}%`,
                        background: CHANNEL_COLORS[d.channel],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 600, color: 'white',
                        minWidth: 40,
                        transition: 'width 0.3s',
                    }}
                    title={`${CHANNEL_LABELS[d.channel]}: ${formatVND(d.spend)} (${Math.round((d.spend / total) * 100)}%)`}
                >
                    {Math.round((d.spend / total) * 100)}%
                </div>
            ))}
        </div>
    );
}

/* SVG Donut Chart */
function DonutChart({ data, metric, label }: { data: ChannelMetrics[]; metric: keyof ChannelMetrics; label: string }) {
    const total = data.reduce((s, d) => s + (d[metric] as number), 0);
    let cumulative = 0;
    const r = 40;
    const cx = 55;
    const cy = 55;
    const circumference = 2 * Math.PI * r;

    return (
        <div style={{ textAlign: 'center' }}>
            <svg viewBox="0 0 110 110" width={110} height={110}>
                {data.map(d => {
                    const value = d[metric] as number;
                    const pct = total > 0 ? value / total : 0;
                    const dashLength = pct * circumference;
                    const dashOffset = -(cumulative / total) * circumference;
                    cumulative += value;
                    return (
                        <circle
                            key={d.channel}
                            cx={cx} cy={cy} r={r}
                            fill="none"
                            stroke={CHANNEL_COLORS[d.channel]}
                            strokeWidth={14}
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={dashOffset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    );
                })}
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)">{total.toLocaleString('vi-VN')}</text>
                <text x={cx} y={cy + 12} textAnchor="middle" fontSize="8" fill="var(--text-muted)">{label}</text>
            </svg>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.7rem' }}>
                {data.map(d => (
                    <span key={d.channel} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLORS[d.channel], display: 'inline-block' }} />
                        {Math.round(((d[metric] as number) / total) * 100)}%
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function ComparisonPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const data = DATA[timeRange];
    const totalSpend = data.reduce((s, d) => s + d.spend, 0);
    const totalLeads = data.reduce((s, d) => s + d.leads, 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const bestChannel = [...data].sort((a, b) => a.cpl - b.cpl)[0];

    return (
        <>
            <div className="page-header">
                <h1>So sánh kênh</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['7d', '30d', '90d'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            className={`btn ${timeRange === range ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTimeRange(range)}
                            style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem' }}
                        >
                            {range === '7d' ? '7 ngày' : range === '30d' ? '30 ngày' : '90 ngày'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-card">
                    <h3>Tổng chi tiêu</h3>
                    <div className="value">{formatVND(totalSpend)}</div>
                    <SpendBar data={data} />
                </div>
                <div className="kpi-card">
                    <h3>Tổng Leads</h3>
                    <div className="value">{totalLeads.toLocaleString('vi-VN')}</div>
                    <div className="trend trend-up">Tốt nhất: {CHANNEL_LABELS[bestChannel.channel]}</div>
                </div>
                <div className="kpi-card">
                    <h3>CPL trung bình</h3>
                    <div className="value">{formatVND(avgCPL)}</div>
                    <div className="trend" style={{ color: avgCPL < 200_000 ? 'var(--success)' : 'var(--warning)' }}>
                        {avgCPL < 200_000 ? <><IconCheck size={14} /> Dưới target</> : <><IconAlertTriangle size={14} /> Trên target</>}
                    </div>
                </div>
                <div className="kpi-card">
                    <h3>Best ROAS</h3>
                    <div className="value">{Math.max(...data.map(d => d.roas)).toFixed(1)}x</div>
                    <div className="trend trend-up">{CHANNEL_LABELS[[...data].sort((a, b) => b.roas - a.roas)[0].channel]}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>Phân bổ Leads</h3>
                    <DonutChart data={data} metric="leads" label="Leads" />
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>Phân bổ Conversions</h3>
                    <DonutChart data={data} metric="conversions" label="Conversions" />
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>Phân bổ Chi tiêu</h3>
                    <DonutChart data={data} metric="spend" label="VND" />
                </div>
            </div>

            {/* Sparkline Trends */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}><IconTrendUp size={18} /> Xu hướng Leads theo ngày</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    {data.map(d => (
                        <div className="card" key={d.channel}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    <span style={{ color: CHANNEL_COLORS[d.channel] }}>●</span> {CHANNEL_LABELS[d.channel]}
                                </h3>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{d.leads} leads</span>
                            </div>
                            <MiniBarChart data={DAILY_LEADS[timeRange][d.channel]} color={CHANNEL_COLORS[d.channel]} width={300} height={50} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Comparison Table */}
            <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}><IconChart size={18} /> So sánh chi tiết</h2>
                <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                    <table className="table" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-card)' }}>
                                <th>KÊNH</th>
                                <th style={{ textAlign: 'right' }}>CHI TIÊU</th>
                                <th style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>LEADS</th>
                                <th style={{ textAlign: 'right' }}>CPL</th>
                                <th style={{ textAlign: 'right' }}>IMPRESSIONS</th>
                                <th style={{ textAlign: 'right' }}>CLICKS</th>
                                <th style={{ textAlign: 'center' }}>CTR</th>
                                <th style={{ textAlign: 'center' }}>CONV.</th>
                                <th style={{ textAlign: 'center' }}>ROAS</th>
                                <th style={{ textAlign: 'center' }}>CAMPAIGNS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(d => (
                                <tr key={d.channel}>
                                    <td style={{ fontWeight: 500 }}><span style={{ color: CHANNEL_COLORS[d.channel] }}>●</span> {CHANNEL_LABELS[d.channel]}</td>
                                    <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{formatVND(d.spend)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{d.leads.toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ color: d.cpl < 200_000 ? 'var(--success)' : d.cpl < 230_000 ? 'var(--warning)' : 'var(--danger)' }}>
                                            {formatVND(d.cpl)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>{d.impressions.toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'right' }}>{d.clicks.toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'center' }}>{d.ctr}%</td>
                                    <td style={{ textAlign: 'center' }}>{d.conversions}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: d.roas >= 3 ? 'var(--success)' : d.roas >= 2.5 ? 'var(--warning)' : 'var(--danger)' }}>
                                        {d.roas}x
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{d.campaigns}</td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 600, borderTop: '2px solid var(--border)', background: 'var(--bg-hover, rgba(0,0,0,0.02))' }}>
                                <td>Tổng</td>
                                <td style={{ textAlign: 'right', fontSize: '0.75rem' }}>{formatVND(totalSpend)}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{totalLeads.toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'right' }}>{formatVND(avgCPL)}</td>
                                <td style={{ textAlign: 'right' }}>{data.reduce((s, d) => s + d.impressions, 0).toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'right' }}>{data.reduce((s, d) => s + d.clicks, 0).toLocaleString('vi-VN')}</td>
                                <td style={{ textAlign: 'center' }}>{(data.reduce((s, d) => s + d.clicks, 0) / data.reduce((s, d) => s + d.impressions, 0) * 100).toFixed(1)}%</td>
                                <td style={{ textAlign: 'center' }}>{data.reduce((s, d) => s + d.conversions, 0)}</td>
                                <td style={{ textAlign: 'center' }}>—</td>
                                <td style={{ textAlign: 'center' }}>{data.reduce((s, d) => s + d.campaigns, 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
