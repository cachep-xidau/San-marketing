/**
 * Cache invalidation utilities for marketing data sync.
 *
 * Invalidates Redis cache keys after aggregate rebuild.
 * Uses pattern-based invalidation for efficiency.
 */

/**
 * Build invalidation pattern for a company/date scope.
 */
export function buildInvalidationPattern(companyId, startDate, endDate) {
    const parts = ['marketing:*'];
    if (companyId) {
        parts.push(`:${companyId}:`);
    }
    if (startDate && !endDate) {
        parts.push(`:${startDate}:`);
    }
    return parts.join('');
}

/**
 * Invalidate marketing cache for given scope.
 *
 * @param {Object} redis - Redis client instance
 * @param {string} companyId - Optional company filter
 * @param {string} startDate - Optional start date
 * @param {string} endDate - Optional end date
 * @returns {Promise<number>} Number of keys invalidated
 */
export async function invalidateMarketingCache(redis, companyId, startDate, endDate) {
    if (!redis) {
        console.log('[Cache] Redis client not available, skipping cache invalidation');
        return 0;
    }

    try {
        const pattern = buildInvalidationPattern(companyId, startDate, endDate);
        const keys = await redis.keys(pattern);

        if (keys.length === 0) {
            console.log(`[Cache] No keys found matching pattern: ${pattern}`);
            return 0;
        }

        await redis.del(...keys);
        console.log(`[Cache] Invalidated ${keys.length} keys for scope: ${companyId || 'ALL'}`);

        return keys.length;
    } catch (err) {
        console.warn('[Cache] Invalidation failed:', err.message);
        return 0;
    }
}

/**
 * Create Redis client for cache invalidation.
 *
 * @returns {Promise<import('ioredis').Redis|null>} Redis client or null if REDIS_URL not set
 */
export async function createRedisClient() {
    const REDIS_URL = process.env.REDIS_URL;
    if (!REDIS_URL) {
        console.warn('[Cache] REDIS_URL not set, cache invalidation disabled');
        return null;
    }

    try {
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });

        await redis.connect();
        console.log('[Cache] Redis client connected for invalidation');
        return redis;
    } catch (err) {
        console.warn('[Cache] Failed to create Redis client:', err.message);
        return null;
    }
}
