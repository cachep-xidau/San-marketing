'use client';

import { useState } from 'react';
import { CHANNEL_LABELS, CHANNEL_COLORS, formatVND } from '@marketing-hub/shared';
import type { ChannelType } from '@marketing-hub/shared';
import { IconBell, IconPlus, IconCheck, IconClose, IconAlertTriangle, IconZap, IconClock, IconTarget, IconDollar } from '@/app/components/icons';

/* ---- Types ---- */
interface AlertRule {
    id: string;
    name: string;
    channel: ChannelType | 'ALL';
    metric: string;
    operator: '>' | '<' | '>=' | '<=';
    threshold: number;
    enabled: boolean;
    severity: 'critical' | 'warning' | 'info';
    notifyVia: ('email' | 'telegram')[];
}

interface AlertLog {
    id: string;
    ruleId: string;
    ruleName: string;
    channel: ChannelType;
    message: string;
    value: number;
    threshold: number;
    severity: 'critical' | 'warning' | 'info';
    timestamp: string;
    acknowledged: boolean;
}

const METRICS = [
    { value: 'cpl', label: 'CPL' },
    { value: 'spend_daily', label: 'Chi tiêu ngày' },
    { value: 'leads_daily', label: 'Leads ngày' },
    { value: 'ctr', label: 'CTR (%)' },
    { value: 'budget_pct', label: 'Budget sử dụng (%)' },
    { value: 'roas', label: 'ROAS' },
];

const SEVERITY_CONFIG: Record<string, { badge: string; color: string }> = {
    critical: { badge: 'badge-danger', color: 'var(--danger)' },
    warning: { badge: 'badge-warning', color: 'var(--warning)' },
    info: { badge: 'badge-info', color: 'var(--primary)' },
};

const METRIC_ICON: Record<string, React.ReactNode> = {
    cpl: <IconDollar size={14} />,
    spend_daily: <IconDollar size={14} />,
    leads_daily: <IconTarget size={14} />,
    ctr: <IconZap size={14} />,
    budget_pct: <IconAlertTriangle size={14} />,
    roas: <IconZap size={14} />,
};

/* ---- Demo Data ---- */
const DEMO_RULES: AlertRule[] = [
    { id: 'r1', name: 'CPL vượt ngưỡng', channel: 'ALL', metric: 'cpl', operator: '>', threshold: 250000, enabled: true, severity: 'critical', notifyVia: ['email', 'telegram'] },
    { id: 'r2', name: 'Budget > 90%', channel: 'ALL', metric: 'budget_pct', operator: '>', threshold: 90, enabled: true, severity: 'warning', notifyVia: ['email'] },
    { id: 'r3', name: 'CTR thấp', channel: 'FACEBOOK', metric: 'ctr', operator: '<', threshold: 2, enabled: true, severity: 'warning', notifyVia: ['telegram'] },
    { id: 'r4', name: 'Leads thấp bất thường', channel: 'ALL', metric: 'leads_daily', operator: '<', threshold: 10, enabled: false, severity: 'info', notifyVia: ['email'] },
    { id: 'r5', name: 'ROAS dưới mục tiêu', channel: 'TIKTOK', metric: 'roas', operator: '<', threshold: 2.5, enabled: true, severity: 'critical', notifyVia: ['email', 'telegram'] },
];

const DEMO_LOGS: AlertLog[] = [
    { id: 'l1', ruleId: 'r1', ruleName: 'CPL vượt ngưỡng', channel: 'ZALO', message: 'CPL Zalo OA/Ads đạt 320K ₫, vượt ngưỡng 250K ₫', value: 320000, threshold: 250000, severity: 'critical', timestamp: '2026-02-25 07:45', acknowledged: false },
    { id: 'l2', ruleId: 'r2', ruleName: 'Budget > 90%', channel: 'FACEBOOK', message: 'Zalo Tết Campaign đã sử dụng 95% budget', value: 95, threshold: 90, severity: 'warning', timestamp: '2026-02-25 07:30', acknowledged: false },
    { id: 'l3', ruleId: 'r5', ruleName: 'ROAS dưới mục tiêu', channel: 'TIKTOK', message: 'ROAS TikTok Ads = 2.1x, dưới mục tiêu 2.5x', value: 2.1, threshold: 2.5, severity: 'critical', timestamp: '2026-02-25 07:15', acknowledged: true },
    { id: 'l4', ruleId: 'r3', ruleName: 'CTR thấp', channel: 'FACEBOOK', message: 'CTR Facebook Ads = 1.8%, dưới ngưỡng 2%', value: 1.8, threshold: 2, severity: 'warning', timestamp: '2026-02-25 06:00', acknowledged: true },
    { id: 'l5', ruleId: 'r1', ruleName: 'CPL vượt ngưỡng', channel: 'TIKTOK', message: 'CPL TikTok Ads đạt 265K ₫, vượt ngưỡng 250K ₫', value: 265000, threshold: 250000, severity: 'critical', timestamp: '2026-02-24 18:30', acknowledged: true },
];

export default function AlertsPage() {
    const [activeTab, setActiveTab] = useState<'log' | 'rules'>('log');
    const [rules, setRules] = useState<AlertRule[]>(DEMO_RULES);
    const [logs, setLogs] = useState<AlertLog[]>(DEMO_LOGS);
    const [showCreateRule, setShowCreateRule] = useState(false);

    const unacknowledged = logs.filter(l => !l.acknowledged).length;

    function toggleRule(id: string) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    }

    function deleteRule(id: string) {
        if (!confirm('Xóa quy tắc cảnh báo này?')) return;
        setRules(prev => prev.filter(r => r.id !== id));
    }

    function acknowledgeLog(id: string) {
        setLogs(prev => prev.map(l => l.id === id ? { ...l, acknowledged: true } : l));
    }

    function acknowledgeAll() {
        setLogs(prev => prev.map(l => ({ ...l, acknowledged: true })));
    }

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h1>Cảnh báo</h1>
                    {unacknowledged > 0 && (
                        <span className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                            {unacknowledged} mới
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {unacknowledged > 0 && (
                        <button className="btn btn-outline" onClick={acknowledgeAll} style={{ fontSize: '0.8rem' }}>
                            <IconCheck size={14} /> Đánh dấu tất cả đã đọc
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowCreateRule(true)}>
                        <IconPlus size={14} /> Tạo quy tắc
                    </button>
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="kpi-card" style={{ borderLeft: '3px solid var(--danger)' }}>
                    <h3>Critical</h3>
                    <div className="value" style={{ color: 'var(--danger)' }}>{logs.filter(l => l.severity === 'critical' && !l.acknowledged).length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>chưa xử lý</div>
                </div>
                <div className="kpi-card" style={{ borderLeft: '3px solid var(--warning)' }}>
                    <h3>Warning</h3>
                    <div className="value" style={{ color: 'var(--warning)' }}>{logs.filter(l => l.severity === 'warning' && !l.acknowledged).length}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>chưa xử lý</div>
                </div>
                <div className="kpi-card">
                    <h3>Quy tắc active</h3>
                    <div className="value">{rules.filter(r => r.enabled).length}/{rules.length}</div>
                </div>
                <div className="kpi-card">
                    <h3>Tổng cảnh báo (24h)</h3>
                    <div className="value">{logs.length}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                {(['log', 'rules'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.75rem 1.5rem', background: 'none', border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                        }}
                    >
                        {tab === 'log' ? <><IconBell size={15} /> Nhật ký cảnh báo</> : <><IconZap size={15} /> Quy tắc</>}
                    </button>
                ))}
            </div>

            {/* Alert Log Tab */}
            {activeTab === 'log' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {logs.map(log => (
                        <div
                            key={log.id}
                            className="card"
                            style={{
                                borderLeft: `3px solid ${SEVERITY_CONFIG[log.severity].color}`,
                                opacity: log.acknowledged ? 0.7 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 8,
                                    background: log.severity === 'critical' ? 'rgba(239,68,68,0.1)' : log.severity === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                }}>
                                    {log.severity === 'critical' ? <IconAlertTriangle size={18} color="var(--danger)" /> : log.severity === 'warning' ? <IconAlertTriangle size={18} color="var(--warning)" /> : <IconBell size={18} color="var(--primary)" />}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.ruleName}</span>
                                        <span className={`badge ${SEVERITY_CONFIG[log.severity].badge}`} style={{ fontSize: '0.65rem' }}>
                                            {log.severity.toUpperCase()}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: CHANNEL_COLORS[log.channel] }}>
                                            ● {CHANNEL_LABELS[log.channel]}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                        {log.message}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
                                        <span><IconClock size={12} /> {log.timestamp}</span>
                                    </div>
                                </div>

                                <div style={{ flexShrink: 0 }}>
                                    {!log.acknowledged ? (
                                        <button
                                            className="btn btn-outline"
                                            onClick={() => acknowledgeLog(log.id)}
                                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                                        >
                                            <IconCheck size={12} /> Đã xem
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <IconCheck size={12} /> Đã xử lý
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {rules.map(rule => (
                        <div key={rule.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', opacity: rule.enabled ? 1 : 0.6 }}>
                            {/* Toggle */}
                            <div
                                onClick={() => toggleRule(rule.id)}
                                style={{
                                    width: 44, height: 24, borderRadius: 12,
                                    background: rule.enabled ? 'var(--success)' : 'var(--border)',
                                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                }}
                            >
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%', background: 'white',
                                    position: 'absolute', top: 2,
                                    left: rule.enabled ? 22 : 2, transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }} />
                            </div>

                            {/* Rule Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    <span style={{ fontWeight: 600 }}>{rule.name}</span>
                                    <span className={`badge ${SEVERITY_CONFIG[rule.severity].badge}`} style={{ fontSize: '0.65rem' }}>
                                        {rule.severity.toUpperCase()}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                        {METRIC_ICON[rule.metric]} {METRICS.find(m => m.value === rule.metric)?.label}
                                        {' '}{rule.operator} {rule.metric === 'cpl' || rule.metric === 'spend_daily' ? formatVND(rule.threshold) : rule.threshold}
                                        {rule.metric === 'ctr' || rule.metric === 'budget_pct' ? '%' : rule.metric === 'roas' ? 'x' : ''}
                                    </span>
                                    <span>
                                        Kênh: {rule.channel === 'ALL' ? 'Tất cả' : CHANNEL_LABELS[rule.channel as ChannelType]}
                                    </span>
                                    <span>
                                        Gửi qua: {rule.notifyVia.join(', ')}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                className="btn btn-outline"
                                onClick={() => deleteRule(rule.id)}
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                            >
                                <IconClose size={12} /> Xóa
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Rule Modal */}
            {showCreateRule && <CreateRuleModal onClose={() => setShowCreateRule(false)} onCreate={(rule) => {
                setRules([rule, ...rules]);
                setShowCreateRule(false);
            }} />}
        </>
    );
}

function CreateRuleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (r: AlertRule) => void }) {
    const [form, setForm] = useState({
        name: '',
        channel: 'ALL' as AlertRule['channel'],
        metric: 'cpl',
        operator: '>' as AlertRule['operator'],
        threshold: 250000,
        severity: 'warning' as AlertRule['severity'],
        notifyVia: ['email'] as ('email' | 'telegram')[],
    });

    function toggleNotify(via: 'email' | 'telegram') {
        setForm(prev => ({
            ...prev,
            notifyVia: prev.notifyVia.includes(via)
                ? prev.notifyVia.filter(v => v !== via)
                : [...prev.notifyVia, via],
        }));
    }

    function handleSubmit() {
        onCreate({
            id: `r${Date.now()}`,
            ...form,
            name: form.name || `${METRICS.find(m => m.value === form.metric)?.label} ${form.operator} ${form.threshold}`,
            enabled: true,
        });
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={onClose}>
            <div className="card" style={{ width: '100%', maxWidth: 480, animation: 'slideUp 0.2s ease' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <IconZap size={18} /> Tạo quy tắc cảnh báo
                </h2>

                <div className="form-group">
                    <label>Tên quy tắc (tùy chọn)</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Tự động đặt nếu trống" />
                </div>

                <div className="form-group">
                    <label>Kênh</label>
                    <select value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value as AlertRule['channel'] })}
                        style={{ width: '100%', padding: '0.625rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.875rem' }}>
                        <option value="ALL">Tất cả kênh</option>
                        <option value="FACEBOOK">Facebook Ads</option>
                        <option value="TIKTOK">TikTok Ads</option>
                        <option value="ZALO">Zalo OA/Ads</option>
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: '0.75rem' }}>
                    <div className="form-group">
                        <label>Chỉ số</label>
                        <select value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })}
                            style={{ width: '100%', padding: '0.625rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.875rem' }}>
                            {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Điều kiện</label>
                        <select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value as AlertRule['operator'] })}
                            style={{ width: '100%', padding: '0.625rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.875rem' }}>
                            <option value=">">&gt; lớn hơn</option>
                            <option value="<">&lt; nhỏ hơn</option>
                            <option value=">=">&ge; từ</option>
                            <option value="<=">&le; đến</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Ngưỡng</label>
                        <input type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: Number(e.target.value) })} />
                    </div>
                </div>

                <div className="form-group">
                    <label>Mức độ nghiêm trọng</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(['info', 'warning', 'critical'] as AlertRule['severity'][]).map(s => (
                            <button
                                key={s}
                                className={`btn ${form.severity === s ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => setForm({ ...form, severity: s })}
                                style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem', flex: 1, justifyContent: 'center' }}
                            >
                                {s === 'info' ? 'Info' : s === 'warning' ? 'Warning' : 'Critical'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label>Kênh thông báo</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {(['email', 'telegram'] as const).map(via => (
                            <label key={via} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.375rem 0.75rem',
                                background: form.notifyVia.includes(via) ? 'rgba(99,102,241,0.08)' : 'var(--bg)',
                                border: `1px solid ${form.notifyVia.includes(via) ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.8rem',
                            }}>
                                <input type="checkbox" checked={form.notifyVia.includes(via)} onChange={() => toggleNotify(via)} style={{ accentColor: 'var(--primary)' }} />
                                {via === 'email' ? 'Email' : 'Telegram'}
                            </label>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn btn-outline" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Hủy</button>
                    <button className="btn btn-primary" onClick={handleSubmit} style={{ flex: 1, justifyContent: 'center' }}>
                        <IconPlus size={14} /> Tạo quy tắc
                    </button>
                </div>
            </div>
        </div>
    );
}
