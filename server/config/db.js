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

  // Hostinger MySQL users are granted for 'localhost' (socket), not '127.0.0.1' (TCP).
  if (socketPath || (host === 'localhost' && fs.existsSync(DEFAULT_SOCKET))) {
    return { ...base, socketPath: socketPath || DEFAULT_SOCKET };
  }

  return {
    ...base,
    host: host === 'localhost' ? '127.0.0.1' : host,
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
