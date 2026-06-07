const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '../client/dist');
const target = path.join(__dirname, '../server/public');
const indexHtml = path.join(dist, 'index.html');

if (!fs.existsSync(indexHtml)) {
  console.error('client/dist/index.html not found — run "cd client && npm run build" first');
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(dist, target, { recursive: true });
console.log('Copied client/dist → server/public');
