/**
 * Compare product_images URLs in DB with files on disk.
 * Run: cd server && npm run images:check
 */
require('../config/env');
const { pool } = require('../config/db');
const {
  getProductImagesDir,
  listProductImageFiles,
  extractImageFilename,
  findProductImageFile,
  publicImageUrl
} = require('../utils/productImages');
const { env } = require('../config/env');

async function main() {
  const dir = getProductImagesDir();
  const baseUrl = (env('CLIENT_URL') || 'https://labelnine.in').replace(/\/$/, '');
  const onDisk = listProductImageFiles();

  console.log(`\nPersistent image folder: ${dir}`);
  console.log(`Files on disk (${onDisk.length}):`);
  onDisk.forEach((f) => console.log(`  - ${f}`));
  console.log('');

  const [rows] = await pool.query(
    `SELECT p.id, p.name, pi.id AS image_id, pi.url
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
  const usedFiles = new Set();

  for (const row of rows) {
    const file = extractImageFilename(row.url);
    const filePath = file && findProductImageFile(file);
    const status = filePath ? 'OK' : 'MISSING';
    if (filePath) {
      ok += 1;
      usedFiles.add(require('path').basename(filePath));
    } else {
      missing += 1;
    }
    console.log(`  [${status}] product ${row.id} | ${row.name}`);
    console.log(`           ${row.url}`);
    if (file) {
      console.log(`           expected file: ${file}`);
      if (filePath) {
        console.log(`           served as: ${publicImageUrl(require('path').basename(filePath), baseUrl)}`);
      }
    }
  }

  const orphanFiles = onDisk.filter((f) => !usedFiles.has(f));
  console.log(`\nSummary: ${ok} on disk, ${missing} missing.`);
  if (orphanFiles.length) {
    console.log(`\nOrphan files on disk (not linked in DB) — rename to match DB or re-upload via Admin:`);
    orphanFiles.forEach((f) => console.log(`  - ${f}`));
  }
  if (missing) {
    console.log('\nFix: In Hostinger File Manager, rename files in product-images/ to match DB names');
    console.log('     (e.g. "White B.png", "Mens-checks-half-front.png"), then redeploy/restart.');
    console.log('     Or use Admin → Products → Upload for each image and Save.');
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
