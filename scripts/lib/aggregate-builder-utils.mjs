/**
 * Utility functions for marketing aggregate rebuild scripts.
 */

/**
 * Parse CLI arguments with flags.
 */
export function parseArgs(args) {
    const getArgValue = (flag) => {
        const idx = args.indexOf(flag);
        return idx !== -1 ? args[idx + 1] : null;
    };

    return {
        company: getArgValue('--company'),
        startDate: getArgValue('--start') ? new Date(getArgValue('--start')) : null,
        endDate: getArgValue('--end') ? new Date(getArgValue('--end')) : null,
    };
}

/**
 * Validate date configuration.
 */
export function validateDates(config) {
    if (config.startDate && isNaN(config.startDate.getTime())) {
        throw new Error('Invalid start date format. Use YYYY-MM-DD');
    }
    if (config.endDate && isNaN(config.endDate.getTime())) {
        throw new Error('Invalid end date format. Use YYYY-MM-DD');
    }

    // Ensure end date includes full day
    if (config.endDate) {
        config.endDate.setHours(23, 59, 59, 999);
    }

    return config;
}

/**
 * Build Prisma date filter object.
 */
export function buildDateFilter(startDate, endDate) {
    const filter = {};
    if (startDate) filter.gte = startDate;
    if (endDate) filter.lte = endDate;
    return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Compute summary aggregates from entries.
 */
export function computeSummary(entries) {
    return entries.reduce((acc, e) => ({
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
    }), {
        totalLead: 0,
        spam: 0,
        potential: 0,
        quality: 0,
        booked: 0,
        arrived: 0,
        closed: 0,
        bill: 0,
        budgetTarget: 0,
        budgetActual: 0,
    });
}

/**
 * Group entries by date.
 */
export function groupByDate(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const dateKey = entry.date.toISOString().split('T')[0];
        if (!groups.has(dateKey)) {
            groups.set(dateKey, []);
        }
        groups.get(dateKey).push(entry);
    }
    return groups;
}

/**
 * Group entries by date and channel.
 */
export function groupByDateAndChannel(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const dateKey = entry.date.toISOString().split('T')[0];
        const key = `${dateKey}:${entry.channel}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(entry);
    }
    return groups;
}

/**
 * Group entries by date, channel, and campaignName.
 */
export function groupByDateChannelAndCampaign(entries) {
    const groups = new Map();
    for (const entry of entries) {
        const dateKey = entry.date.toISOString().split('T')[0];
        const key = `${dateKey}:${entry.channel}:${entry.campaignName}`;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(entry);
    }
    return groups;
}

/**
 * Insert data in batches.
 */
export async function batchInsert(model, data, batchSize = 100) {
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await model.createMany({ data: batch, skipDuplicates: true });
    }
}

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
