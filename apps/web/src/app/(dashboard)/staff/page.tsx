'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { COMPANIES, formatVND } from '@marketing-hub/shared';
import { type TimeRange } from '@/lib/daily-metrics';
import { fetchSession } from '@/lib/auth';
import { useCompany } from '../layout';
import { IconUpload, IconPlus, IconCheck, IconClose, IconDownload, IconUsers, IconFilter, IconFile } from '@/app/components/icons';
import TimeFilterBar from '@/app/components/TimeFilterBar';
import DatePicker from '@/app/components/DatePicker';

/* ---- Lead entry row type (mirrors the _NEW sheets) ---- */
interface LeadEntry {
    id: string;
    date: string;
    month: string;
    campaignId: string;
    campaignName: string;
    channel: string;
    total: number;       // TỔNG
    spam: number;        // SPAM
    potential: number;   // TIỀM NĂNG
    quality: number;     // CHẤT LƯỢNG
    booked: number;      // ĐẶT HẸN
    arrived: number;     // ĐẾN PK
    closed: number;      // CHỐT
    bills: number;       // # BILL
    budgetTarget: number;  // Ngân sách mục tiêu
    budgetActual: number;  // Ngân sách thực tế
    enteredBy: string;   // Người nhập liệu
    updatedBy?: string;  // Người cập nhật cuối
    updatedAt?: string;  // Thời gian cập nhật cuối
}

/* ---- Fetch real data from DB ---- */
async function fetchEntries(companyId: string, start?: string, end?: string): Promise<LeadEntry[]> {
    try {
        let url = `/api/marketing/entries?companyId=${companyId}`;
        if (start) url += `&start=${start}`;
        if (end) url += `&end=${end}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.entries || [];
    } catch {
        return [];
    }
}

/* ---- Main Component ---- */
export default function StaffDashboard() {
    const [user, setUser] = useState<{ name: string; role: string } | null>(null);
    const { selectedCompanyId, setSelectedCompanyId } = useCompany();
    const activeCompanyId = selectedCompanyId === 'all' ? 'san' : selectedCompanyId;
    const activeCompany = COMPANIES.find(c => c.id === activeCompanyId);

    const [entries, setEntries] = useState<LeadEntry[]>([]);
    const [timeRange, setTimeRange] = useState<TimeRange>('this_month');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [companySummary, setCompanySummary] = useState<Record<string, { campaigns: number; leads: number }>>({});

    // Compute date range from timeRange
    const dateRange = useMemo(() => {
        if (timeRange === 'custom' && customStart && customEnd) {
            return { start: customStart, end: customEnd };
        }
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const fmt = (d: Date) => d.toISOString().split('T')[0];
        switch (timeRange) {
            case 'this_month': return { start: fmt(new Date(year, month, 1)), end: fmt(new Date(year, month + 1, 0)) };
            case 'last_month': return { start: fmt(new Date(year, month - 1, 1)), end: fmt(new Date(year, month, 0)) };
            case '3m': return { start: fmt(new Date(year, month - 2, 1)), end: fmt(new Date(year, month + 1, 0)) };
            default: return { start: fmt(new Date(year, month - 2, 1)), end: fmt(new Date(year, month + 1, 0)) };
        }
    }, [timeRange, customStart, customEnd]);

    // Fetch user session
    useEffect(() => {
        fetchSession().then(s => { if (s) setUser(s); });
    }, []);

    // Fetch real entries when company or date range changes
    useEffect(() => {
        fetchEntries(activeCompanyId, dateRange.start, dateRange.end).then(setEntries);
    }, [activeCompanyId, dateRange.start, dateRange.end]);

    // Fetch summary for ALL companies (for card metrics)
    useEffect(() => {
        let url = `/api/marketing?start=${dateRange.start}&end=${dateRange.end}`;
        fetch(url).then(r => r.ok ? r.json() : null).then(data => {
            if (!data?.summary) return;
            const map: Record<string, { campaigns: number; leads: number }> = {};
            for (const s of data.summary) {
                const coCampaigns = data.campaigns?.filter((c: { companyId: string }) => c.companyId === s.companyId) || [];
                const uniqueNames = new Set(coCampaigns.map((c: { campaignName: string }) => c.campaignName));
                map[s.companyId] = { campaigns: uniqueNames.size, leads: s._sum?.totalLead || 0 };
            }
            setCompanySummary(map);
        }).catch(() => { });
    }, [dateRange.start, dateRange.end]);
    const [showAddRow, setShowAddRow] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filterChannel, setFilterChannel] = useState('all');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    // Get campaigns for this company
    const companyCampaigns = useMemo(() => {
        // Derive campaigns from entries
        const seen = new Map<string, { id: string; name: string; channel: string }>();
        for (const e of entries) {
            if (!seen.has(e.campaignName)) {
                seen.set(e.campaignName, { id: e.campaignId, name: e.campaignName, channel: e.channel });
            }
        }
        return Array.from(seen.values());
    }, [entries]);

    // Derive channel list from actual data (DB stores raw strings)
    const channels = useMemo(() => {
        const set = new Set<string>();
        entries.forEach(e => { if (e.channel) set.add(e.channel); });
        return Array.from(set).sort();
    }, [entries]);

    // Parse dd/mm/yyyy to Date for comparison
    const parseDMY = (s: string): Date | null => {
        const parts = s.split('/');
        if (parts.length !== 3) return null;
        const [d, m, y] = parts.map(Number);
        return new Date(y, m - 1, d);
    };

    // Filtered entries
    const filteredEntries = useMemo(() => {
        let list = entries;
        if (filterChannel !== 'all') list = list.filter(e => e.channel === filterChannel);
        if (filterStartDate) {
            const start = new Date(filterStartDate);
            list = list.filter(e => { const d = parseDMY(e.date); return d && d >= start; });
        }
        if (filterEndDate) {
            const end = new Date(filterEndDate);
            end.setHours(23, 59, 59);
            list = list.filter(e => { const d = parseDMY(e.date); return d && d <= end; });
        }
        return list;
    }, [entries, filterChannel, filterStartDate, filterEndDate]);

    // Totals row
    const totals = useMemo(() => ({
        total: filteredEntries.reduce((s, e) => s + e.total, 0),
        spam: filteredEntries.reduce((s, e) => s + e.spam, 0),
        potential: filteredEntries.reduce((s, e) => s + e.potential, 0),
        quality: filteredEntries.reduce((s, e) => s + e.quality, 0),
        booked: filteredEntries.reduce((s, e) => s + e.booked, 0),
        arrived: filteredEntries.reduce((s, e) => s + e.arrived, 0),
        closed: filteredEntries.reduce((s, e) => s + e.closed, 0),
        bills: filteredEntries.reduce((s, e) => s + e.bills, 0),
        budgetTarget: filteredEntries.reduce((s, e) => s + e.budgetTarget, 0),
        budgetActual: filteredEntries.reduce((s, e) => s + e.budgetActual, 0),
    }), [filteredEntries]);

    /* ---- New row form state ---- */
    const [newRow, setNewRow] = useState({
        channel: '', campaignId: '', total: 0, spam: 0, potential: 0, quality: 0,
        booked: 0, arrived: 0, closed: 0, bills: 0,
        budgetTarget: 0, budgetActual: 0,
    });

    // Filter campaigns by selected channel in add row
    const filteredCampaignsForAdd = useMemo(() => {
        if (!newRow.channel) return companyCampaigns;
        return companyCampaigns.filter(c => c.channel === newRow.channel);
    }, [companyCampaigns, newRow.channel]);

    const resetForm = () => {
        setNewRow({ channel: '', campaignId: '', total: 0, spam: 0, potential: 0, quality: 0, booked: 0, arrived: 0, closed: 0, bills: 0, budgetTarget: 0, budgetActual: 0 });
        setEditingId(null);
        setShowAddRow(false);
    };

    const handleEditEntry = useCallback((entry: LeadEntry) => {
        setEditingId(entry.id);
        setNewRow({
            channel: entry.channel,
            campaignId: entry.campaignId,
            total: entry.total,
            spam: entry.spam,
            potential: entry.potential,
            quality: entry.quality,
            booked: entry.booked,
            arrived: entry.arrived,
            closed: entry.closed,
            bills: entry.bills,
            budgetTarget: entry.budgetTarget,
            budgetActual: entry.budgetActual,
        });
        setShowAddRow(true);
    }, []);

    const handleAddEntry = useCallback(() => {
        const campaign = companyCampaigns.find(c => c.id === newRow.campaignId);
        if (!campaign) return;

        const now = new Date();
        const nowStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (editingId) {
            // Update existing entry
            setEntries(prev => prev.map(e => e.id === editingId ? {
                ...e,
                ...newRow,
                campaignId: campaign.id,
                campaignName: campaign.name,
                channel: newRow.channel || campaign.channel,
                updatedBy: user?.name || 'Staff',
                updatedAt: nowStr,
            } : e));
        } else {
            // Create new entry
            const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            const entry: LeadEntry = {
                id: `e${Date.now()}`,
                date: dateStr,
                month: `T${now.getMonth() + 1}`,
                ...newRow,
                campaignId: campaign.id,
                campaignName: campaign.name,
                channel: newRow.channel || campaign.channel,
                enteredBy: user?.name || 'Staff',
            };
            setEntries(prev => [entry, ...prev]);
        }
        resetForm();
    }, [newRow, companyCampaigns, user, editingId]);

    /* ---- CSV Upload ---- */
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success'>('idle');

    const handleCSVUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return;

            const newEntries: LeadEntry[] = [];
            let idx = Date.now();

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
                if (cols.length < 10) continue;

                newEntries.push({
                    id: `csv${idx++}`,
                    date: cols[0] || '',
                    month: cols[1] || '',
                    campaignId: cols[2] || '',
                    campaignName: cols[3] || '',
                    channel: cols[4] || '',
                    total: parseInt(cols[5]) || 0,
                    spam: parseInt(cols[6]) || 0,
                    potential: parseInt(cols[7]) || 0,
                    quality: parseInt(cols[8]) || 0,
                    booked: parseInt(cols[9]) || 0,
                    arrived: parseInt(cols[10]) || 0,
                    closed: parseInt(cols[11]) || 0,
                    bills: parseInt(cols[12]) || 0,
                    budgetTarget: parseInt(cols[13]) || 0,
                    budgetActual: parseInt(cols[14]) || 0,
                    enteredBy: user?.name || 'CSV Import',
                });
            }

            if (newEntries.length > 0) {
                setEntries(prev => [...newEntries, ...prev]);
                setUploadStatus('success');
                setTimeout(() => setUploadStatus('idle'), 3000);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [user]);

    const channelLabel = (id: string) => id;

    const channelColor = (id: string) => {
        const ch = activeCompany?.channels.find(c => c.id === id || c.label === id);
        return ch?.color || '#6B7280';
    };

    return (
        <>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <div>
                    <h1>Nhập liệu</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-md)', marginTop: '0.25rem' }}>
                        Nhập số liệu leads hàng ngày
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddRow(true)} style={{ fontSize: 'var(--font-base)' }}>
                    <IconPlus size={14} /> Thêm dòng
                </button>
            </div>

            {/* Company selector cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {COMPANIES.map(co => {
                    const isActive = activeCompanyId === co.id;
                    const summary = companySummary[co.id];
                    return (
                        <div
                            key={co.id}
                            className="card"
                            onClick={() => setSelectedCompanyId(co.id)}
                            style={{
                                cursor: 'pointer',
                                borderTop: `3px solid ${co.color}`,
                                outline: isActive ? `2px solid ${co.color}` : 'none',
                                outlineOffset: -1,
                                opacity: isActive ? 1 : 0.65,
                                transition: 'all 0.15s ease',
                                padding: '0.75rem 1rem',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: 5, background: co.color,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 'var(--font-xs)',
                                }}>{co.shortName.charAt(0)}</div>
                                <span style={{ fontWeight: 600, fontSize: 'var(--font-md)' }}>{co.shortName}</span>
                                {isActive && <span style={{
                                    marginLeft: 'auto', fontSize: 'var(--font-xs)', background: co.color, color: 'white',
                                    padding: '0.1rem 0.4rem', borderRadius: 4, fontWeight: 600,
                                }}>Đang chọn</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: 'var(--font-sm)' }}>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>Chiến dịch</div>
                                    <div style={{ fontWeight: 700 }}>{summary ? summary.campaigns : '—'}</div>
                                </div>
                                <div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 'var(--font-xs)' }}>Leads</div>
                                    <div style={{ fontWeight: 700 }}>{summary ? summary.leads.toLocaleString('vi-VN') : '—'}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Upload success toast */}
            {uploadStatus === 'success' && (
                <div className="card" style={{ borderLeft: '3px solid var(--success)', marginBottom: '1rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconCheck size={16} color="var(--success)" /> Import CSV thành công!
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <TimeFilterBar
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    onCustomDateChange={(s, e) => { setCustomStart(s); setCustomEnd(e); }}
                />

                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.15rem' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 'var(--font-md)' }}>
                    <IconFilter size={14} /> Lọc:
                </div>
                <select
                    className="dp-trigger"
                    value={filterChannel}
                    onChange={e => setFilterChannel(e.target.value)}
                    style={{ appearance: 'none', WebkitAppearance: 'none', minWidth: 140, paddingRight: '1.5rem', backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a9a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center' }}
                >
                    <option value="all">Tất cả kênh</option>
                    {channels.map(ch => (
                        <option key={ch} value={ch}>{ch}</option>
                    ))}
                </select>

                <span style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)' }}>
                    {filteredEntries.length} dòng
                </span>
            </div>

            {/* Data Table */}
            <div className="card" style={{ overflow: 'auto', padding: 0 }}>
                <table className="table" style={{ fontSize: 'var(--font-sm)', whiteSpace: 'nowrap' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-card)' }}>
                            <th style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 3, minWidth: 80 }}>NGÀY</th>
                            <th style={{ position: 'sticky', left: 80, background: 'var(--bg-card)', zIndex: 3, minWidth: 90 }}>KÊNH</th>
                            <th style={{ position: 'sticky', left: 170, background: 'var(--bg-card)', zIndex: 3, minWidth: 180, borderRight: '2px solid var(--border)' }}>CHIẾN DỊCH</th>
                            <th style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>TỔNG</th>
                            <th style={{ textAlign: 'center' }}>SPAM</th>
                            <th style={{ textAlign: 'center' }}>TIỀM NĂNG</th>
                            <th style={{ textAlign: 'center' }}>CHẤT LƯỢNG</th>
                            <th style={{ textAlign: 'center' }}>ĐẶT HẸN</th>
                            <th style={{ textAlign: 'center' }}>ĐẾN PK</th>
                            <th style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>CHỐT</th>
                            <th style={{ textAlign: 'center' }}># BILL</th>
                            <th style={{ textAlign: 'right' }}>NS MỤC TIÊU</th>
                            <th style={{ textAlign: 'right' }}>NS THỰC TẾ</th>
                            <th><IconUsers size={12} /> NGƯỜI NHẬP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Data rows */}
                        {filteredEntries.map(entry => (
                            <tr key={entry.id} onClick={() => handleEditEntry(entry)} style={{ cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.03))'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2, fontWeight: 500, color: 'var(--text-muted)', fontSize: 'var(--font-sm)', minWidth: 80 }}>{entry.date}</td>
                                <td style={{ position: 'sticky', left: 80, background: 'var(--bg-card)', zIndex: 2, minWidth: 90 }}><span style={{ color: channelColor(entry.channel) }}>●</span> {channelLabel(entry.channel)}</td>
                                <td style={{ position: 'sticky', left: 170, background: 'var(--bg-card)', zIndex: 2, fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 180, borderRight: '2px solid var(--border)' }}>{entry.campaignName}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>{entry.total}</td>
                                <td style={{ textAlign: 'center', color: entry.spam > 0 ? '#EF4444' : 'var(--text-muted)' }}>{entry.spam}</td>
                                <td style={{ textAlign: 'center' }}>{entry.potential}</td>
                                <td style={{ textAlign: 'center' }}>{entry.quality}</td>
                                <td style={{ textAlign: 'center' }}>{entry.booked}</td>
                                <td style={{ textAlign: 'center' }}>{entry.arrived}</td>
                                <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--success)' }}>{entry.closed}</td>
                                <td style={{ textAlign: 'center' }}>{entry.bills}</td>
                                <td style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>{entry.budgetTarget > 0 ? formatVND(entry.budgetTarget) : '—'}</td>
                                <td style={{ textAlign: 'right', fontSize: 'var(--font-sm)' }}>{entry.budgetActual > 0 ? formatVND(entry.budgetActual) : '—'}</td>
                                <td style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>{entry.updatedBy ? `${entry.updatedBy} ✏️` : entry.enteredBy}</td>
                            </tr>
                        ))}

                        {/* Totals row */}
                        {filteredEntries.length > 0 && (
                            <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border)', background: 'var(--bg-card)' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 2, minWidth: 80 }}>TỔNG</td>
                                <td style={{ position: 'sticky', left: 80, background: 'var(--bg-card)', zIndex: 2, minWidth: 90 }}></td>
                                <td style={{ position: 'sticky', left: 170, background: 'var(--bg-card)', zIndex: 2, minWidth: 180, borderRight: '2px solid var(--border)' }}></td>
                                <td style={{ textAlign: 'center', color: 'var(--primary)' }}>{totals.total}</td>
                                <td style={{ textAlign: 'center', color: '#EF4444' }}>{totals.spam}</td>
                                <td style={{ textAlign: 'center' }}>{totals.potential}</td>
                                <td style={{ textAlign: 'center' }}>{totals.quality}</td>
                                <td style={{ textAlign: 'center' }}>{totals.booked}</td>
                                <td style={{ textAlign: 'center' }}>{totals.arrived}</td>
                                <td style={{ textAlign: 'center', color: 'var(--success)' }}>{totals.closed}</td>
                                <td style={{ textAlign: 'center' }}>{totals.bills}</td>
                                <td style={{ textAlign: 'right' }}>{totals.budgetTarget > 0 ? formatVND(totals.budgetTarget) : '—'}</td>
                                <td style={{ textAlign: 'right' }}>{totals.budgetActual > 0 ? formatVND(totals.budgetActual) : '—'}</td>
                                <td></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {filteredEntries.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <IconFile size={36} />
                    <p style={{ marginTop: '0.75rem', fontWeight: 500 }}>Chưa có dữ liệu</p>
                    <p style={{ fontSize: 'var(--font-base)' }}>Nhấn "Thêm dòng" hoặc "Import CSV" để bắt đầu nhập liệu</p>
                </div>
            )}

            {/* ═══ Add Entry Modal ═══ */}
            {showAddRow && (() => {
                const today = new Date();
                const dateDisplay = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
                const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={resetForm}>
                        <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', animation: 'slideUp 0.2s ease', padding: 0 }} onClick={e => e.stopPropagation()}>

                            {/* ── Company Header with color tint ── */}
                            <div style={{
                                background: `${activeCompany?.color || '#6B7280'}12`,
                                borderBottom: `2px solid ${activeCompany?.color || '#6B7280'}`,
                                padding: '1rem 1.5rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: 8,
                                        background: activeCompany?.color || '#6B7280',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontWeight: 700, fontSize: 'var(--font-lg)',
                                    }}>{activeCompany?.shortName.charAt(0) || '?'}</div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>{editingEntry ? 'Chỉnh sửa' : (activeCompany?.name || 'Công ty')}</div>
                                        <div style={{ fontSize: 'var(--font-base)', color: 'var(--text-muted)' }}>{editingEntry ? editingEntry.campaignName : `Nhập số liệu — ${dateDisplay}`}</div>
                                    </div>
                                </div>
                                <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}><IconClose size={20} /></button>
                            </div>

                            {/* ── Form Body ── */}
                            <div style={{ padding: '1.25rem 1.5rem' }}>

                                {/* Campaign info: 2-column */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    <div>
                                        <label style={{ fontSize: 'var(--font-base)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Kênh</label>
                                        <select className="input" value={newRow.channel} onChange={e => setNewRow(p => ({ ...p, channel: e.target.value, campaignId: '' }))}
                                            style={{ width: '100%', fontSize: 'var(--font-md)', padding: '0.5rem 0.75rem' }}>
                                            <option value="">Chọn kênh...</option>
                                            {(activeCompany?.channels || []).map(ch => (
                                                <option key={ch.id} value={ch.id}>{ch.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 'var(--font-base)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Chiến dịch</label>
                                        <select className="input" value={newRow.campaignId} onChange={e => setNewRow(p => ({ ...p, campaignId: e.target.value }))}
                                            style={{ width: '100%', fontSize: 'var(--font-md)', padding: '0.5rem 0.75rem' }}>
                                            <option value="">Chọn chiến dịch...</option>
                                            {filteredCampaignsForAdd.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 1.25rem' }} />

                                {/* Leads: 4-column grid */}
                                <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Số liệu Leads</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem 0.65rem', marginBottom: '1.25rem' }}>
                                    {[
                                        { key: 'potential' as const, label: 'Tiềm năng' },
                                        { key: 'quality' as const, label: 'Chất lượng' },
                                        { key: 'booked' as const, label: 'Đặt hẹn' },
                                        { key: 'arrived' as const, label: 'Đến PK' },
                                        { key: 'closed' as const, label: 'Chốt', color: 'var(--success)' },
                                        { key: 'bills' as const, label: '# Bill' },
                                        { key: 'total' as const, label: 'Tổng', color: 'var(--primary)' },
                                        { key: 'spam' as const, label: 'Spam', color: '#EF4444' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, marginBottom: '0.15rem', display: 'block', color: f.color || 'var(--text)' }}>{f.label}</label>
                                            <input className="input" type="number" min={0}
                                                value={newRow[f.key] || ''}
                                                onChange={e => setNewRow(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                                                style={{ width: '100%', fontSize: 'var(--font-md)', padding: '0.45rem 0.5rem', textAlign: 'center' }}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 1.25rem' }} />

                                {/* Budget: 2-column */}
                                <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>Ngân sách</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, marginBottom: '0.15rem', display: 'block' }}>NS Mục tiêu</label>
                                        <input className="input" type="number" min={0}
                                            value={newRow.budgetTarget || ''}
                                            onChange={e => setNewRow(p => ({ ...p, budgetTarget: parseInt(e.target.value) || 0 }))}
                                            style={{ width: '100%', fontSize: 'var(--font-md)', padding: '0.5rem 0.75rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 'var(--font-sm)', fontWeight: 500, marginBottom: '0.15rem', display: 'block' }}>NS Thực tế</label>
                                        <input className="input" type="number" min={0}
                                            value={newRow.budgetActual || ''}
                                            onChange={e => setNewRow(p => ({ ...p, budgetActual: parseInt(e.target.value) || 0 }))}
                                            style={{ width: '100%', fontSize: 'var(--font-md)', padding: '0.5rem 0.75rem' }}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                {/* Update log */}
                                {editingEntry?.updatedBy && (
                                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        🕐 Cập nhật lần cuối: <strong>{editingEntry.updatedBy}</strong> — {editingEntry.updatedAt}
                                    </div>
                                )}
                                {editingEntry && !editingEntry.updatedBy && (
                                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        📝 Người nhập: <strong>{editingEntry.enteredBy}</strong> — {editingEntry.date}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button className="btn btn-outline" onClick={resetForm} style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleAddEntry} disabled={!newRow.campaignId} style={{ flex: 1, justifyContent: 'center' }}>
                                        <IconCheck size={14} /> {editingEntry ? 'Cập nhật' : 'Lưu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
