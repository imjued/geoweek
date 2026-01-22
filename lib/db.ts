import { createClient } from '@libsql/client';
import path from 'path';

// Use environment variables for Turso, fallback to local file
const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'database.sqlite')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({
  url,
  authToken,
});

// Initial Schema (LibSQL execute is async, so we might need to handle this differently in Next.js or just run it)
// Usually better to have a migration script, but for this simple app we can run an init query if needed.
// We'll skip auto-init here and assume the table exists from previous sqlite usage, 
// or let the user run a setup. Actually, let's try to init once.

export default db;
