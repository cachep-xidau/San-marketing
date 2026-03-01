#!/usr/bin/env node

/**
 * Rebuild marketing aggregate tables from raw MarketingEntry data.
 *
 * This script:
 *   1. Accepts company scope and optional date range
 *   2. Deletes existing aggregate rows in impacted range (idempotent)
 *   3. Recomputes aggregates from MarketingEntry
 *   4. Upserts into read-model tables
 *
 * Usage: DATABASE_URL="..." node scripts/rebuild-aggregates.mjs
 *        DATABASE_URL="..." node scripts/rebuild-aggregates.mjs --company san
 *        DATABASE_URL="..." node scripts/rebuild-aggregates.mjs --company san --start 2026-01-01 --end 2026-01-31
 *
 * Available companies: san, teennie, tgil
 */

import { PrismaClient } from '@prisma/client';
import { parseArgs, validateDates, getDailyGrowthStats, printDailyGrowthReport } from './lib/aggregate-builder-utils.mjs';
import { acquireLock, releaseLock, setupLockCleanup } from './lib/aggregate-lock-guard.mjs';
import { rebuildAggregatesForCompany } from './lib/aggregate-rebuilder.mjs';
import { createRedisClient, invalidateMarketingCache } from './lib/cache-invalidator.mjs';

const prisma = new PrismaClient();

// Parse and validate CLI arguments
const config = validateDates(parseArgs(process.argv.slice(2)));

// Get company scope
const companies = config.company ? [config.company] : ['san', 'teennie', 'tgil'];

// Main execution
async function main() {
    const startTime = Date.now();

    console.log('🔧 Marketing Aggregates Rebuild');
    console.log('===============================\n');
    console.log(`Company: ${config.company || 'ALL'}`);
    console.log(`Date range: ${config.startDate?.toISOString().split('T')[0] || 'ALL'} → ${config.endDate?.toISOString().split('T')[0] || 'ALL'}`);
    console.log('');

    acquireLock();
    setupLockCleanup();

    const stats = {
        scanned: 0,
        summaryRows: 0,
        channelRows: 0,
        campaignRows: 0,
    };

    for (const companyId of companies) {
        console.log(`📊 Processing: ${companyId}`);
        const result = await rebuildAggregatesForCompany(
            prisma,
            companyId,
            config.startDate,
            config.endDate
        );
        stats.scanned += result.scanned;
        stats.summaryRows += result.summaryRows;
        stats.channelRows += result.channelRows;
        stats.campaignRows += result.campaignRows;
        console.log(`   Scanned: ${result.scanned} entries`);
        console.log(`   Created: ${result.summaryRows} summary, ${result.channelRows} channel, ${result.campaignRows} campaign rows\n`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('===============================');
    console.log('✅ Rebuild Complete');
    console.log(`Duration: ${duration}s`);
    console.log(`Total Scanned: ${stats.scanned} entries`);
    console.log(`Total Created: ${stats.summaryRows} summary, ${stats.channelRows} channel, ${stats.campaignRows} campaign rows`);

    // Show daily growth comparison
    const growthStats = await getDailyGrowthStats(prisma);
    printDailyGrowthReport(growthStats);

    // Invalidate cache for affected scope
    console.log('\n🔄 Invalidating cache...');
    const redis = await createRedisClient();
    const invalidatedCount = await invalidateMarketingCache(
        redis,
        config.company,
        config.startDate?.toISOString().split('T')[0],
        config.endDate?.toISOString().split('T')[0]
    );
    if (redis) {
        await redis.quit();
    }
    console.log(`✅ Cache invalidation complete: ${invalidatedCount} keys cleared`);

    // Emit structured summary for logs
    const summary = {
        timestamp: new Date().toISOString(),
        scope: config.company || 'ALL',
        dateRange: {
            start: config.startDate?.toISOString() || 'ALL',
            end: config.endDate?.toISOString() || 'ALL',
        },
        stats: {
            scanned: stats.scanned,
            summaryRows: stats.summaryRows,
            channelRows: stats.channelRows,
            campaignRows: stats.campaignRows,
            totalRows: stats.summaryRows + stats.channelRows + stats.campaignRows,
        },
        duration: `${duration}s`,
    };

    console.log('\n📋 Sync Summary:');
    console.log(JSON.stringify(summary, null, 2));

    releaseLock();
}

main()
    .catch(e => {
        console.error('\n❌ Rebuild failed:', e);
        releaseLock();
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
