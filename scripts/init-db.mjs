import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
    console.error('TURSO_DATABASE_URL is not set');
    process.exit(1);
}

const db = createClient({
    url,
    authToken,
});

async function main() {
    console.log('Initializing database...');

    try {
        // Create projects table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                client TEXT,
                pm TEXT,
                period TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Verified projects table');

        // Create reports table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                division TEXT,
                project TEXT,
                prev_progress TEXT,
                curr_progress TEXT,
                remarks TEXT,
                week_start TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Verified reports table');

        console.log('Database initialization completed successfully.');
    } catch (e) {
        console.error('Failed to initialize database:', e);
        process.exit(1);
    }
}

main();
