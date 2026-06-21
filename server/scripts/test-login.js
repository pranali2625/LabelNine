/**
 * Debug login for a user against the configured DB (use with dev:live env).
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

require('../config/env');

const prodEnvPath = path.join(__dirname, '../.env.production');
if (fs.existsSync(prodEnvPath)) {
  dotenv.config({ path: prodEnvPath, override: true });
  Object.assign(process.env, {
    DB_HOST: process.env.PROD_DB_HOST,
    DB_PORT: process.env.PROD_DB_PORT || '3306',
    DB_USER: process.env.PROD_DB_USER,
    DB_PASSWORD: process.env.PROD_DB_PASSWORD,
    DB_NAME: process.env.PROD_DB_NAME,
    DB_SOCKET: ''
  });
  delete process.env.DATABASE_URL;
  delete process.env.EMBEDDED_MYSQL;
}

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { pool } = require('../config/db');

const email = process.argv[2] || 'spranali440@gmail.com';
const password = process.argv[3] || 'Admin@123456';

(async () => {
  const user = await User.findOne({ email }, '+password');
  console.log('User found:', Boolean(user));
  if (!user) {
    process.exit(1);
  }

  console.log('id:', user.id);
  console.log('email:', user.email);
  console.log('phone:', user.phone);
  console.log('isPhoneVerified:', user.isPhoneVerified);
  console.log('isEmailVerified:', user.isEmailVerified);
  console.log('isRegistrationVerified:', user.isRegistrationVerified());

  const hash = Buffer.isBuffer(user.password)
    ? user.password.toString('utf8')
    : user.password;
  console.log('hash length:', hash?.length);
  console.log('hash starts with $2:', hash?.startsWith('$2'));

  const match = await user.matchPassword(password);
  console.log(`matchPassword("${password}"):`, match);

  if (!match && hash) {
    const adminUser = await User.findOne({ email: 'admin@labelnine.in' }, '+password');
    if (adminUser?.password) {
      const adminHash = Buffer.isBuffer(adminUser.password)
        ? adminUser.password.toString('utf8')
        : adminUser.password;
      console.log('admin hash same as user:', adminHash === hash);
      console.log('admin match Admin@123456:', await bcrypt.compare(password, adminHash));
    }
  }

  await pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
