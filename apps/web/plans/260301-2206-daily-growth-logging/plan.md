# Plan — Daily Growth Logging for Aggregate Tables

- Status: pending
- Context: `/Users/lucasbraci/Desktop/Antigravity/projects/S Group/marketing/app`
- Goal: Show daily growth comparison (Today vs Yesterday + %) in rebuild-aggregates console output
- Brainstorm: `apps/web/plans/reports/brainstorm-260301-2206-aggregate-daily-growth-logging.md`

## Phases

1. [Phase 01 — Add growth stats helper](./phase-01-add-growth-stats-helper.md) — pending

## Key Dependencies

None - single phase implementation.

## Success Criteria

- Console shows daily growth after each rebuild
- Percentage calculation correct (handles zero division)
- Graceful handling when <2 days of data exists

## Sample Output

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
