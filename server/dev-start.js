/**
 * Local dev entry: starts embedded MySQL (no system install required),
 * seeds the database, then boots the API server.
 */
const path = require('path');
const { execSync } = require('child_process');
const { createDB } = require('mysql-memory-server');

async function main() {
  console.log('Starting embedded MySQL (first run may download MySQL binaries)...');

  const db = await createDB({
    version: '8.4.x',
    dbName: 'labelnine_db',
    logLevel: 'WARN'
  });

  process.env.DB_HOST = '127.0.0.1';
  process.env.DB_PORT = String(db.port);
  process.env.DB_USER = db.username;
  process.env.DB_PASSWORD = 'dev';
  process.env.DB_NAME = db.dbName;
  delete process.env.DB_SOCKET;
  process.env.DATABASE_URL = `mysql://${db.username}:@127.0.0.1:${db.port}/${db.dbName}`;

  console.log(`Embedded MySQL ready on 127.0.0.1:${db.port}`);

  const serverDir = __dirname;
  try {
    execSync('node seed.js', {
      stdio: 'inherit',
      cwd: serverDir,
      env: process.env
    });
  } catch {
    console.warn('Seed skipped or failed — continuing with existing data');
  }

  require('./index.js');
}

main().catch((err) => {
  console.error('Dev startup failed:', err);
  process.exit(1);
});
