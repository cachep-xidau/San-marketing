/**
 * Cache key builders for marketing endpoints.
 *
 * Pattern: marketing:{endpoint}:{companyId}:{startDate}:{endDate}
 * All keys prefixed with 'marketing:' for easy pattern-based invalidation.
 */

export const CACHE_PREFIX = 'marketing';
export const CACHE_VERSION = 'v2';

export function buildSummaryKey(
    companyId: string | null | undefined,
    startDate: string | null | undefined,
    endDate: string | null | undefined
): string {
    return [
        CACHE_PREFIX,
        CACHE_VERSION,
        'summary',
        companyId ?? 'all',
        startDate ?? '',
        endDate ?? '',
    ].join(':');
}

export function buildTrendKey(
    companyId: string | null | undefined,
    startDate: string | null | undefined,
    endDate: string | null | undefined
): string {
    return [
        CACHE_PREFIX,
        CACHE_VERSION,
        'trend',
        companyId ?? 'all',
        startDate ?? '',
        endDate ?? '',
    ].join(':');
}

export function buildChannelsKey(
    companyId: string | null | undefined,
    startDate: string | null | undefined,
    endDate: string | null | undefined
): string {
    return [
        CACHE_PREFIX,
        CACHE_VERSION,
        'channels',
        companyId ?? 'all',
        startDate ?? '',
        endDate ?? '',
    ].join(':');
}

export function buildCampaignsKey(
    companyId: string | null | undefined,
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    limit?: number,
    offset?: number
): string {
    return [
        CACHE_PREFIX,
        CACHE_VERSION,
        'campaigns',
        companyId ?? 'all',
        startDate ?? '',
        endDate ?? '',
        limit ?? '100',
        offset ?? '0',
    ].join(':');
}

export function buildMasterStatusKey(companyId: string | null | undefined): string {
    return [CACHE_PREFIX, CACHE_VERSION, 'master-status', companyId ?? 'all'].join(':');
}

export function buildInvalidationPattern(
    companyId?: string,
    startDate?: string,
    endDate?: string
): string {
    const parts = [`${CACHE_PREFIX}:*`];
    if (companyId) {
        parts.push(`:${companyId}:`);
    }
    return parts.join('');
}
