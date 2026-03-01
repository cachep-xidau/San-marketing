'use client';

import { useState, useMemo, useEffect } from 'react';
import { CHANNEL_LABELS, CHANNEL_COLORS, formatVND } from '@marketing-hub/shared';
import { type TimeRange } from '@/lib/daily-metrics';
import { IconCheck, IconAlertTriangle, IconTrendUp, IconChart } from '@/app/components/icons';
import TimeFilterBar from '@/app/components/TimeFilterBar';
import { getMonthRange } from '@/lib/marketing-date-range';
import { numOrZero } from '@/lib/marketing-data-helpers';
import { fetchChannels, fetchCampaigns, fetchTrend, type APIChannel, type APICampaign, type APIDaily } from '@/lib/marketing-api-client';

/* ---- Types ---- */
interface ChannelMetrics {
    channel: string;
    spend: number;
    leads: number;
    cpl: number;
    quality: number;
    campaigns: number;
}

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
    if (total === 0) return null;
    return (
        <div style={{ display: 'flex', height: 28, borderRadius: 8, overflow: 'hidden', marginBottom: '0.75rem' }}>
            {data.filter(d => d.spend > 0).map(d => (
                <div
                    key={d.channel}
                    style={{
                        width: `${(d.spend / total) * 100}%`,
                        background: CHANNEL_COLORS[d.channel] || '#6B7280',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 'var(--font-sm)', fontWeight: 600, color: 'white',
                        minWidth: 40,
                        transition: 'width 0.3s',
                    }}
                    title={`${CHANNEL_LABELS[d.channel] || d.channel}: ${formatVND(d.spend)} (${Math.round((d.spend / total) * 100)}%)`}
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
    if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Không có dữ liệu</div>;
    let cumulative = 0;
    const r = 40;
    const cx = 55;
    const cy = 55;
    const circumference = 2 * Math.PI * r;

    return (
        <div style={{ textAlign: 'center' }}>
            <svg viewBox="0 0 110 110" width={110} height={110}>
                {data.filter(d => (d[metric] as number) > 0).map(d => {
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
                            stroke={CHANNEL_COLORS[d.channel] || '#6B7280'}
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
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: 'var(--font-sm)', flexWrap: 'wrap' }}>
                {data.filter(d => (d[metric] as number) > 0).map(d => (
                    <span key={d.channel} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: CHANNEL_COLORS[d.channel] || '#6B7280', display: 'inline-block' }} />
                        {CHANNEL_LABELS[d.channel] || d.channel} {Math.round(((d[metric] as number) / total) * 100)}%
                    </span>
                ))}
            </div>
        </div>
    );
}

/* Data fetching for comparison page */
async function fetchComparisonData(start: string, end: string) {
    const [channelsData, campaignsData, trendData] = await Promise.allSettled([
        fetchChannels(start, end),
        fetchCampaigns(start, end),
        fetchTrend(start, end),
    ]);

    return {
        channels: channelsData.status === 'fulfilled' ? channelsData.value : [],
        campaigns: campaignsData.status === 'fulfilled' ? campaignsData.value : [],
        daily: trendData.status === 'fulfilled' ? trendData.value : [],
    };
}

export default function ComparisonPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('3m');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const { start, end } = getMonthRange(timeRange, customStart, customEnd);

    // Real data from split APIs
    const [channels, setChannels] = useState<APIChannel[]>([]);
    const [campaigns, setCampaigns] = useState<APICampaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchComparisonData(start, end)
            .then(data => {
                setChannels(data.channels);
                setCampaigns(data.campaigns);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [start, end]);

    // Build channel metrics from real API data
    const data = useMemo<ChannelMetrics[]>(() => {
        if (!channels || channels.length === 0) return [];

        // Aggregate by channel (across all companies)
        const byChannel = new Map<string, { leads: number; spend: number; quality: number }>();
        for (const ch of channels) {
            const key = ch.channel;
            const existing = byChannel.get(key) || { leads: 0, spend: 0, quality: 0 };
            existing.leads += numOrZero(ch._sum.totalLead);
            existing.spend += numOrZero(ch._sum.budgetActual);
            existing.quality += numOrZero(ch._sum.quality);
            byChannel.set(key, existing);
        }

        // Count unique campaigns per channel
        const campaignsByChannel = new Map<string, Set<string>>();
        if (campaigns && campaigns.length > 0) {
            for (const c of campaigns) {
                const set = campaignsByChannel.get(c.channel) || new Set();
                set.add(c.campaignName);
                campaignsByChannel.set(c.channel, set);
            }
        }

        return Array.from(byChannel.entries())
            .map(([channel, v]) => ({
                channel,
                leads: v.leads,
                spend: v.spend,
                cpl: v.leads > 0 ? v.spend / v.leads : 0,
                quality: v.quality,
                campaigns: campaignsByChannel.get(channel)?.size || 0,
            }))
            .sort((a, b) => b.leads - a.leads);
    }, [channels, campaigns]);

    // Daily leads by channel for sparklines (placeholder - needs per-channel daily data)
    const dailyByChannel = useMemo<Record<string, number[]>>(() => {
        return {};
    }, []);

    const totalSpend = data.reduce((s, d) => s + d.spend, 0);
    const totalLeads = data.reduce((s, d) => s + d.leads, 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const bestChannel = data.length > 0 ? [...data].sort((a, b) => (a.cpl > 0 ? a.cpl : Infinity) - (b.cpl > 0 ? b.cpl : Infinity))[0] : null;

    return (
        <>
            <div className="page-header">
                <h1>So sánh kênh</h1>
                <TimeFilterBar
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomDateChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
                />
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
                    {bestChannel && <div className="trend trend-up">CPL thấp nhất: {CHANNEL_LABELS[bestChannel.channel] || bestChannel.channel}</div>}
                </div>
                <div className="kpi-card">
                    <h3>CPL trung bình</h3>
                    <div className="value">{avgCPL > 0 ? formatVND(avgCPL) : '—'}</div>
                    {avgCPL > 0 && (
                        <div className="trend" style={{ color: avgCPL < 200_000 ? 'var(--success)' : 'var(--warning)' }}>
                            {avgCPL < 200_000 ? <><IconCheck size={14} /> Dưới target</> : <><IconAlertTriangle size={14} /> Trên target</>}
                        </div>
                    )}
                </div>
                <div className="kpi-card">
                    <h3>Tổng chất lượng</h3>
                    <div className="value">{data.reduce((s, d) => s + d.quality, 0).toLocaleString('vi-VN')}</div>
                    {totalLeads > 0 && (
                        <div className="trend" style={{ color: 'var(--text-muted)' }}>
                            {(data.reduce((s, d) => s + d.quality, 0) / totalLeads * 100).toFixed(1)}% tỷ lệ
                        </div>
                    )}
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1rem' }}>Phân bổ Leads</h3>
                    <DonutChart data={data} metric="leads" label="Leads" />
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1rem' }}>Phân bổ Chất lượng</h3>
                    <DonutChart data={data} metric="quality" label="Quality" />
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 600, marginBottom: '1rem' }}>Phân bổ Chi tiêu</h3>
                    <DonutChart data={data} metric="spend" label="VND" />
                </div>
            </div>

            {/* Detailed Comparison Table */}
            <div>
                <h2 style={{ fontSize: 'var(--font-xl)', fontWeight: 600, marginBottom: '1rem' }}><IconChart size={18} /> So sánh chi tiết</h2>
                <div className="card" style={{ padding: 0, overflow: 'auto' }}>
                    <table className="table" style={{ fontSize: 'var(--font-sm)', whiteSpace: 'nowrap' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-card)' }}>
                                <th>KÊNH</th>
                                <th style={{ textAlign: 'right' }}>CHI TIÊU</th>
                                <th style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>LEADS</th>
                                <th style={{ textAlign: 'right' }}>CPL</th>
                                <th style={{ textAlign: 'center' }}>CHẤT LƯỢNG</th>
                                <th style={{ textAlign: 'center' }}>TỶ LỆ CL</th>
                                <th style={{ textAlign: 'center' }}>CHIẾN DỊCH</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(d => (
                                <tr key={d.channel}>
                                    <td style={{ fontWeight: 500 }}><span style={{ color: CHANNEL_COLORS[d.channel] || '#6B7280' }}>●</span> {CHANNEL_LABELS[d.channel] || d.channel}</td>
                                    <td style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>{d.spend > 0 ? formatVND(d.spend) : '—'}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{d.leads.toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <span style={{ color: d.cpl > 0 ? (d.cpl < 200_000 ? 'var(--success)' : d.cpl < 300_000 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-muted)' }}>
                                            {d.cpl > 0 ? formatVND(d.cpl) : '—'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{d.quality.toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'center' }}>
                                        {d.leads > 0 ? `${(d.quality / d.leads * 100).toFixed(1)}%` : '—'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{d.campaigns}</td>
                                </tr>
                            ))}
                            {data.length > 1 && (
                                <tr style={{ fontWeight: 600, borderTop: '2px solid var(--border)', background: 'var(--bg-hover, rgba(0,0,0,0.02))' }}>
                                    <td>Tổng</td>
                                    <td style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>{formatVND(totalSpend)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{totalLeads.toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'right' }}>{avgCPL > 0 ? formatVND(avgCPL) : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{data.reduce((s, d) => s + d.quality, 0).toLocaleString('vi-VN')}</td>
                                    <td style={{ textAlign: 'center' }}>{totalLeads > 0 ? `${(data.reduce((s, d) => s + d.quality, 0) / totalLeads * 100).toFixed(1)}%` : '—'}</td>
                                    <td style={{ textAlign: 'center' }}>{data.reduce((s, d) => s + d.campaigns, 0)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
