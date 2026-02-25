#!/usr/bin/env node

/**
 * Import campaign master data (BẬT/TẮT status) from Master CSV.
 *
 * Usage: DATABASE_URL="..." node scripts/import-master.mjs
 *
 * The Master sheet has 3 tables side-by-side:
 *   Cols 0-5: SAN (ID, Kênh, Tên chiến dịch, BẬT TẮT, Ngày bắt đầu, Ngày kết thúc)
 *   Col  6:   empty separator
 *   Cols 7-12: Teennie (same structure)
 *   Col  13:  empty separator
 *   Cols 14-19: TGIL (same structure)
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    fields.push(current.trim());
    return fields;
}

function extractTable(fields, startCol) {
    const id = parseInt(fields[startCol], 10);
    if (isNaN(id) || id <= 0) return null;

    const channel = fields[startCol + 1] || '';
    const name = fields[startCol + 2] || '';
    const status = (fields[startCol + 3] || '').toUpperCase();
    const startDate = fields[startCol + 4] || '';
    const endDate = fields[startCol + 5] || '';

    if (!channel && !name) return null;

    return {
        campaignId: id,
        channel,
        name,
        status: status === 'BẬT' ? 'BẬT' : 'TẮT',
        startDate: startDate || null,
        endDate: endDate || null,
    };
}

async function main() {
    console.log('🚀 Campaign Master Import');
    console.log('========================\n');

    const csv = readFileSync('data/master.csv', 'utf-8');
    const lines = csv.split('\n').filter(l => l.trim());

    // Skip header
    const dataLines = lines.slice(1);

    const companies = [
        { id: 'san', startCol: 0, label: 'SAN' },
        { id: 'teennie', startCol: 7, label: 'Teennie' },
        { id: 'tgil', startCol: 14, label: 'TGIL' },
    ];

    // Delete all existing master data
    const deleted = await prisma.campaignMaster.deleteMany({});
    console.log(`🗑️ Deleted ${deleted.count} existing campaign master rows\n`);

    let totalInserted = 0;

    for (const company of companies) {
        const rows = [];

        for (const line of dataLines) {
            const fields = parseCSVLine(line);
            const entry = extractTable(fields, company.startCol);
            if (entry) {
                rows.push({
                    companyId: company.id,
                    ...entry,
                });
            }
        }

        if (rows.length > 0) {
            await prisma.campaignMaster.createMany({ data: rows });
            const active = rows.filter(r => r.status === 'BẬT').length;
            console.log(`📊 ${company.label}: ${rows.length} campaigns (${active} BẬT, ${rows.length - active} TẮT)`);
            totalInserted += rows.length;
        }
    }

    console.log(`\n✅ Total: ${totalInserted} campaigns imported`);

    // Verify
    const counts = await prisma.campaignMaster.groupBy({
        by: ['companyId', 'status'],
        _count: true,
    });
    console.log('\n📊 Verification:');
    for (const c of counts) {
        console.log(`   ${c.companyId} — ${c.status}: ${c._count}`);
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
