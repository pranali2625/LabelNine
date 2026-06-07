require('./env');

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { env, requireEnv } = require('./env');

let pool;

function getDbConfig() {
  if (env('DATABASE_URL')) {
    return env('DATABASE_URL');
  }

  requireEnv(['DB_USER', 'DB_PASSWORD', 'DB_NAME']);

  // Use 127.0.0.1 instead of localhost — on many hosts "localhost" resolves to
  // IPv6 ::1, but MySQL users are often only granted for 127.0.0.1 / localhost socket.
  let host = env('DB_HOST') || '127.0.0.1';
  if (host === 'localhost') host = '127.0.0.1';

  return {
    host,
    port: Number(env('DB_PORT')) || 3306,
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    database: env('DB_NAME'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z'
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
