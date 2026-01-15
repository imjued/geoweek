import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
        const projects = stmt.all();
        return NextResponse.json({ projects });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, client, pm, period } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Project Name is required' }, { status: 400 });
        }

        const stmt = db.prepare(`
      INSERT INTO projects (id, name, client, pm, period)
      VALUES (@id, @name, @client, @pm, @period)
    `);

        stmt.run({
            id: crypto.randomUUID(),
            name,
            client: client || '',
            pm: pm || '',
            period: period || ''
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
