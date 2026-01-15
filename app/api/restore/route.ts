import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
    try {
        const backupData = await request.json();

        if (!backupData.reports || !backupData.projects) {
            return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
        }

        const restoreTransaction = db.transaction((data) => {
            // 1. Clear existing data
            db.prepare('DELETE FROM reports').run();
            db.prepare('DELETE FROM projects').run();

            // 2. Insert Reports
            const insertReport = db.prepare(`
        INSERT INTO reports (id, week_start, division, project, prev_progress, curr_progress, remarks, created_at)
        VALUES (@id, @week_start, @division, @project, @prev_progress, @curr_progress, @remarks, @created_at)
      `);

            for (const report of data.reports) {
                insertReport.run(report);
            }

            // 3. Insert Projects
            const insertProject = db.prepare(`
        INSERT INTO projects (id, name, client, pm, period, created_at)
        VALUES (@id, @name, @client, @pm, @period, @created_at)
      `);

            for (const project of data.projects) {
                insertProject.run(project);
            }
        });

        restoreTransaction(backupData);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Restore failed: ' + error }, { status: 500 });
    }
}
