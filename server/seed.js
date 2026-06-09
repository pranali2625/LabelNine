/**
 * Seed script: creates admin user + 5 sample products
 * Run: node seed.js
 */
require('./config/env');
const { pool, ensureSchema } = require('./config/db');
const { resetDatabase, getAdminCredentials } = require('./utils/seedDatabase');

const seed = async () => {
  await pool.query('SELECT 1');
  await ensureSchema();
  console.log('Connected to MySQL');

  await resetDatabase();

  const { email, password } = getAdminCredentials();
  console.log(`Seed complete! Login with: ${email} / ${password}`);

  await pool.end();
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
