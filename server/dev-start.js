/**
 * Local dev entry: starts embedded MySQL (no system install required),
 * seeds the database, then boots the API server.
 */
const { createDB } = require('mysql-memory-server');

async function main() {
  console.log('Starting embedded MySQL (first run may download MySQL binaries)...');

  const db = await createDB({
    version: '8.4.x',
    dbName: 'labelnine_db',
    logLevel: 'WARN'
  });

  process.env.EMBEDDED_MYSQL = '1';
  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(db.port);
  process.env.DB_USER = db.username;
  process.env.DB_PASSWORD = 'dev';
  process.env.DB_NAME = db.dbName;
  // Keep empty so server/.env cannot restore production DB_SOCKET on require('./index.js')
  process.env.DB_SOCKET = '';
  process.env.DATABASE_URL = `mysql://${db.username}:@127.0.0.1:${db.port}/${db.dbName}`;

  console.log(`Embedded MySQL ready on 127.0.0.1:${db.port} (local dev database — separate from production)`);

  try {
    const { pool, ensureSchema } = require('./config/db');
    const { initializeDatabase } = require('./utils/seedDatabase');
    const {
      getSnapshotSource,
      loadSnapshotJson,
      importSnapshot,
      importSqlFile,
      countSnapshotRows
    } = require('./utils/dbSnapshot');

    await ensureSchema();

    const snapshotSource = getSnapshotSource();
    if (snapshotSource) {
      try {
        if (snapshotSource.type === 'json') {
          const snapshot = loadSnapshotJson();
          await importSnapshot(pool, snapshot);
          console.log(
            `Loaded production snapshot (${countSnapshotRows(snapshot)} rows, exported ${snapshot.exportedAt})`
          );
        } else {
          await importSqlFile(pool, snapshotSource.path);
          console.log(`Loaded production SQL snapshot from ${snapshotSource.path}`);
        }
        await initializeDatabase();
      } catch (importErr) {
        console.warn('Snapshot import failed — falling back to sample seed:', importErr.message);
        await initializeDatabase();
      }
    } else {
      await initializeDatabase();
    }
  } catch (err) {
    console.warn('Dev seed skipped or failed — continuing with existing data:', err.message);
  }

  require('./index.js');
}

main().catch((err) => {
  console.error('Dev startup failed:', err);
  process.exit(1);
});
