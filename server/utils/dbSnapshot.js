const fs = require('fs');
const path = require('path');

const SNAPSHOT_DIR = path.join(__dirname, '../data');
const SNAPSHOT_JSON = path.join(SNAPSHOT_DIR, 'prod-snapshot.json');
const SNAPSHOT_SQL = path.join(SNAPSHOT_DIR, 'prod-snapshot.sql');

/** Tables in FK-safe order (parents before children) */
const TABLE_ORDER = [
  'users',
  'user_addresses',
  'products',
  'product_images',
  'product_sizes',
  'orders',
  'order_items',
  'order_tracking'
];

const TRUNCATE_ORDER = [...TABLE_ORDER].reverse();

/** Must match product_sizes.size ENUM in migrations/schema.sql */
const ALLOWED_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

const DATETIME_COLUMNS = new Set([
  'otp_expire',
  'reset_password_expire',
  'created_at',
  'updated_at',
  'paid_at',
  'timestamp'
]);

function toMysqlDatetime(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
  return value;
}

function sanitizeRowForImport(table, row) {
  if (table === 'product_sizes' && !ALLOWED_SIZES.has(row.size)) {
    return null;
  }

  const sanitized = { ...row };
  for (const [key, value] of Object.entries(sanitized)) {
    const isDatetimeCol = DATETIME_COLUMNS.has(key)
      || key.endsWith('_at')
      || key.endsWith('_expire');
    if (isDatetimeCol || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
      sanitized[key] = toMysqlDatetime(value);
    }
  }
  return sanitized;
}

async function exportDatabase(connection) {
  const tables = {};
  for (const table of TABLE_ORDER) {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    tables[table] = rows;
  }
  return {
    exportedAt: new Date().toISOString(),
    tables
  };
}

async function importSnapshot(pool, snapshot) {
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');

  const tablesInSnapshot = TABLE_ORDER.filter((t) => snapshot.tables?.[t]?.length);
  const truncateOrder = [...tablesInSnapshot].reverse();

  for (const table of truncateOrder) {
    await pool.query(`TRUNCATE TABLE \`${table}\``);
  }

  for (const table of TABLE_ORDER) {
    const rows = snapshot.tables?.[table] || [];
    if (!rows.length) continue;

    const columns = Object.keys(rows[0]);
    const colList = columns.map((c) => `\`${c}\``).join(', ');
    const placeholders = columns.map(() => '?').join(', ');

    for (const row of rows) {
      const sanitized = sanitizeRowForImport(table, row);
      if (!sanitized) continue;

      const values = columns.map((col) => sanitized[col]);
      await pool.query(
        `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`,
        values
      );
    }
  }

  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function importSqlFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8')
    .replace(/^CREATE DATABASE .*?;\s*/gim, '')
    .replace(/^USE .*?;\s*/gim, '')
    .replace(/^SET .*?;\s*/gim, '')
    .replace(/^\/\*!.*?\*\/;?\s*/gms, '');

  await pool.query('SET FOREIGN_KEY_CHECKS = 0');
  await pool.query({ sql, multipleStatements: true });
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
}

function saveSnapshot(snapshot) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  fs.writeFileSync(SNAPSHOT_JSON, JSON.stringify(snapshot, null, 2));
  return SNAPSHOT_JSON;
}

function loadSnapshotJson() {
  if (!fs.existsSync(SNAPSHOT_JSON)) return null;
  return JSON.parse(fs.readFileSync(SNAPSHOT_JSON, 'utf8'));
}

function getSnapshotSource() {
  if (fs.existsSync(SNAPSHOT_JSON)) return { type: 'json', path: SNAPSHOT_JSON };
  if (fs.existsSync(SNAPSHOT_SQL)) return { type: 'sql', path: SNAPSHOT_SQL };
  return null;
}

function countSnapshotRows(snapshot) {
  return TABLE_ORDER.reduce((sum, table) => sum + (snapshot.tables?.[table]?.length || 0), 0);
}

module.exports = {
  TABLE_ORDER,
  SNAPSHOT_JSON,
  SNAPSHOT_SQL,
  exportDatabase,
  importSnapshot,
  importSqlFile,
  saveSnapshot,
  loadSnapshotJson,
  getSnapshotSource,
  countSnapshotRows
};
