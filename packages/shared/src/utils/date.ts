const TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * Get current date/time in GMT+7
 */
export function nowVN(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Format date as "DD/MM/YYYY" (Vietnamese convention)
 */
export function formatDateVN(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', { timeZone: TIMEZONE });
}

/**
 * Format date as "DD/MM/YYYY HH:mm"
 */
export function formatDateTimeVN(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('vi-VN', {
        timeZone: TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Get relative time string in Vietnamese
 * Example: "2 giờ trước", "3 ngày trước"
 */
export function timeAgoVN(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

    if (seconds < 60) return 'Vừa xong';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
    return formatDateVN(d);
}

/**
 * Date range presets for dashboard filters
 */
export const DATE_PRESETS = {
    today: { label: 'Hôm nay', days: 0 },
    '7d': { label: '7 ngày', days: 7 },
    '30d': { label: '30 ngày', days: 30 },
    '90d': { label: '90 ngày', days: 90 },
} as const;
