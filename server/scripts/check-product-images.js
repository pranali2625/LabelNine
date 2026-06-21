/**
 * List product image URLs and whether files exist on disk.
 * Run: cd server && npm run images:check
 */
require('../config/env');
const path = require('path');
const { pool } = require('../config/db');
const { getProductImagesDir, resolveProductImage } = require('../utils/productImages');

function localFilename(url) {
  if (!url) return null;
  try {
    const { pathname } = new URL(url);
    const base = path.basename(pathname);
    if (pathname.includes('/uploads/products/')) return decodeURIComponent(base);
    return decodeURIComponent(base);
  } catch {
    return decodeURIComponent(url.split('?')[0].split('/').pop());
  }
}

async function main() {
  const dir = getProductImagesDir();
  console.log(`\nPersistent image folder: ${dir}\n`);

  const [rows] = await pool.query(
    `SELECT p.id, p.name, pi.url
     FROM product_images pi
     JOIN products p ON p.id = pi.product_id
     ORDER BY p.id, pi.id`
  );

  if (!rows.length) {
    console.log('No product images in database.');
    await pool.end();
    return;
  }

  let ok = 0;
  let missing = 0;

  for (const row of rows) {
    const file = localFilename(row.url);
    const exists = file && resolveProductImage(file);
    const status = exists ? 'OK' : 'MISSING';
    if (exists) ok += 1;
    else missing += 1;
    console.log(`  [${status}] product ${row.id} | ${row.name}`);
    console.log(`           ${row.url}`);
    if (file) console.log(`           file: ${file}`);
  }

  console.log(`\nSummary: ${ok} on disk, ${missing} missing.`);
  if (missing) {
    console.log('\nRe-upload via Admin → Products → Upload button, then Save.');
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
