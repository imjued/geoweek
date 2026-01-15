import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const reports = db.prepare('SELECT * FROM reports').all();
        const projects = db.prepare('SELECT * FROM projects').all();

        const backupData = {
            timestamp: new Date().toISOString(),
            reports,
            projects
        };

        return NextResponse.json(backupData);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
