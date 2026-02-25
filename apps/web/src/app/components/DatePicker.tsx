'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/* ---- Helpers ---- */
const DAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTHS_VI = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
    // 0=Sunday, convert to Monday-based (0=Monday)
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
}

function formatDisplay(value: string): string {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
}

function isToday(year: number, month: number, day: number): boolean {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
}

/* ---- Component ---- */
interface DatePickerProps {
    value: string; // yyyy-mm-dd
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    /** Compact mode for inline filter bars */
    compact?: boolean;
}

export default function DatePicker({
    value,
    onChange,
    placeholder = 'Chọn ngày',
    className = '',
    style,
    compact = false,
}: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Calendar state
    const now = new Date();
    const initialYear = value ? parseInt(value.split('-')[0]) : now.getFullYear();
    const initialMonth = value ? parseInt(value.split('-')[1]) - 1 : now.getMonth();
    const [viewYear, setViewYear] = useState(initialYear);
    const [viewMonth, setViewMonth] = useState(initialMonth);

    // Update view when value changes externally
    useEffect(() => {
        if (value) {
            const [y, m] = value.split('-').map(Number);
            setViewYear(y);
            setViewMonth(m - 1);
        }
    }, [value]);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        if (open) {
            document.addEventListener('mousedown', handleClick);
            return () => document.removeEventListener('mousedown', handleClick);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        if (open) {
            document.addEventListener('keydown', handleKey);
            return () => document.removeEventListener('keydown', handleKey);
        }
    }, [open]);

    const prevMonth = useCallback(() => {
        setViewMonth(m => {
            if (m === 0) { setViewYear(y => y - 1); return 11; }
            return m - 1;
        });
    }, []);

    const nextMonth = useCallback(() => {
        setViewMonth(m => {
            if (m === 11) { setViewYear(y => y + 1); return 0; }
            return m + 1;
        });
    }, []);

    const selectDay = useCallback((day: number) => {
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${viewYear}-${mm}-${dd}`);
        setOpen(false);
    }, [viewYear, viewMonth, onChange]);

    // Build calendar grid
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
    const selectedDay = value
        ? (() => {
            const [y, m, d] = value.split('-').map(Number);
            return y === viewYear && m - 1 === viewMonth ? d : -1;
        })()
        : -1;

    // Previous month trailing days
    const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);
    const trailingDays: number[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
        trailingDays.push(prevMonthDays - i);
    }

    // Next month leading days
    const totalCells = trailingDays.length + daysInMonth;
    const nextDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);

    return (
        <div ref={containerRef} className={`dp-container ${className}`} style={style}>
            {/* Trigger */}
            <button
                type="button"
                className={`dp-trigger ${compact ? 'dp-trigger-compact' : ''} ${open ? 'dp-trigger-active' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                <span className={value ? 'dp-value' : 'dp-placeholder'}>
                    {value ? formatDisplay(value) : placeholder}
                </span>
                <svg className="dp-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="dp-dropdown">
                    {/* Header */}
                    <div className="dp-header">
                        <button type="button" className="dp-nav" onClick={prevMonth}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <span className="dp-month-label">
                            {MONTHS_VI[viewMonth]} {viewYear}
                        </span>
                        <button type="button" className="dp-nav" onClick={nextMonth}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>

                    {/* Day headers */}
                    <div className="dp-grid dp-day-headers">
                        {DAYS_VI.map(d => (
                            <div key={d} className="dp-day-header">{d}</div>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="dp-grid">
                        {/* Trailing days from prev month */}
                        {trailingDays.map(d => (
                            <div key={`prev-${d}`} className="dp-day dp-day-outside">{d}</div>
                        ))}

                        {/* Current month days */}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                            <button
                                key={d}
                                type="button"
                                className={[
                                    'dp-day',
                                    d === selectedDay ? 'dp-day-selected' : '',
                                    isToday(viewYear, viewMonth, d) ? 'dp-day-today' : '',
                                ].join(' ')}
                                onClick={() => selectDay(d)}
                            >
                                {d}
                            </button>
                        ))}

                        {/* Leading days from next month */}
                        {Array.from({ length: nextDays }, (_, i) => i + 1).map(d => (
                            <div key={`next-${d}`} className="dp-day dp-day-outside">{d}</div>
                        ))}
                    </div>

                    {/* Footer: Today button */}
                    <div className="dp-footer">
                        <button
                            type="button"
                            className="dp-today-btn"
                            onClick={() => {
                                const t = new Date();
                                const val = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                                onChange(val);
                                setOpen(false);
                            }}
                        >
                            Hôm nay
                        </button>
                        {value && (
                            <button
                                type="button"
                                className="dp-clear-btn"
                                onClick={() => { onChange(''); setOpen(false); }}
                            >
                                Xóa
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
