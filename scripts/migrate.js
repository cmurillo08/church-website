import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await db.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('[migrate] No pending migrations.');
    process.exit(0);
  }

  for (const filename of pending) {
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    console.log(`[migrate] Applying ${filename}...`);
    await db.runTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    });
    console.log(`[migrate] Applied ${filename}`);
  }

  console.log(`[migrate] Done. Applied ${pending.length} migration(s).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('[migrate] Failed:', err.message);
  process.exit(1);
});
