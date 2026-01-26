import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
    try {
        const result = await db.execute('SELECT DISTINCT week_start FROM reports');
        const rows = result.rows as unknown as { week_start: string }[];
        const dates = rows.map(row => row.week_start);
        return NextResponse.json(dates);
    } catch (error) {
        console.error("Failed to fetch report status", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
