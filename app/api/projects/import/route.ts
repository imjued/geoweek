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

        // Fetch projects from external DB
        const result = await importDb.execute('SELECT * FROM projects');
        const externalProjects = result.rows;

        // Insert into local DB
        let importedCount = 0;
        for (const project of externalProjects) {
            const { id, name, client, pm, period, code } = project;

            // Check if project exists (optional, but good for idempotency)
            // Assuming ID is preserved
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
                        client || '',
                        pm || '',
                        period || '',
                        code || ''
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
