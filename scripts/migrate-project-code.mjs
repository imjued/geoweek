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
    console.log('Migrating database: Adding project code column...');

    try {
        await db.execute(`ALTER TABLE projects ADD COLUMN code TEXT`);
        console.log('Successfully added code column to projects table.');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column code already exists.');
        } else {
            console.error('Failed to migrate database:', e);
            process.exit(1);
        }
    }
}

main();
