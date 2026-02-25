'use client';

import { useState } from 'react';
import { CHANNEL_LABELS, CHANNEL_COLORS } from '@marketing-hub/shared';
import type { ChannelType } from '@marketing-hub/shared';
import { IconLink, IconSync, IconCheck, IconClose, IconClock, IconFacebook, IconMusic, IconMessageCircle } from '@/app/components/icons';

const CHANNEL_ICON: Record<ChannelType, React.ReactNode> = {
    FACEBOOK: <IconFacebook size={24} color={CHANNEL_COLORS.FACEBOOK} />,
    TIKTOK: <IconMusic size={24} color={CHANNEL_COLORS.TIKTOK} />,
    ZALO: <IconMessageCircle size={24} color={CHANNEL_COLORS.ZALO} />,
};

/* ---- Connector Types ---- */
interface ConnectorConfig {
    channel: ChannelType;
    connected: boolean;
    accountName?: string;
    accountId?: string;
    lastSync?: string;
    syncStatus?: 'syncing' | 'success' | 'error' | 'idle';
    adAccounts?: { id: string; name: string; selected: boolean }[];
    syncInterval: string;
    campaignCount?: number;
}

const INITIAL_CONNECTORS: ConnectorConfig[] = [
    {
        channel: 'FACEBOOK',
        connected: true,
        accountName: 'S Group Marketing',
        accountId: 'act_123456789',
        lastSync: '2026-02-25 07:30',
        syncStatus: 'success',
        adAccounts: [
            { id: 'act_123456789', name: 'S Group - Main', selected: true },
            { id: 'act_987654321', name: 'S Group - Branding', selected: true },
            { id: 'act_111222333', name: 'S Group - Retail', selected: false },
        ],
        syncInterval: '30min',
        campaignCount: 12,
    },
    {
        channel: 'TIKTOK',
        connected: true,
        accountName: 'SGroup TikTok Ads',
        accountId: 'adv_7890123',
        lastSync: '2026-02-25 07:15',
        syncStatus: 'success',
        adAccounts: [
            { id: 'adv_7890123', name: 'SGroup Official', selected: true },
        ],
        syncInterval: '1h',
        campaignCount: 5,
    },
    {
        channel: 'ZALO',
        connected: false,
        syncInterval: '1h',
    },
];

const SYNC_STATUS_MAP: Record<string, { label: string; badge: string }> = {
    syncing: { label: 'Đang đồng bộ...', badge: 'badge-info' },
    success: { label: 'Đã đồng bộ', badge: 'badge-success' },
    error: { label: 'Lỗi đồng bộ', badge: 'badge-danger' },
    idle: { label: 'Chờ', badge: '' },
};

/* ---- Sync History ---- */
interface SyncRecord {
    id: number;
    channel: ChannelType;
    timestamp: string;
    rows: number;
    duration: string;
    status: 'success' | 'error';
    errorMsg?: string;
}

const SYNC_HISTORY: SyncRecord[] = [
    { id: 1, channel: 'FACEBOOK', timestamp: '2026-02-25 07:30', rows: 1247, duration: '12s', status: 'success' },
    { id: 2, channel: 'TIKTOK', timestamp: '2026-02-25 07:15', rows: 389, duration: '8s', status: 'success' },
    { id: 3, channel: 'FACEBOOK', timestamp: '2026-02-25 07:00', rows: 1245, duration: '11s', status: 'success' },
    { id: 4, channel: 'FACEBOOK', timestamp: '2026-02-25 06:30', rows: 0, duration: '3s', status: 'error', errorMsg: 'Rate limit exceeded' },
    { id: 5, channel: 'TIKTOK', timestamp: '2026-02-25 06:15', rows: 387, duration: '9s', status: 'success' },
    { id: 6, channel: 'FACEBOOK', timestamp: '2026-02-25 06:00', rows: 1240, duration: '13s', status: 'success' },
];

export default function SettingsPage() {
    const [connectors, setConnectors] = useState<ConnectorConfig[]>(INITIAL_CONNECTORS);
    const [activeTab, setActiveTab] = useState<'connectors' | 'history'>('connectors');
    const [connectingChannel, setConnectingChannel] = useState<ChannelType | null>(null);

    async function handleConnect(channel: ChannelType) {
        setConnectingChannel(channel);
        // Simulate OAuth flow
        await new Promise(r => setTimeout(r, 2000));
        setConnectors(prev => prev.map(c =>
            c.channel === channel ? {
                ...c,
                connected: true,
                accountName: channel === 'ZALO' ? 'S Group Zalo OA' : c.accountName,
                accountId: channel === 'ZALO' ? 'oa_456789' : c.accountId,
                lastSync: 'Chưa đồng bộ',
                syncStatus: 'idle',
                adAccounts: channel === 'ZALO' ? [{ id: 'oa_456789', name: 'S Group OA', selected: true }] : c.adAccounts,
                campaignCount: 0,
            } : c
        ));
        setConnectingChannel(null);
    }

    async function handleDisconnect(channel: ChannelType) {
        if (!confirm(`Ngắt kết nối ${CHANNEL_LABELS[channel]}? Dữ liệu đã đồng bộ sẽ không bị xóa.`)) return;
        setConnectors(prev => prev.map(c =>
            c.channel === channel ? { ...c, connected: false, accountName: undefined, accountId: undefined, lastSync: undefined, syncStatus: undefined, adAccounts: undefined, campaignCount: undefined } : c
        ));
    }

    async function handleSync(channel: ChannelType) {
        setConnectors(prev => prev.map(c =>
            c.channel === channel ? { ...c, syncStatus: 'syncing' } : c
        ));
        await new Promise(r => setTimeout(r, 3000));
        setConnectors(prev => prev.map(c =>
            c.channel === channel ? {
                ...c,
                syncStatus: 'success',
                lastSync: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).replace('T', ' ').slice(0, 16),
            } : c
        ));
    }

    function handleToggleAccount(channel: ChannelType, accountId: string) {
        setConnectors(prev => prev.map(c =>
            c.channel === channel ? {
                ...c,
                adAccounts: c.adAccounts?.map(a => a.id === accountId ? { ...a, selected: !a.selected } : a),
            } : c
        ));
    }

    return (
        <>
            <div className="page-header">
                <h1>Cài đặt kết nối</h1>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                {(['connectors', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                            color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                    >
                        {tab === 'connectors' ? <><IconLink size={15} /> Kênh quảng cáo</> : <><IconClock size={15} /> Lịch sử đồng bộ</>}
                    </button>
                ))}
            </div>

            {/* Connectors Tab */}
            {activeTab === 'connectors' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {connectors.map(conn => (
                        <div key={conn.channel} className="card" style={{ borderLeft: `3px solid ${CHANNEL_COLORS[conn.channel]}` }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
                                {/* Channel Icon */}
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: `${CHANNEL_COLORS[conn.channel]}15`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem', flexShrink: 0,
                                }}>
                                    {CHANNEL_ICON[conn.channel]}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                        <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>{CHANNEL_LABELS[conn.channel]}</h3>
                                        <span className={`badge ${conn.connected ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                                            {conn.connected ? '● Đã kết nối' : '○ Chưa kết nối'}
                                        </span>
                                    </div>

                                    {conn.connected ? (
                                        <>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                {conn.accountName} • <code style={{ fontSize: '0.75rem', background: 'var(--bg)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>{conn.accountId}</code>
                                            </div>

                                            {/* Sync Status Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.8rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Đồng bộ lần cuối: </span>
                                                    <span style={{ fontWeight: 500 }}>{conn.lastSync}</span>
                                                </div>
                                                {conn.syncStatus && (
                                                    <span className={`badge ${SYNC_STATUS_MAP[conn.syncStatus].badge}`} style={{ fontSize: '0.7rem' }}>
                                                        {conn.syncStatus === 'success' ? <IconCheck size={12} /> : conn.syncStatus === 'syncing' ? <IconSync size={12} /> : <IconClock size={12} />} {SYNC_STATUS_MAP[conn.syncStatus].label}
                                                    </span>
                                                )}
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Chiến dịch: </span>
                                                    <span style={{ fontWeight: 600 }}>{conn.campaignCount}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-muted)' }}>Chu kỳ: </span>
                                                    <span style={{ fontWeight: 500 }}>{conn.syncInterval}</span>
                                                </div>
                                            </div>

                                            {/* Ad Accounts */}
                                            {conn.adAccounts && conn.adAccounts.length > 0 && (
                                                <div style={{ marginBottom: '0.75rem' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                                        Tài khoản quảng cáo
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        {conn.adAccounts.map(acc => (
                                                            <label key={acc.id} style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                                padding: '0.375rem 0.75rem',
                                                                background: acc.selected ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg)',
                                                                border: `1px solid ${acc.selected ? 'var(--primary)' : 'var(--border)'}`,
                                                                borderRadius: 'var(--radius-sm)',
                                                                cursor: 'pointer', fontSize: '0.8rem',
                                                                transition: 'all 0.15s',
                                                            }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={acc.selected}
                                                                    onChange={() => handleToggleAccount(conn.channel, acc.id)}
                                                                    style={{ accentColor: 'var(--primary)' }}
                                                                />
                                                                {acc.name}
                                                                <code style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{acc.id}</code>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleSync(conn.channel)}
                                                    disabled={conn.syncStatus === 'syncing'}
                                                    style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem' }}
                                                >
                                                    <IconSync size={14} /> {conn.syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => handleDisconnect(conn.channel)}
                                                    style={{ fontSize: '0.8rem', padding: '0.375rem 0.875rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}
                                                >
                                                    Ngắt kết nối
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                                Kết nối tài khoản {CHANNEL_LABELS[conn.channel]} để tự động đồng bộ dữ liệu chiến dịch
                                            </p>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleConnect(conn.channel)}
                                                disabled={connectingChannel === conn.channel}
                                                style={{ fontSize: '0.85rem' }}
                                            >
                                                {connectingChannel === conn.channel
                                                    ? <><IconSync size={14} /> Đang kết nối...</>
                                                    : <><IconLink size={14} /> Kết nối {CHANNEL_LABELS[conn.channel]}</>
                                                }
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sync History Tab */}
            {activeTab === 'history' && (
                <div className="card">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Kênh</th>
                                <th>Thời gian</th>
                                <th>Dòng dữ liệu</th>
                                <th>Thời lượng</th>
                                <th>Trạng thái</th>
                                <th>Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SYNC_HISTORY.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <span style={{ color: CHANNEL_COLORS[r.channel] }}>●</span> {CHANNEL_LABELS[r.channel]}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.timestamp}</td>
                                    <td style={{ fontWeight: 500 }}>{r.rows.toLocaleString('vi-VN')}</td>
                                    <td>{r.duration}</td>
                                    <td>
                                        <span className={`badge ${r.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                                            {r.status === 'success' ? <><IconCheck size={12} /> OK</> : <><IconClose size={12} /> Lỗi</>}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: r.errorMsg ? 'var(--danger)' : 'var(--text-muted)' }}>
                                        {r.errorMsg || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}
