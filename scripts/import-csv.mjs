/**
 * Import CSV data from Google Sheets into Neon PostgreSQL
 *
 * Usage: node scripts/import-csv.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const COMPANY_MAP = {
    san_new: 'san',
    teennie_new: 'teennie',
    implant_new: 'tgil',
};

function parseVNNumber(str) {
    if (!str || str.trim() === '') return 0;
    // Remove dots (thousands separator) and spaces, replace comma with dot
    return parseFloat(str.replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '').trim()) || 0;
}

function parseDate(dateStr) {
    // DD/MM/YYYY → Date
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function parseCSV(content) {
    const lines = content.split('\n');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV with quoted fields
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch === '"') {
                inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        fields.push(current.trim());

        // Need at least 16 meaningful columns (A-P)
        if (fields.length < 6) continue;

        const dateStr = fields[0];
        if (!dateStr || dateStr === '') continue;

        const date = parseDate(dateStr);
        if (!date || isNaN(date.getTime())) continue;

        const totalLead = parseInt(fields[5]) || 0;
        // Skip rows with zero total leads (empty/summary rows)
        if (totalLead === 0 && !fields[4]) continue;

        rows.push({
            date,
            month: fields[1] || '',
            campaignId: parseInt(fields[2]) || 0,
            channel: fields[3] || '',
            campaignName: fields[4] || '',
            totalLead,
            spam: parseInt(fields[6]) || 0,
            potential: parseInt(fields[7]) || 0,
            quality: parseInt(fields[8]) || 0,
            booked: parseInt(fields[9]) || 0,
            arrived: parseInt(fields[10]) || 0,
            closed: parseInt(fields[11]) || 0,
            bill: parseVNNumber(fields[12]),
            budgetTarget: parseVNNumber(fields[13]),
            budgetActual: parseVNNumber(fields[14]),
            kpi: fields[15] ? parseVNNumber(fields[15]) : null,
        });
    }

    return rows;
}

async function importFile(filename, companyId) {
    const filepath = join(__dirname, '..', 'data', filename);
    console.log(`\n📄 Reading ${filename}...`);

    const content = readFileSync(filepath, 'utf-8');
    const rows = parseCSV(content);
    console.log(`   Parsed ${rows.length} valid rows`);

    if (rows.length === 0) {
        console.log('   ⚠️ No valid rows, skipping');
        return 0;
    }

    // Delete existing data for this company
    const deleted = await prisma.marketingEntry.deleteMany({
        where: { companyId },
    });
    console.log(`   🗑️ Deleted ${deleted.count} existing rows for ${companyId}`);

    // Insert in batches of 100
    let inserted = 0;
    const BATCH_SIZE = 100;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
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

    console.log(`   ✅ Inserted ${inserted} rows for ${companyId}`);
    return inserted;
}

async function main() {
    console.log('🚀 Marketing Data Import');
    console.log('========================\n');

    let total = 0;

    for (const [filename, companyId] of Object.entries(COMPANY_MAP)) {
        total += await importFile(`${filename}.csv`, companyId);
    }

    console.log(`\n========================`);
    console.log(`✅ Total: ${total} rows imported`);

    // Verify
    const count = await prisma.marketingEntry.count();
    console.log(`📊 DB total: ${count} rows`);

    // Show date range
    const [oldest, newest] = await Promise.all([
        prisma.marketingEntry.findFirst({ orderBy: { date: 'asc' }, select: { date: true } }),
        prisma.marketingEntry.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }),
    ]);
    console.log(`📅 Date range: ${oldest?.date?.toISOString().split('T')[0]} → ${newest?.date?.toISOString().split('T')[0]}`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('❌ Import failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
