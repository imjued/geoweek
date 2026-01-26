import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const result = await db.execute('SELECT * FROM projects ORDER BY created_at DESC');
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Failed to fetch projects", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, client, pm, period, code } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const id = crypto.randomUUID();
        await db.execute({
            sql: 'INSERT INTO projects (id, name, client, pm, period, code) VALUES (?, ?, ?, ?, ?, ?)',
            args: [id, name, client || '', pm || '', period || '', code || '']
        });

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("Failed to create project", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, client, pm, period, code } = body;

        if (!id || !name) {
            return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
        }

        await db.execute({
            sql: 'UPDATE projects SET name=?, client=?, pm=?, period=?, code=? WHERE id=?',
            args: [name, client || '', pm || '', period || '', code || '', id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update project", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM projects WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete project", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
