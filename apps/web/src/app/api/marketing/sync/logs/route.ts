import { NextResponse } from 'next/server';

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
}

export async function GET() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: 'GITHUB_TOKEN not configured' },
            { status: 500 },
        );
    }

    try {
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=10`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                },
                next: { revalidate: 30 }, // Cache for 30s
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
        const runs = (data.workflow_runs || []).map((run: WorkflowRun) => {
            const started = new Date(run.run_started_at || run.created_at);
            const ended = new Date(run.updated_at);
            const durationMs = ended.getTime() - started.getTime();

            return {
                id: run.id,
                status: run.status,
                conclusion: run.conclusion,
                createdAt: run.created_at,
                duration: durationMs > 0 ? Math.round(durationMs / 1000) : null,
                url: run.html_url,
            };
        });

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
