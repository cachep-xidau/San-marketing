/**
 * Verify DB vs CSV data consistency for 2026 data.
 *
 * Checks:
 *   1. Row counts per company + month
 *   2. Key metrics match per (company, date, campaignId, campaignName)
 *   3. Reports: missing in DB, extra in DB, value mismatches
 *
 * Usage: DATABASE_URL="..." node scripts/verify-data.mjs
 *        DATABASE_URL="..." node scripts/verify-data.mjs --cutoff 2026-02-01
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const cutoffArg = process.argv.find((a, i) => process.argv[i - 1] === '--cutoff');
const CUTOFF_DATE = cutoffArg ? new Date(cutoffArg) : new Date('2026-01-01');

const COMPANY_MAP = {
    san_new: 'san',
    teennie_new: 'teennie',
    implant_new: 'tgil',
};

// --- CSV Parsing (reused from import-csv.mjs) ---

function parseVNNumber(str) {
    if (!str || str.trim() === '') return 0;
    return parseFloat(str.replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '').trim()) || 0;
}

function parseDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (!year || year.length !== 4) return null;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function parseCSV(content) {
    const lines = content.split('\n');
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

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

        if (fields.length < 6) continue;
        const dateStr = fields[0];
        if (!dateStr) continue;

        const date = parseDate(dateStr);
        if (!date || isNaN(date.getTime())) continue;

        const totalLead = parseInt(fields[5]) || 0;
        if (totalLead === 0 && !fields[4]) continue;

        rows.push({
            date,
            month: fields[1] || '',
            campaignId: parseInt(fields[2]) || 0,
            campaignName: fields[4] || '',
            channel: fields[3] || '',
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
        });
    }

    return rows;
}

// --- Comparison logic ---

function makeKey(row) {
    const dateStr = row.date instanceof Date
        ? row.date.toISOString().split('T')[0]
        : new Date(row.date).toISOString().split('T')[0];
    return `${dateStr}|${row.campaignId}|${row.campaignName}`;
}

function compareMetrics(csvRow, dbRow) {
    const diffs = [];
    const fields = ['totalLead', 'spam', 'potential', 'quality', 'booked', 'arrived', 'closed'];

    for (const f of fields) {
        const csvVal = csvRow[f] || 0;
        const dbVal = dbRow[f] || 0;
        if (csvVal !== dbVal) {
            diffs.push(`${f}: CSV=${csvVal} DB=${dbVal}`);
        }
    }

    // Decimal fields — compare with tolerance
    const decimalFields = ['bill', 'budgetTarget', 'budgetActual'];
    for (const f of decimalFields) {
        const csvVal = csvRow[f] || 0;
        const dbVal = parseFloat(dbRow[f]) || 0;
        if (Math.abs(csvVal - dbVal) > 0.01) {
            diffs.push(`${f}: CSV=${csvVal} DB=${dbVal}`);
        }
    }

    return diffs;
}

async function verifyCompany(filename, companyId) {
    const filepath = join(__dirname, '..', 'data', filename);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 ${companyId.toUpperCase()} — ${filename}`);
    console.log('='.repeat(60));

    // 1. Parse CSV and filter to >= cutoff
    const content = readFileSync(filepath, 'utf-8');
    const allRows = parseCSV(content);
    const csvRows = allRows.filter(r => r.date >= CUTOFF_DATE);
    console.log(`\n📊 CSV rows (>= ${CUTOFF_DATE.toISOString().split('T')[0]}): ${csvRows.length}`);

    // 2. Query DB for same range
    const dbRows = await prisma.marketingEntry.findMany({
        where: {
            companyId,
            date: { gte: CUTOFF_DATE },
        },
        orderBy: [{ date: 'asc' }, { campaignId: 'asc' }],
    });
    console.log(`📊 DB rows:  ${dbRows.length}`);

    // 3. Row count check
    if (csvRows.length === dbRows.length) {
        console.log(`✅ Row count matches: ${csvRows.length}`);
    } else {
        console.log(`❌ Row count MISMATCH: CSV=${csvRows.length} DB=${dbRows.length} (diff=${csvRows.length - dbRows.length})`);
    }

    // 4. Build maps for detailed comparison
    const csvMap = new Map();
    const csvDupeKeys = [];
    for (const row of csvRows) {
        const key = makeKey(row);
        if (csvMap.has(key)) {
            // Handle duplicate keys in CSV — append index
            csvDupeKeys.push(key);
            csvMap.set(key + `|dup${csvDupeKeys.filter(k => k === key).length}`, row);
        } else {
            csvMap.set(key, row);
        }
    }

    const dbMap = new Map();
    const dbDupeKeys = [];
    for (const row of dbRows) {
        const key = makeKey(row);
        if (dbMap.has(key)) {
            dbDupeKeys.push(key);
            dbMap.set(key + `|dup${dbDupeKeys.filter(k => k === key).length}`, row);
        } else {
            dbMap.set(key, row);
        }
    }

    if (csvDupeKeys.length > 0) {
        console.log(`⚠️  ${csvDupeKeys.length} duplicate keys in CSV (same date+campaign+name)`);
    }

    // 5. Find mismatches
    let missingInDB = 0;
    let missingInCSV = 0;
    let mismatches = 0;
    let matched = 0;
    const mismatchDetails = [];

    for (const [key, csvRow] of csvMap) {
        if (key.includes('|dup')) continue; // skip dupes for now
        const dbRow = dbMap.get(key);
        if (!dbRow) {
            missingInDB++;
            if (missingInDB <= 5) {
                console.log(`   ❌ Missing in DB: ${key}`);
            }
        } else {
            const diffs = compareMetrics(csvRow, dbRow);
            if (diffs.length > 0) {
                mismatches++;
                if (mismatches <= 5) {
                    mismatchDetails.push({ key, diffs });
                }
            } else {
                matched++;
            }
        }
    }

    for (const [key] of dbMap) {
        if (key.includes('|dup')) continue;
        if (!csvMap.has(key)) {
            missingInCSV++;
            if (missingInCSV <= 5) {
                console.log(`   ❌ Extra in DB (not in CSV): ${key}`);
            }
        }
    }

    // 6. Summary
    console.log(`\n--- ${companyId.toUpperCase()} Summary ---`);
    console.log(`✅ Matched:        ${matched}`);
    if (missingInDB > 0) console.log(`❌ Missing in DB:  ${missingInDB}`);
    else console.log(`✅ Missing in DB:  0`);
    if (missingInCSV > 0) console.log(`❌ Extra in DB:    ${missingInCSV}`);
    else console.log(`✅ Extra in DB:    0`);
    if (mismatches > 0) {
        console.log(`⚠️  Value mismatch: ${mismatches}`);
        for (const m of mismatchDetails) {
            console.log(`   → ${m.key}: ${m.diffs.join(', ')}`);
        }
    } else {
        console.log(`✅ Value mismatch: 0`);
    }

    // 7. Month breakdown
    const csvByMonth = {};
    const dbByMonth = {};
    for (const r of csvRows) { csvByMonth[r.month] = (csvByMonth[r.month] || 0) + 1; }
    for (const r of dbRows) { dbByMonth[r.month] = (dbByMonth[r.month] || 0) + 1; }

    const allMonths = [...new Set([...Object.keys(csvByMonth), ...Object.keys(dbByMonth)])].sort();
    console.log(`\n   Month      | CSV  | DB   | Match`);
    console.log(`   -----------|------|------|------`);
    for (const m of allMonths) {
        const c = csvByMonth[m] || 0;
        const d = dbByMonth[m] || 0;
        const ok = c === d ? '✅' : '❌';
        console.log(`   ${m.padEnd(10)} | ${String(c).padStart(4)} | ${String(d).padStart(4)} | ${ok}`);
    }

    return { matched, missingInDB, missingInCSV, mismatches };
}

async function main() {
    console.log('🔍 Marketing Data Verification — DB vs CSV');
    console.log(`📅 Checking data >= ${CUTOFF_DATE.toISOString().split('T')[0]}`);
    console.log('============================================');

    // Overall DB count
    const totalDB = await prisma.marketingEntry.count();
    const total2026DB = await prisma.marketingEntry.count({ where: { date: { gte: CUTOFF_DATE } } });
    console.log(`📊 DB total: ${totalDB} rows (2026+: ${total2026DB})`);

    const totals = { matched: 0, missingInDB: 0, missingInCSV: 0, mismatches: 0 };

    for (const [filename, companyId] of Object.entries(COMPANY_MAP)) {
        const result = await verifyCompany(`${filename}.csv`, companyId);
        totals.matched += result.matched;
        totals.missingInDB += result.missingInDB;
        totals.missingInCSV += result.missingInCSV;
        totals.mismatches += result.mismatches;
    }

    // Final verdict
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 FINAL VERDICT`);
    console.log('='.repeat(60));
    console.log(`✅ Matched:        ${totals.matched}`);
    console.log(`❌ Missing in DB:  ${totals.missingInDB}`);
    console.log(`❌ Extra in DB:    ${totals.missingInCSV}`);
    console.log(`⚠️  Value mismatch: ${totals.mismatches}`);

    const allGood = totals.missingInDB === 0 && totals.missingInCSV === 0 && totals.mismatches === 0;
    console.log(`\n${allGood ? '🎉 ALL CHECKS PASSED — DB and CSV are in sync!' : '⚠️  DISCREPANCIES FOUND — review details above'}`);

    await prisma.$disconnect();
    process.exit(allGood ? 0 : 1);
}

main().catch(e => {
    console.error('❌ Verification failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
