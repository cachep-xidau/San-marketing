/**
 * Date range utilities for marketing data
 */

import type { TimeRange } from '@/lib/daily-metrics';
import { fmt } from './marketing-data-helpers';

/**
 * Compute start/end date range based on month-based TimeRange.
 * Uses UTC to match DB dates stored via Date.UTC().
 */
export function getMonthRange(range: TimeRange, customStart?: string, customEnd?: string): { start: string; end: string } {
    if (range === 'custom' && customStart && customEnd) {
        return { start: customStart, end: customEnd };
    }

    // Use UTC to match DB dates stored via Date.UTC()
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-indexed

    switch (range) {
        case 'this_month': {
            const start = new Date(Date.UTC(year, month, 1));
            const end = new Date(Date.UTC(year, month + 1, 0));
            return { start: fmt(start), end: fmt(end) };
        }
        case 'last_month': {
            const start = new Date(Date.UTC(year, month - 1, 1));
            const end = new Date(Date.UTC(year, month, 0));
            return { start: fmt(start), end: fmt(end) };
        }
        case '3m': {
            const start = new Date(Date.UTC(year, month - 2, 1));
            const end = new Date(Date.UTC(year, month + 1, 0));
            return { start: fmt(start), end: fmt(end) };
        }
        default: {
            // fallback: 3 months
            const start = new Date(Date.UTC(year, month - 2, 1));
            const end = new Date(Date.UTC(year, month + 1, 0));
            return { start: fmt(start), end: fmt(end) };
        }
    }
}
