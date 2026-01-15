import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { addWeeks, format, parseISO, subWeeks } from 'date-fns';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart'); // expected YYYY-MM-DD (Monday)

    if (!weekStart) {
        return NextResponse.json({ error: 'Missing weekStart param' }, { status: 400 });
    }

    try {
        // 1. Try to find existing report for this week
        const stmt = db.prepare('SELECT * FROM reports WHERE week_start = ?');
        const items = stmt.all(weekStart);

        if (items.length > 0) {
            return NextResponse.json({ items });
        }

        // 2. If no items, try to find previous week's report for carryover
        // Calculate previous week start
        const currentStart = parseISO(weekStart);
        const prevStart = subWeeks(currentStart, 1);
        const prevStartStr = format(prevStart, 'yyyy-MM-dd'); // assuming inputs are clean yyyy-MM-dd

        const prevItems = stmt.all(prevStartStr);

        if (prevItems.length > 0) {
            // Carry over logic: 
            // New Prevs = Old Currs
            // New Currs = Empty
            const carriedOverItems = prevItems.map((item: any) => ({
                id: crypto.randomUUID(), // New IDs
                week_start: weekStart,   // New Date
                division: item.division,
                project: item.project,
                prev_progress: item.curr_progress, // CARRY OVER!
                curr_progress: '',                 // Reset
                remarks: item.remarks              // Keep remarks? Maybe. Let's keep.
            }));

            // Return as "draft" items (don't save yet, let frontend save)
            return NextResponse.json({ items: carriedOverItems, isDraft: true });
        }

        // 3. No previous data either -> Empty
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

        // Transaction to replace items for that week
        const deleteStmt = db.prepare('DELETE FROM reports WHERE week_start = ?');
        const insertStmt = db.prepare(`
      INSERT INTO reports (id, week_start, division, project, prev_progress, curr_progress, remarks)
      VALUES (@id, @week_start, @division, @project, @prev_progress, @curr_progress, @remarks)
    `);

        const transaction = db.transaction((week, newItems) => {
            deleteStmt.run(week);
            for (const item of newItems) {
                insertStmt.run({
                    id: item.id || crypto.randomUUID(),
                    week_start: week,
                    division: item.division || '',
                    project: item.project || '',
                    prev_progress: item.prev_progress || '',
                    curr_progress: item.curr_progress || '',
                    remarks: item.remarks || ''
                });
            }
        });

        transaction(weekStart, items);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}
