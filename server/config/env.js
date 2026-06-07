const path = require('path');
const dotenv = require('dotenv');

const serverDir = path.join(__dirname, '..');
const rootDir = path.join(serverDir, '..');

// Load local .env files (Hostinger uses hPanel env vars instead)
[
  path.join(serverDir, '.env'),
  path.join(rootDir, '.env')
].forEach((envPath) => dotenv.config({ path: envPath }));

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : value;
}

function requireEnv(names) {
  const missing = names.filter((name) => !env(name));
  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}.\n` +
      'Local: create server/.env from .env.example\n' +
      'Hostinger: hPanel → Deployments → Environment variables → add DB_HOST, DB_USER, DB_PASSWORD, DB_NAME'
    );
  }
}

module.exports = { env, requireEnv };
