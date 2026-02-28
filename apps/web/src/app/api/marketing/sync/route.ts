import { NextResponse } from 'next/server';

const GITHUB_OWNER = 'cachep-xidau';
const GITHUB_REPO = 'San-marketing';
const WORKFLOW_FILE = 'sync-data.yml';

export async function POST() {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        return NextResponse.json(
            { error: 'GITHUB_TOKEN not configured' },
            { status: 500 },
        );
    }

    try {
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ref: 'main' }),
            },
        );

        if (res.status === 204) {
            return NextResponse.json({
                status: 'triggered',
                timestamp: new Date().toISOString(),
            });
        }

        const errorBody = await res.text();
        return NextResponse.json(
            { error: `GitHub API error: ${res.status}`, details: errorBody },
            { status: res.status },
        );
    } catch (error) {
        console.error('Sync trigger error:', error);
        return NextResponse.json(
            { error: 'Failed to trigger sync workflow' },
            { status: 500 },
        );
    }
}
