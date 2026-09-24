import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

// The app schema and its schema_migrations table are created by the initial
// migration, so a missing table just means nothing has been applied yet.
// PGSCHEMA is required: without it, unqualified CREATE TABLEs would land in
// public. Its format is validated in lib/db.js.
const schema = process.env.PGSCHEMA;
const migrationsTable = `"${schema}".schema_migrations`;

async function getAppliedMigrations() {
  const exists = await db.query('SELECT to_regclass($1) IS NOT NULL AS exists', [migrationsTable]);
  if (!exists.rows[0].exists) return new Set();

  const result = await db.query(`SELECT filename FROM ${migrationsTable}`);
  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  if (!schema) {
    throw new Error('PGSCHEMA is not set (expected church_donations).');
  }
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
      await client.query(`INSERT INTO ${migrationsTable} (filename) VALUES ($1)`, [filename]);
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
