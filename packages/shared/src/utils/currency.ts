/**
 * Format VND currency with Vietnamese conventions
 * Example: 1500000 → "1.500.000 ₫"
 */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format compact VND (for dashboard cards)
 * Example: 1500000 → "1,5M ₫", 150000 → "150K ₫"
 */
export function formatVNDCompact(amount: number): string {
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')}B ₫`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1).replace('.0', '')}M ₫`;
    }
    if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(0)}K ₫`;
    }
    return formatVND(amount);
}

/**
 * Format percentage
 * Example: 0.1534 → "15.3%"
 */
export function formatPercent(value: number, decimals = 1): string {
    return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number with Vietnamese locale
 */
export function formatNumber(n: number): string {
    return new Intl.NumberFormat('vi-VN').format(n);
}
