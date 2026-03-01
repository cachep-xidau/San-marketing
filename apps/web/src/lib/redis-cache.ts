/**
 * Redis cache client with graceful fallback.
 *
 * Uses ioredis with connection pooling. Falls back to no-cache
 * when Redis unavailable (log warning, continue operation).
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;
let isRedisAvailable = false;

if (REDIS_URL) {
    try {
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            lazyConnect: true,
        });

        redis.on('connect', () => {
            isRedisAvailable = true;
            console.log('[Redis] Connected');
        });

        redis.on('error', (err) => {
            isRedisAvailable = false;
            console.warn('[Redis] Error (caching disabled):', err.message);
        });

        redis.on('close', () => {
            isRedisAvailable = false;
            console.warn('[Redis] Connection closed (caching disabled)');
        });
    } catch (err) {
        console.warn('[Redis] Failed to initialize:', err);
        redis = null;
    }
} else {
    console.warn('[Redis] REDIS_URL not set, caching disabled');
}

export interface CacheOptions {
    ttl?: number;
}

export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
): Promise<T> {
    if (!redis || !isRedisAvailable) {
        return fetcher();
    }

    const ttl = options.ttl ?? 600;

    try {
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached) as T;
        }
    } catch (err) {
        console.warn('[Redis] GET failed:', err);
    }

    const data = await fetcher();

    try {
        await redis.setex(key, ttl, JSON.stringify(data));
    } catch (err) {
        console.warn('[Redis] SET failed:', err);
    }

    return data;
}

export async function invalidateCache(pattern: string): Promise<void> {
    if (!redis || !isRedisAvailable) {
        return;
    }

    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(keys);
            console.log(`[Redis] Invalidated ${keys.length} keys matching: ${pattern}`);
        }
    } catch (err) {
        console.warn('[Redis] Invalidation failed:', err);
    }
}

export async function invalidateKey(key: string): Promise<void> {
    if (!redis || !isRedisAvailable) {
        return;
    }

    try {
        await redis.del(key);
    } catch (err) {
        console.warn('[Redis] Key deletion failed:', err);
    }
}

export { redis, isRedisAvailable };
