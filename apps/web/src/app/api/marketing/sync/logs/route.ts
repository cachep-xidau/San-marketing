import { NextResponse } from 'next/server';
import { Timer } from '@/lib/api-timing';

const GITHUB_OWNER = 'cachep-xidau';
const GITHUB_REPO = 'San-marketing';
const WORKFLOW_FILE = 'sync-data.yml';

interface WorkflowRun {
    id: number;
    status: string;
    conclusion: string | null;
    created_at: string;
    updated_at: string;
    run_started_at: string;
    html_url: string;
    jobs_url: string;
}

interface SyncDetail {
    company: string;
    inserted: number;
}

/**
 * Parse GitHub Actions job logs for sync details.
 * Looks for lines like: "✅ Inserted 438 new rows for san"
 * and "📊 DB after: 5410 total rows"
 */
function parseSyncDetails(logText: string): { details: SyncDetail[]; totalRows: number | null; totalInserted: number | null } {
    const details: SyncDetail[] = [];
    let totalRows: number | null = null;
    let totalInserted: number | null = null;

    // Match: ✅ Inserted 438 new rows for san
    const insertRegex = /Inserted (\d+) new rows for (\w+)/g;
    let match;
    while ((match = insertRegex.exec(logText)) !== null) {
        details.push({ company: match[2], inserted: parseInt(match[1]) });
    }

    // Match: ✅ Appended 1021 new rows
    const appendMatch = logText.match(/Appended (\d+) new rows/);
    if (appendMatch) totalInserted = parseInt(appendMatch[1]);

    // Match: 📊 DB after: 5410 total rows
    const dbMatch = logText.match(/DB after: (\d+) total rows/);
    if (dbMatch) totalRows = parseInt(dbMatch[1]);

    return { details, totalRows, totalInserted };
}

async function fetchJobLogs(token: string, runId: number): Promise<string | null> {
    try {
        // Get jobs for this run
        const jobsRes = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs/${runId}/jobs`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } },
        );
        if (!jobsRes.ok) return null;

        const jobsData = await jobsRes.json();
        const job = jobsData.jobs?.[0];
        if (!job) return null;

        // Get logs for this job
        const logsRes = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/jobs/${job.id}/logs`,
            { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' }, redirect: 'follow' },
        );
        if (!logsRes.ok) return null;

        return await logsRes.text();
    } catch {
        return null;
    }
}

export async function GET() {
    const timer = new Timer();
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: 'GITHUB_TOKEN not configured' },
            { status: 500 },
        );
    }

    try {
        timer.mark('github_fetch');
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
                next: { revalidate: 30 },
            },
        );

        if (!res.ok) {
            const errorBody = await res.text();
            return NextResponse.json(
                { error: `GitHub API error: ${res.status}`, details: errorBody },
                { status: res.status },
            );
        }

        const data = await res.json();
        timer.mark('parse_runs');

        // Process runs — fetch logs for completed runs (max 3 to limit API calls)
        const workflowRuns = data.workflow_runs || [];
        let logsFetched = 0;

        const runs = await Promise.all(
            workflowRuns.map(async (run: WorkflowRun) => {
                const started = new Date(run.run_started_at || run.created_at);
                const ended = new Date(run.updated_at);
                const durationMs = ended.getTime() - started.getTime();

                let syncDetails = null;

                // Fetch logs only for completed/successful runs, max 3
                if (run.status === 'completed' && run.conclusion === 'success' && logsFetched < 3) {
                    logsFetched++;
                    const logText = await fetchJobLogs(token, run.id);
                    if (logText) {
                        syncDetails = parseSyncDetails(logText);
                    }
                }

                return {
                    id: run.id,
                    status: run.status,
                    conclusion: run.conclusion,
                    createdAt: run.created_at,
                    duration: durationMs > 0 ? Math.round(durationMs / 1000) : null,
                    url: run.html_url,
                    syncDetails,
                };
            }),
        );

        timer.mark('process_runs');
        timer.end('GET /api/marketing/sync/logs', 'runs', { rows: runs.length });

        return NextResponse.json(
            { runs },
            { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
        );
    } catch (error) {
        console.error('Sync logs error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch sync logs' },
            { status: 500 },
        );
    }
}
