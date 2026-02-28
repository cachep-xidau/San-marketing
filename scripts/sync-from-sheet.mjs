/**
 * Download CSV data from Google Sheets (gviz export).
 *
 * Tabs: SAN_NEW → san_new.csv, TGIL_NEW → implant_new.csv,
 *       TEENNIE_NEW → teennie_new.csv, Master → master.csv
 *
 * Usage: node scripts/sync-from-sheet.mjs
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const SHEET_ID = '1eh3PNUaut5PcrAep9yIdGo-xmrCl5V9HCkXugQKXP6I';

const TABS = [
    { sheet: 'SAN_NEW', file: 'san_new.csv' },
    { sheet: 'TGIL_NEW', file: 'implant_new.csv' },
    { sheet: 'TEENNIE_NEW', file: 'teennie_new.csv' },
    { sheet: 'Master', file: 'master.csv' },
];

function download(url) {
    return new Promise((resolve, reject) => {
        const follow = (u) => {
            https.get(u, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    follow(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} for ${u}`));
                    return;
                }
                let data = '';
                res.on('data', (chunk) => (data += chunk));
                res.on('end', () => resolve(data));
                res.on('error', reject);
            }).on('error', reject);
        };
        follow(url);
    });
}

async function main() {
    console.log('📥 Downloading CSV data from Google Sheets');
    console.log(`   Sheet ID: ${SHEET_ID}\n`);

    for (const { sheet, file } of TABS) {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
        process.stdout.write(`   ${sheet} → ${file} ... `);

        try {
            const csv = await download(url);
            const lines = csv.split('\n').filter((l) => l.trim()).length;
            const filepath = join(DATA_DIR, file);
            writeFileSync(filepath, csv, 'utf-8');
            console.log(`✅ ${lines} lines`);
        } catch (err) {
            console.log(`❌ ${err.message}`);
            process.exit(1);
        }
    }

    console.log('\n✅ All CSV files downloaded successfully');
}

main();
