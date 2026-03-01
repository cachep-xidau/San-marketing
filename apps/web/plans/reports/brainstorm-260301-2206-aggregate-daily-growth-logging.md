# Brainstorm: Aggregate Daily Growth Logging

## Problem
Current rebuild-aggregates.mjs chỉ show tổng số scanned/created rows. User muốn thấy **daily growth** - so sánh số lượng records hôm nay vs hôm qua.

## Requirements
- **Scope**: Aggregate tables (MarketingSummaryDaily, MarketingChannelDaily, MarketingCampaignDaily)
- **Output**: Console log (CLI)
- **Format**: Simple delta - Today vs Yesterday + % change
- **Constraint**: No schema changes

## Chosen Approach: Query by `date` field

### Why
- Zero schema change - instant implementation
- Uses existing `date` field on all aggregate tables
- Sufficient for tracking data coverage growth

### Implementation

**1. Add helper function** in `scripts/lib/aggregate-builder-utils.mjs`:
```javascript
export async function getDailyGrowthStats(prisma) {
    // Get latest 2 dates with data
    const summaryDates = await prisma.marketingSummaryDaily.findMany({
        select: { date: true },
        distinct: ['date'],
        orderBy: { date: 'desc' },
        take: 2
    });

    if (summaryDates.length < 2) {
        return null; // Not enough data for comparison
    }

    const [today, yesterday] = summaryDates.map(d => d.date);

    // Count rows for each table on each date
    const [summaryToday, summaryYesterday] = await Promise.all([
        prisma.marketingSummaryDaily.count({ where: { date: today } }),
        prisma.marketingSummaryDaily.count({ where: { date: yesterday } })
    ]);

    const [channelToday, channelYesterday] = await Promise.all([
        prisma.marketingChannelDaily.count({ where: { date: today } }),
        prisma.marketingChannelDaily.count({ where: { date: yesterday } })
    ]);

    const [campaignToday, campaignYesterday] = await Promise.all([
        prisma.marketingCampaignDaily.count({ where: { date: today } }),
        prisma.marketingCampaignDaily.count({ where: { date: yesterday } })
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

**2. Add display function**:
```javascript
export function printDailyGrowthReport(stats) {
    if (!stats) {
        console.log('📊 Daily Growth: Not enough data for comparison\n');
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

**3. Modify rebuild-aggregates.mjs** - add call after rebuild:
```javascript
// After existing stats output, before cache invalidation:
const growthStats = await getDailyGrowthStats(prisma);
printDailyGrowthReport(growthStats);
```

### Sample Output
```
📊 Daily Growth Report
========================
Today: 2026-03-01 | Yesterday: 2026-02-28

MarketingSummaryDaily:
  Today: 3 | Yesterday: 3 | Delta: +0 (0%)

MarketingChannelDaily:
  Today: 15 | Yesterday: 12 | Delta: +3 (+25%)

MarketingCampaignDaily:
  Today: 45 | Yesterday: 38 | Delta: +7 (+18.4%)
```

## Trade-offs
| Aspect | Pros | Cons |
|--------|------|------|
| Accuracy | Shows data coverage growth | Doesn't distinguish new vs updated rows |
| Simplicity | Zero schema change | Limited to date-based comparison |
| Performance | 6 simple COUNT queries | Extra ~50-100ms |

## Risk
- **Low**: Only adds read queries, doesn't modify data
- **Fallback**: If comparison fails, show "N/A" gracefully

## Success Criteria
- Console shows daily growth after each rebuild
- Percentage calculation correct (handles zero division)
- No errors when only 1 day of data exists

## Next Steps
1. Implement helper functions in `aggregate-builder-utils.mjs`
2. Add growth report call to `rebuild-aggregates.mjs`
3. Test with existing data

---

**Unresolved Questions**: None
