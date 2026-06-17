/**
 * Import server/data/prod-snapshot.json (or prod-snapshot.sql) into the current database.
 * Usually run automatically by dev-start.js — use manually if needed:
 *   cd server && node scripts/import-prod-snapshot.js
 */
require('../config/env');
const { pool, ensureSchema } = require('../config/db');
const {
  loadSnapshotJson,
  getSnapshotSource,
  importSnapshot,
  importSqlFile,
  countSnapshotRows
} = require('../utils/dbSnapshot');

async function main() {
  const source = getSnapshotSource();
  if (!source) {
    console.error('No snapshot found. Run: npm run db:pull');
    console.error('Or export from Hostinger phpMyAdmin → server/data/prod-snapshot.sql');
    process.exit(1);
  }

  await pool.query('SELECT 1');
  await ensureSchema();

  if (source.type === 'json') {
    const snapshot = loadSnapshotJson();
    console.log(`Importing JSON snapshot (${snapshot.exportedAt})...`);
    await importSnapshot(pool, snapshot);
    console.log(`Imported ${countSnapshotRows(snapshot)} rows.`);
  } else {
    console.log(`Importing SQL snapshot from ${source.path}...`);
    await importSqlFile(pool, source.path);
    console.log('SQL import complete.');
  }

  await pool.end();
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
