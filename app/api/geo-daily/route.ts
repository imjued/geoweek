import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import db from '@/lib/db';
import path from 'path';

interface DailyLogRow {
    id: string;
    date: string;
    time: string;
    project_id?: string;
    project_name?: string;
    category?: string;
    content: string;
    remarks?: string;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
        return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const querySql = `
        SELECT id, date, time, project_id, project_name, category, content, remarks
        FROM daily_logs
        WHERE date >= ? AND date <= ?
        ORDER BY date ASC, time ASC, created_at ASC
    `;

    // 1. GEO_DAILY_TURSO_DATABASE_URL 또는 GEO_DAILY_DB_URL 환경변수가 있는 경우 우선 사용
    const customUrl = process.env.GEO_DAILY_TURSO_DATABASE_URL || process.env.GEO_DAILY_DB_URL;
    const customToken = process.env.GEO_DAILY_TURSO_AUTH_TOKEN || process.env.GEO_DAILY_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

    if (customUrl) {
        try {
            const customDb = createClient({
                url: customUrl,
                authToken: customToken,
            });
            const { rows } = await customDb.execute({
                sql: querySql,
                args: [startDate, endDate]
            });
            return NextResponse.json({ logs: rows as unknown as DailyLogRow[], source: 'geo_daily_env' });
        } catch (err) {
            console.warn('Failed to query custom GEO_DAILY DB, trying default db...', err);
        }
    }

    // 2. 동일한 Turso DB를 공유하는 경우 (기본 db 인스턴스에서 daily_logs 조회)
    try {
        const { rows } = await db.execute({
            sql: querySql,
            args: [startDate, endDate]
        });
        return NextResponse.json({ logs: rows as unknown as DailyLogRow[], source: 'shared_db' });
    } catch (sharedErr) {
        // daily_logs 테이블이 없거나 로컬 개발 환경인 경우 인접한 geo_daily 로컬 SQLite 파일 시도
        try {
            const siblingDbPath = path.resolve(process.cwd(), '../geo_daily/database.sqlite');
            const localGeoDailyDb = createClient({
                url: `file:${siblingDbPath}`,
            });
            const { rows } = await localGeoDailyDb.execute({
                sql: querySql,
                args: [startDate, endDate]
            });
            return NextResponse.json({ logs: rows as unknown as DailyLogRow[], source: 'local_sibling_db' });
        } catch (localErr) {
            console.error('Failed to fetch daily_logs from all sources:', sharedErr, localErr);
            return NextResponse.json(
                { error: 'geo_daily 데이터베이스(daily_logs 테이블)에 연결할 수 없습니다. 환경변수(GEO_DAILY_DB_URL) 또는 DB 설정을 확인해주세요.' },
                { status: 500 }
            );
        }
    }
}
