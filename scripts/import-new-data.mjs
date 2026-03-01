/**
 * Append NEW data (2026+) from CSV files to the database.
 *
 * Unlike import-csv.mjs (full refresh), this script:
 *   1. Reads each CSV file
 *   2. Filters rows where date >= CUTOFF_DATE (default: 2026-01-01)
 *   3. Deletes only rows in that date range per company (idempotent)
 *   4. Inserts the new rows in batches
 *   5. Rebuilds aggregates for affected date range
 *
 * Usage: DATABASE_URL="..." node scripts/import-new-data.mjs
 *        DATABASE_URL="..." node scripts/import-new-data.mjs --cutoff 2026-02-01
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@marketing-hub/db';
import { parseCSV } from './lib/csv-parser.mjs';
import { rebuildAggregates } from './lib/aggregate-updater.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const COMPANY_MAP = {
    san_new: 'san',
    teennie_new: 'teennie',
    implant_new: 'tgil',
};

// Parse --cutoff argument or default to 2026-01-01
const cutoffArg = process.argv.find((a, i) => process.argv[i - 1] === '--cutoff');
const CUTOFF_DATE = cutoffArg ? new Date(cutoffArg) : new Date('2026-01-01');

async function importNewData(filename, companyId) {
    const filepath = join(__dirname, '..', 'data', filename);
    console.log(`\n📄 Reading ${filename}...`);

    const content = readFileSync(filepath, 'utf-8');
    const allRows = parseCSV(content);
    console.log(`   Total parsed: ${allRows.length} rows`);

    // Filter only rows >= cutoff date
    const newRows = allRows.filter(r => r.date >= CUTOFF_DATE);
    console.log(`   New rows (>= ${CUTOFF_DATE.toISOString().split('T')[0]}): ${newRows.length}`);

    if (newRows.length === 0) {
        console.log('   ⚠️ No new rows to import, skipping');
        return 0;
    }

    // Delete only the date range we're about to insert (idempotent)
    const deleted = await prisma.marketingEntry.deleteMany({
        where: {
            companyId,
            date: { gte: CUTOFF_DATE },
        },
    });
    console.log(`   🗑️ Deleted ${deleted.count} existing rows for ${companyId} (>= ${CUTOFF_DATE.toISOString().split('T')[0]})`);

    // Insert in batches
    let inserted = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batch = newRows.slice(i, i + BATCH_SIZE);
        await prisma.marketingEntry.createMany({
            data: batch.map(row => ({
                companyId,
                date: row.date,
                month: row.month,
                campaignId: row.campaignId,
                channel: row.channel,
                campaignName: row.campaignName,
                totalLead: row.totalLead,
                spam: row.spam,
                potential: row.potential,
                quality: row.quality,
                booked: row.booked,
                arrived: row.arrived,
                closed: row.closed,
                bill: row.bill,
                budgetTarget: row.budgetTarget,
                budgetActual: row.budgetActual,
                kpi: row.kpi,
            })),
        });
        inserted += batch.length;
    }

    console.log(`   ✅ Inserted ${inserted} new rows for ${companyId}`);
    return inserted;
}

async function main() {
    console.log('🚀 Marketing Data — Append New Data');
    console.log(`📅 Cutoff date: ${CUTOFF_DATE.toISOString().split('T')[0]}`);
    console.log('====================================\n');

    // Show existing DB state
    const existingCount = await prisma.marketingEntry.count();
    console.log(`📊 DB before: ${existingCount} total rows`);

    let totalNew = 0;

    for (const [filename, companyId] of Object.entries(COMPANY_MAP)) {
        totalNew += await importNewData(`${filename}.csv`, companyId);
    }

    console.log(`\n====================================`);
    console.log(`✅ Appended ${totalNew} new rows`);

    // Verify final state
    const finalCount = await prisma.marketingEntry.count();
    console.log(`📊 DB after: ${finalCount} total rows`);

    // Show date range per company
    const companies = ['san', 'teennie', 'tgil'];
    for (const c of companies) {
        const [oldest, newest, count] = await Promise.all([
            prisma.marketingEntry.findFirst({ where: { companyId: c }, orderBy: { date: 'asc' }, select: { date: true } }),
            prisma.marketingEntry.findFirst({ where: { companyId: c }, orderBy: { date: 'desc' }, select: { date: true } }),
            prisma.marketingEntry.count({ where: { companyId: c } }),
        ]);
        console.log(`   ${c}: ${count} rows (${oldest?.date?.toISOString().split('T')[0]} → ${newest?.date?.toISOString().split('T')[0]})`);
    }

    // Rebuild aggregates for affected companies/date range
    if (totalNew > 0) {
        await rebuildAggregates(Object.values(COMPANY_MAP), CUTOFF_DATE);
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Import failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
