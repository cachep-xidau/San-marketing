'use client';

/**
 * Shared TimeFilterBar component — used across all dashboard pages.
 *
 * Displays: [Tháng này] [Tháng trước] [3 tháng] [📅 Từ ngày — Đến ngày]
 */

import { useState } from 'react';
import type { TimeRange } from '@/lib/daily-metrics';

const PRESET_OPTIONS: { value: TimeRange; label: string }[] = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: '3m', label: '3 tháng' },
];

interface TimeFilterBarProps {
    timeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
    customStart?: string;
    customEnd?: string;
    onCustomDateChange?: (start: string, end: string) => void;
}

export default function TimeFilterBar({
    timeRange,
    onTimeRangeChange,
    customStart = '',
    customEnd = '',
    onCustomDateChange,
}: TimeFilterBarProps) {
    const [localStart, setLocalStart] = useState(customStart);
    const [localEnd, setLocalEnd] = useState(customEnd);

    const handlePreset = (range: TimeRange) => {
        onTimeRangeChange(range);
    };

    const handleDateChange = (start: string, end: string) => {
        // Auto-swap if start > end
        if (start && end && start > end) {
            [start, end] = [end, start];
        }
        setLocalStart(start);
        setLocalEnd(end);
        if (start && end) {
            onTimeRangeChange('custom');
            onCustomDateChange?.(start, end);
        }
    };

    const isCustom = timeRange === 'custom';

    const pillStyle = (active: boolean) => ({
        padding: '0.375rem 0.85rem',
        borderRadius: 'var(--radius-xs, 6px)',
        border: 'none',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: active ? 600 : 450,
        background: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-muted)',
        boxShadow: active ? 'var(--shadow-sm)' : 'none',
        transition: 'all 0.12s ease',
    });

    return (
        <div style={{
            display: 'flex',
            gap: '0.35rem',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-sm, 8px)',
            padding: '0.25rem',
            alignItems: 'center',
            flexWrap: 'wrap' as const,
        }}>
            {PRESET_OPTIONS.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => handlePreset(opt.value)}
                    style={pillStyle(timeRange === opt.value)}
                >
                    {opt.label}
                </button>
            ))}

            {/* Date picker separator */}
            <div style={{
                width: 1,
                height: 20,
                background: 'var(--border, #e5e7eb)',
                margin: '0 0.25rem',
            }} />

            {/* Custom date range */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-xs, 6px)',
                background: isCustom ? 'var(--bg-card)' : 'transparent',
                boxShadow: isCustom ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.12s ease',
            }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅</span>
                <input
                    type="date"
                    value={localStart}
                    onChange={e => handleDateChange(e.target.value, localEnd)}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.75rem',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        outline: 'none',
                        width: 115,
                        fontFamily: 'inherit',
                    }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>—</span>
                <input
                    type="date"
                    value={localEnd}
                    onChange={e => handleDateChange(localStart, e.target.value)}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.75rem',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        outline: 'none',
                        width: 115,
                        fontFamily: 'inherit',
                    }}
                />
            </div>
        </div>
    );
}
