/**
 * Aggregate update functions for import scripts.
 * Simplified version for inline use in import workflows.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Rebuild aggregates for specified companies and date range.
 */
export async function rebuildAggregates(companies, startDate, endDate) {
    console.log('\n🔧 Rebuilding aggregates...');

    const rebuildPrisma = new PrismaClient();
    try {
        for (const companyId of companies) {
            console.log(`   Processing: ${companyId}`);

            // Get entries for this company/date range
            const entries = await rebuildPrisma.marketingEntry.findMany({
                where: {
                    companyId,
                    date: { gte: startDate },
                },
                orderBy: { date: 'asc' },
            });

            if (entries.length === 0) {
                console.log(`      No entries found, skipping`);
                continue;
            }

            // Delete existing aggregates in scope
            const deleteFilter = { companyId, date: { gte: startDate } };
            await Promise.all([
                rebuildPrisma.marketingSummaryDaily.deleteMany({ where: deleteFilter }),
                rebuildPrisma.marketingChannelDaily.deleteMany({ where: deleteFilter }),
                rebuildPrisma.marketingCampaignDaily.deleteMany({ where: deleteFilter }),
            ]);

            // Group by date
            const entriesByDate = new Map();
            for (const entry of entries) {
                const dateKey = entry.date.toISOString().split('T')[0];
                if (!entriesByDate.has(dateKey)) entriesByDate.set(dateKey, []);
                entriesByDate.get(dateKey).push(entry);
            }

            // Build and insert summaries
            const summaryData = [];
            for (const [dateKey, dateEntries] of entriesByDate) {
                const summary = dateEntries.reduce((acc, e) => ({
                    totalLead: acc.totalLead + (e.totalLead || 0),
                    spam: acc.spam + (e.spam || 0),
                    potential: acc.potential + (e.potential || 0),
                    quality: acc.quality + (e.quality || 0),
                    booked: acc.booked + (e.booked || 0),
                    arrived: acc.arrived + (e.arrived || 0),
                    closed: acc.closed + (e.closed || 0),
                    bill: acc.bill + Number(e.bill || 0),
                    budgetTarget: acc.budgetTarget + Number(e.budgetTarget || 0),
                    budgetActual: acc.budgetActual + Number(e.budgetActual || 0),
                }), { totalLead: 0, spam: 0, potential: 0, quality: 0, booked: 0, arrived: 0, closed: 0, bill: 0, budgetTarget: 0, budgetActual: 0 });

                summaryData.push({ companyId, date: new Date(dateKey), ...summary });
            }

            // Build and insert channel aggregates
            const channelData = [];
            const channelMap = new Map();
            for (const entry of entries) {
                const dateKey = entry.date.toISOString().split('T')[0];
                const key = `${dateKey}:${entry.channel}`;
                if (!channelMap.has(key)) channelMap.set(key, []);
                channelMap.get(key).push(entry);
            }

            for (const [key, channelEntries] of channelMap) {
                const [dateKey, channel] = key.split(':');
                const summary = channelEntries.reduce((acc, e) => ({
                    totalLead: acc.totalLead + (e.totalLead || 0),
                    spam: acc.spam + (e.spam || 0),
                    potential: acc.potential + (e.potential || 0),
                    quality: acc.quality + (e.quality || 0),
                    booked: acc.booked + (e.booked || 0),
                    arrived: acc.arrived + (e.arrived || 0),
                    closed: acc.closed + (e.closed || 0),
                    bill: acc.bill + Number(e.bill || 0),
                    budgetTarget: acc.budgetTarget + Number(e.budgetTarget || 0),
                    budgetActual: acc.budgetActual + Number(e.budgetActual || 0),
                }), { totalLead: 0, spam: 0, potential: 0, quality: 0, booked: 0, arrived: 0, closed: 0, bill: 0, budgetTarget: 0, budgetActual: 0 });

                channelData.push({ companyId, date: new Date(dateKey), channel, ...summary });
            }

            // Build and insert campaign aggregates
            const campaignData = [];
            const campaignMap = new Map();
            for (const entry of entries) {
                const dateKey = entry.date.toISOString().split('T')[0];
                const key = `${dateKey}:${entry.channel}:${entry.campaignName}`;
                if (!campaignMap.has(key)) campaignMap.set(key, []);
                campaignMap.get(key).push(entry);
            }

            for (const [key, campaignEntries] of campaignMap) {
                const [dateKey, channel, campaignName] = key.split(':');
                const summary = campaignEntries.reduce((acc, e) => ({
                    totalLead: acc.totalLead + (e.totalLead || 0),
                    spam: acc.spam + (e.spam || 0),
                    potential: acc.potential + (e.potential || 0),
                    quality: acc.quality + (e.quality || 0),
                    booked: acc.booked + (e.booked || 0),
                    arrived: acc.arrived + (e.arrived || 0),
                    closed: acc.closed + (e.closed || 0),
                    bill: acc.bill + Number(e.bill || 0),
                    budgetTarget: acc.budgetTarget + Number(e.budgetTarget || 0),
                    budgetActual: acc.budgetActual + Number(e.budgetActual || 0),
                }), { totalLead: 0, spam: 0, potential: 0, quality: 0, booked: 0, arrived: 0, closed: 0, bill: 0, budgetTarget: 0, budgetActual: 0 });

                campaignData.push({ companyId, date: new Date(dateKey), channel, campaignName, ...summary });
            }

            // Insert in batches
            const BATCH_SIZE = 100;
            for (let i = 0; i < summaryData.length; i += BATCH_SIZE) {
                const batch = summaryData.slice(i, i + BATCH_SIZE);
                await rebuildPrisma.marketingSummaryDaily.createMany({ data: batch, skipDuplicates: true });
            }
            for (let i = 0; i < channelData.length; i += BATCH_SIZE) {
                const batch = channelData.slice(i, i + BATCH_SIZE);
                await rebuildPrisma.marketingChannelDaily.createMany({ data: batch, skipDuplicates: true });
            }
            for (let i = 0; i < campaignData.length; i += BATCH_SIZE) {
                const batch = campaignData.slice(i, i + BATCH_SIZE);
                await rebuildPrisma.marketingCampaignDaily.createMany({ data: batch, skipDuplicates: true });
            }

            console.log(`      Created: ${summaryData.length} summary, ${channelData.length} channel, ${campaignData.length} campaign rows`);
        }
        console.log('✅ Aggregates rebuilt');
    } finally {
        await rebuildPrisma.$disconnect();
    }
}
