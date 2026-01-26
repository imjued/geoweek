import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { format, parseISO, subWeeks } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart'); // expected YYYY-MM-DD (Monday)

    if (!weekStart) {
        return NextResponse.json({ error: 'Missing weekStart param' }, { status: 400 });
    }

    try {
        // 1. Try to find existing report for this week
        const result = await db.execute({
            sql: 'SELECT * FROM reports WHERE week_start = ?',
            args: [weekStart]
        });
        interface ReportRow {
            id: string;
            division: string;
            project: string;
            curr_progress: string;
            remarks: string;

        }
        const items = result.rows as unknown as ReportRow[];

        if (items.length > 0) {
            return NextResponse.json({ items });
        }

        // 2. If no items, try to find previous week's report for carryover
        const currentStart = parseISO(weekStart);
        const prevStart = subWeeks(currentStart, 1);
        const prevStartStr = format(prevStart, 'yyyy-MM-dd');

        const prevResult = await db.execute({
            sql: 'SELECT * FROM reports WHERE week_start = ?',
            args: [prevStartStr]
        });
        const prevItems = prevResult.rows as unknown as ReportRow[];

        if (prevItems.length > 0) {
            const carriedOverItems = prevItems.map((item: ReportRow) => ({
                id: crypto.randomUUID(),
                week_start: weekStart,
                division: item.division,
                project: item.project,
                prev_progress: item.curr_progress,
                curr_progress: '',
                remarks: item.remarks
            }));

            return NextResponse.json({ items: carriedOverItems, isDraft: true });
        }

        return NextResponse.json({ items: [] });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { weekStart, items } = await request.json();

        if (!weekStart || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
        }

        // Using batch for transaction-like atomic behavior
        const operations = [
            {
                sql: 'DELETE FROM reports WHERE week_start = ?',
                args: [weekStart]
            },
            ...items.map(item => ({
                sql: `
                    INSERT INTO reports (id, week_start, division, project, prev_progress, curr_progress, remarks)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                args: [
                    item.id || crypto.randomUUID(),
                    weekStart,
                    item.division || '',
                    item.project || '',
                    item.prev_progress || '',
                    item.curr_progress || '',
                    item.remarks || ''
                ]
            }))
        ];

        await db.batch(operations, "write");

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
