import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import db from '@/lib/db';

export async function POST() {
    try {
        const url = process.env.IMPORT_TURSO_DATABASE_URL;
        const authToken = process.env.IMPORT_TURSO_AUTH_TOKEN;

        if (!url || !authToken) {
            return NextResponse.json({ error: 'Import credentials not configured' }, { status: 500 });
        }

        const importDb = createClient({
            url,
            authToken,
        });

        // Fetch projects from external DB (Key Value Store)
        const result = await importDb.execute("SELECT value FROM key_value_store WHERE key = 'gantt_projects'");

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'No projects found in external DB (key: gantt_projects)' }, { status: 404 });
        }

        const valueRow = result.rows[0];
        const projectsJson = valueRow.value as string;

        let externalProjects: any[] = [];
        try {
            externalProjects = JSON.parse(projectsJson);
        } catch (e) {
            console.error("Failed to parse projects JSON", e);
            return NextResponse.json({ error: 'Invalid data format in external DB' }, { status: 500 });
        }

        // Insert into local DB
        let importedCount = 0;
        for (const project of externalProjects) {
            const { id, name, startDate, endDate } = project;
            const period = (startDate && endDate) ? `${startDate} ~ ${endDate}` : '';

            // Check if project exists
            const existing = await db.execute({
                sql: 'SELECT 1 FROM projects WHERE id = ?',
                args: [id]
            });

            if (existing.rows.length === 0) {
                await db.execute({
                    sql: 'INSERT INTO projects (id, name, client, pm, period, code) VALUES (?, ?, ?, ?, ?, ?)',
                    args: [
                        id,
                        name,
                        '', // client 
                        '', // pm
                        period,
                        '' // code
                    ]
                });
                importedCount++;
            }
        }

        return NextResponse.json({ success: true, count: importedCount });
    } catch (error) {
        console.error("Failed to import projects", error);
        return NextResponse.json({ error: 'Import failed' }, { status: 500 });
    }
}
