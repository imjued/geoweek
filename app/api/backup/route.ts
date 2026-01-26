import { NextResponse, NextRequest } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const reportsResult = await db.execute('SELECT * FROM reports ORDER BY week_start DESC, division ASC');
        const projectsResult = await db.execute('SELECT * FROM projects');

        const backupData = {
            version: 2,
            timestamp: new Date().toISOString(),
            reports: reportsResult.rows,
            projects: projectsResult.rows
        };

        // Force browser to download
        const json = JSON.stringify(backupData, null, 2);

        return new NextResponse(json, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="scrum_backup_${new Date().toISOString().split('T')[0]}.json"`
            }
        });
    } catch (error) {
        console.error("Backup failed", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        let reports: any[] = [];
        let projects: any[] = [];

        // Determine format
        if (Array.isArray(body)) {
            // Legacy V1: just an array of reports
            reports = body;
        } else if (body.reports || body.projects) {
            // V2: Object with keys
            reports = body.reports || [];
            projects = body.projects || [];
        } else {
            return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
        }

        const statements: any[] = [];

        // 1. Restore Projects
        if (Array.isArray(projects)) {
            for (const p of projects) {
                statements.push({
                    sql: `INSERT OR REPLACE INTO projects (id, name, client, pm, period, created_at, code) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    args: [p.id, p.name, p.client || '', p.pm || '', p.period || '', p.created_at || new Date().toISOString(), p.code || '']
                });
            }
        }

        // 2. Restore Reports
        if (Array.isArray(reports)) {
            for (const item of reports) {
                statements.push({
                    sql: `INSERT OR REPLACE INTO reports (id, division, project, prev_progress, curr_progress, remarks, week_start) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    args: [
                        item.id,
                        item.division || '',
                        item.project || '',
                        item.prev_progress || '',
                        item.curr_progress || '',
                        item.remarks || '',
                        item.week_start
                    ]
                });
            }
        }

        if (statements.length > 0) {
            try {
                await db.batch(statements, 'write');
            } catch (batchError) {
                console.warn("Batch failed, trying sequential", batchError);
                // Sequential Fallback
                for (const stmt of statements) {
                    await db.execute(stmt);
                }
            }
        }

        return NextResponse.json({ count: statements.length, projects: projects.length, reports: reports.length });

    } catch (error) {
        console.error("Restore failed", error);
        return NextResponse.json({ error: 'Restore failed' }, { status: 500 });
    }
}
