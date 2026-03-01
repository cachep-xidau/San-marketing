/**
 * Helper functions for marketing data processing
 */

/**
 * Safely convert null/undefined/string to number
 */
export function numOrZero(v: number | string | null | undefined): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return parseFloat(v) || 0;
    return v;
}

/**
 * Format Date to YYYY-MM-DD string
 */
export function fmt(d: Date): string {
    return d.toISOString().split('T')[0];
}

/**
 * Convert date string to Vietnamese month label (T1/2025)
 */
export function toMonthLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return `T${d.getMonth() + 1}/${d.getFullYear()}`;
}
