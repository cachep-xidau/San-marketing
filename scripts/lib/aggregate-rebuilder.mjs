/**
 * Core aggregate rebuilding logic.
 */

import {
    computeSummary,
    groupByDate,
    groupByDateAndChannel,
    groupByDateChannelAndCampaign,
    batchInsert,
} from './aggregate-builder-utils.mjs';

/**
 * Rebuild all aggregate types for a company.
 */
export async function rebuildAggregatesForCompany(prisma, companyId, startDate, endDate) {
    const dateFilter = startDate || endDate
        ? { date: { gte: startDate, lte: endDate } }
        : undefined;

    // Get all entries for this company/date range
    const entries = await prisma.marketingEntry.findMany({
        where: {
            companyId,
            ...(dateFilter && { date: dateFilter.date }),
        },
        orderBy: { date: 'asc' },
    });

    if (entries.length === 0) {
        console.log(`   No entries found for ${companyId}`);
        return { scanned: 0, summaryRows: 0, channelRows: 0, campaignRows: 0 };
    }

    // Delete existing aggregates in scope (idempotent)
    const deleteFilter = { companyId, ...(dateFilter && { date: dateFilter.date }) };

    const [deletedSummary, deletedChannel, deletedCampaign] = await Promise.all([
        prisma.marketingSummaryDaily.deleteMany({ where: deleteFilter }),
        prisma.marketingChannelDaily.deleteMany({ where: deleteFilter }),
        prisma.marketingCampaignDaily.deleteMany({ where: deleteFilter }),
    ]);

    console.log(`   Deleted: ${deletedSummary.count} summary, ${deletedChannel.count} channel, ${deletedCampaign.count} campaign rows`);

    // Build summary aggregates (per date)
    const summaryData = [];
    const entriesByDate = groupByDate(entries);

    for (const [dateKey, dateEntries] of entriesByDate) {
        const summary = computeSummary(dateEntries);
        summaryData.push({
            companyId,
            date: new Date(dateKey),
            ...summary,
        });
    }

    // Build channel aggregates (per date, channel)
    const channelData = [];
    const entriesByDateChannel = groupByDateAndChannel(entries);

    for (const [key, channelEntries] of entriesByDateChannel) {
        const [dateKey, channel] = key.split(':');
        const summary = computeSummary(channelEntries);
        channelData.push({
            companyId,
            date: new Date(dateKey),
            channel,
            ...summary,
        });
    }

    // Build campaign aggregates (per date, channel, campaignName)
    const campaignData = [];
    const entriesByCampaign = groupByDateChannelAndCampaign(entries);

    for (const [key, campaignEntries] of entriesByCampaign) {
        const [dateKey, channel, campaignName] = key.split(':');
        const summary = computeSummary(campaignEntries);
        campaignData.push({
            companyId,
            date: new Date(dateKey),
            channel,
            campaignName,
            ...summary,
        });
    }

    // Insert in batches
    await Promise.all([
        batchInsert(prisma.marketingSummaryDaily, summaryData),
        batchInsert(prisma.marketingChannelDaily, channelData),
        batchInsert(prisma.marketingCampaignDaily, campaignData),
    ]);

    return {
        scanned: entries.length,
        summaryRows: summaryData.length,
        channelRows: channelData.length,
        campaignRows: campaignData.length,
    };
}
