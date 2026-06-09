/**
 * Production deploy helper — run on the server after git pull.
 * Usage: node scripts/deploy.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverDir = path.join(root, 'server');

function run(cmd, cwd = root) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function gitRef() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
}

console.log('\n=== Label Nine — production deploy ===\n');

run('npm run build', root);
run('npm install --omit=dev', serverDir);

const stamp = `${new Date().toISOString()} @ ${gitRef()}`;
fs.writeFileSync(path.join(serverDir, 'DEPLOY_VERSION'), stamp);
console.log(`\nDeploy stamp: ${stamp}`);

console.log(`
Next steps (SSH on Hostinger):
  pm2 restart labelnine-server
  pm2 logs labelnine-server --lines 30

Verify:
  curl https://labelnine.in/api/health
  curl "https://labelnine.in/api/products?sort=newest&page=1&limit=12"

If products list is empty, seed once:
  cd server && node seed.js

Required hPanel env vars:
  DB_HOST=localhost          (NOT 127.0.0.1)
  DB_USER, DB_PASSWORD, DB_NAME
  CLIENT_URL=https://labelnine.in
  JWT_SECRET, RAZORPAY_*, SMTP_*
`);
