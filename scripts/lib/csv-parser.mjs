/**
 * CSV parsing utilities for marketing data import.
 */

export function parseVNNumber(str) {
    if (!str || str.trim() === '') return 0;
    return parseFloat(str.replace(/\./g, '').replace(/,/g, '.').replace(/\s/g, '').trim()) || 0;
}

export function parseDate(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    if (!year || year.length !== 4) return null;
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
}

export function parseCSV(content) {
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
        if (!dateStr || dateStr === '') continue;

        const date = parseDate(dateStr);
        if (!date || isNaN(date.getTime())) continue;

        const totalLead = parseInt(fields[5]) || 0;
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
