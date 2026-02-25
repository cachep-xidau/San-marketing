'use client';

/**
 * Shared TimeFilterBar component — used across all dashboard pages.
 *
 * Displays: [Tháng này] [Tháng trước] [3 tháng] [Từ ngày — Đến ngày]
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

        </div>
    );
}
