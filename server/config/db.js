require('./env');

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { env, requireEnv } = require('./env');

let pool;

const DEFAULT_SOCKET = '/var/lib/mysql/mysql.sock';

function getDbConfig() {
  if (env('DATABASE_URL')) {
    return env('DATABASE_URL');
  }

  requireEnv(['DB_USER', 'DB_PASSWORD', 'DB_NAME']);

  const base = {
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
  };

  const host = env('DB_HOST') || 'localhost';
  const socketPath = env('DB_SOCKET');
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  // Explicit socket path (Hostinger shared hosting, or override via DB_SOCKET).
  if (socketPath) {
    return { ...base, socketPath };
  }

  // mysql2 uses a unix socket for host 'localhost' on Linux. Hostinger grants DB
  // users for 'localhost' only — connecting as 127.0.0.1 (TCP) causes access denied.
  if (isLocalHost) {
    if (process.platform !== 'win32' && fs.existsSync(DEFAULT_SOCKET)) {
      return { ...base, socketPath: DEFAULT_SOCKET };
    }
    return { ...base, host: 'localhost' };
  }

  return {
    ...base,
    host,
    port: Number(env('DB_PORT')) || 3306
  };
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

async function ensureSchema() {
  const db = getPool();
  const [tables] = await db.query("SHOW TABLES LIKE 'users'");
  if (tables.length > 0) return;

  const schemaPath = path.join(__dirname, '../migrations/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    await db.query(statement);
  }
  console.log('Database schema created');
}

module.exports = {
  getPool,
  ensureSchema,
  get pool() {
    return getPool();
  }
};
