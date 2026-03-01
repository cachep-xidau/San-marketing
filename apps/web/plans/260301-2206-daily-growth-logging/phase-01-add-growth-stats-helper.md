# Phase 01 — Add Growth Stats Helper

## Overview
- Priority: P1
- Status: pending
- Brief: Add helper functions to query aggregate tables and display daily growth comparison

## Related Code Files

### Modify
- `scripts/lib/aggregate-builder-utils.mjs` - Add `getDailyGrowthStats()` and `printDailyGrowthReport()`
- `scripts/rebuild-aggregates.mjs` - Add call to growth report

## Implementation Steps

### Step 1: Add `getDailyGrowthStats()` function

Add to `scripts/lib/aggregate-builder-utils.mjs`:

```javascript
/**
 * Get daily growth stats for aggregate tables.
 * Compares row counts for latest 2 dates.
 * @param {PrismaClient} prisma
 * @returns {Promise<object|null>} Growth stats or null if insufficient data
 */
export async function getDailyGrowthStats(prisma) {
    // Get latest 2 dates from any aggregate table (use SummaryDaily as reference)
    const dates = await prisma.marketingSummaryDaily.findMany({
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' },
        take: 2
    });

    if (dates.length < 2) {
        return null; // Not enough data for comparison
    }

    const [today, yesterday] = dates.map(d => d.date);

    // Query all 3 tables in parallel
    const [
        summaryToday, summaryYesterday,
        channelToday, channelYesterday,
        campaignToday, campaignYesterday
    ] = await Promise.all([
        // Summary counts
        prisma.marketingSummaryDaily.count({ where: { date: today } }),
        prisma.marketingSummaryDaily.count({ where: { date: yesterday } }),
        // Channel counts
        prisma.marketingChannelDaily.count({ where: { date: today } }),
        prisma.marketingChannelDaily.count({ where: { date: yesterday } }),
        // Campaign counts
        prisma.marketingCampaignDaily.count({ where: { date: today } }),
        prisma.marketingCampaignDaily.count({ where: { date: yesterday } }),
    ]);

    return {
        today: today.toISOString().split('T')[0],
        yesterday: yesterday.toISOString().split('T')[0],
        summary: { today: summaryToday, yesterday: summaryYesterday },
        channel: { today: channelToday, yesterday: channelYesterday },
        campaign: { today: campaignToday, yesterday: campaignYesterday }
    };
}
```

### Step 2: Add `printDailyGrowthReport()` function

Add to `scripts/lib/aggregate-builder-utils.mjs`:

```javascript
/**
 * Print daily growth report to console.
 * @param {object|null} stats - Growth stats from getDailyGrowthStats()
 */
export function printDailyGrowthReport(stats) {
    if (!stats) {
        console.log('📊 Daily Growth: Not enough data for comparison (need 2+ days)\n');
        return;
    }

    const calcDelta = (today, yesterday) => {
        const delta = today - yesterday;
        const pct = yesterday > 0 ? ((delta / yesterday) * 100).toFixed(1) : 'N/A';
        const sign = delta >= 0 ? '+' : '';
        return { delta, pct: `${sign}${pct}%` };
    };

    console.log('\n📊 Daily Growth Report');
    console.log('========================');
    console.log(`Today: ${stats.today} | Yesterday: ${stats.yesterday}\n`);

    const tables = [
        { name: 'MarketingSummaryDaily', data: stats.summary },
        { name: 'MarketingChannelDaily', data: stats.channel },
        { name: 'MarketingCampaignDaily', data: stats.campaign }
    ];

    for (const table of tables) {
        const d = calcDelta(table.data.today, table.data.yesterday);
        console.log(`${table.name}:`);
        console.log(`  Today: ${table.data.today} | Yesterday: ${table.data.yesterday} | Delta: ${d.delta >= 0 ? '+' : ''}${d.delta} (${d.pct})`);
    }
    console.log('');
}
```

### Step 3: Integrate into rebuild-aggregates.mjs

Add after line 75 (after existing stats output, before cache invalidation):

```javascript
    // Show daily growth comparison
    const growthStats = await getDailyGrowthStats(prisma);
    printDailyGrowthReport(growthStats);
```

Also add import at top:
```javascript
import { parseArgs, validateDates, getDailyGrowthStats, printDailyGrowthReport } from './lib/aggregate-builder-utils.mjs';
```

## Todo List

- [ ] Add `getDailyGrowthStats()` to aggregate-builder-utils.mjs
- [ ] Add `printDailyGrowthReport()` to aggregate-builder-utils.mjs
- [ ] Update import in rebuild-aggregates.mjs
- [ ] Add growth report call in rebuild-aggregates.mjs
- [ ] Test with `node scripts/rebuild-aggregates.mjs`

## Success Criteria

- Console shows daily growth after each rebuild
- Percentage calculation handles zero division (shows "N/A")
- Graceful output when <2 days of data exists
- No errors during normal operation

## Risk Assessment

- **Low Risk**: Only adds read queries, doesn't modify data
- **Fallback**: If query fails, catch and show "N/A" gracefully
