/**
 * Update product_images URLs to match files in product-images/ on Hostinger.
 * Run on server: cd server && node scripts/fix-product-image-urls.js
 * Or paste server/migrations/fix-product-image-urls.sql into phpMyAdmin.
 */
require('../config/env');
const { pool } = require('../config/db');
const { env } = require('../config/env');

const BASE = `${(env('CLIENT_URL') || 'https://labelnine.in').replace(/\/$/, '')}/uploads/products`;

/** product_id, match substring in current url, filename on disk */
const UPDATES = [
  { productId: 1, match: 'White B.png', file: 'WhatsApp Image 2026-06-21 at 10.35.57 PM.jpeg' },
  { productId: 1, match: 'WhiteC.png', file: 'IMG-20260617-WA0008.jpg' },
  { productId: 1, match: 'White F.png', file: 'ChatGPT Image Jun 17, 2026, 11_08_57 AM.png' },
  { productId: 2, match: 'Mens-checks-half-front.png', file: 'IMG-20260618-WA0000.jpg' },
  { productId: 2, match: 'Mens-Checks-full-front.png', file: 'IMG-20260618-WA0001.jpg' },
  { productId: 2, match: 'Mens-checks-full-back.png', file: 'ChatGPT Image Jun 18, 2026, 10_13_17 AM.png' },
  { productId: 3, match: 'mens-black-short-front.png', file: 'image_f87328b4.png' },
  { productId: 4, match: 'chatgpt.com', file: 'IMG-20260617-WA0008.jpg' }
];

const DELETES = [
  { productId: 6, match: 'mens-shirt-ice-blue.png' }
];

function toPublicUrl(filename) {
  return `${BASE}/${encodeURIComponent(filename)}`;
}

async function main() {
  console.log(`\nFixing product image URLs (base: ${BASE})\n`);

  for (const { productId, match } of DELETES) {
    const [result] = await pool.query(
      'DELETE FROM product_images WHERE product_id = ? AND url LIKE ?',
      [productId, `%${match}%`]
    );
    if (result.affectedRows) {
      console.log(`Deleted product ${productId} image matching "${match}"`);
    }
  }

  for (const { productId, match, file } of UPDATES) {
    const newUrl = toPublicUrl(file);
    const [result] = await pool.query(
      'UPDATE product_images SET url = ? WHERE product_id = ? AND url LIKE ?',
      [newUrl, productId, `%${match}%`]
    );
    const status = result.affectedRows ? 'updated' : 'no match';
    console.log(`[${status}] product ${productId} | ${match} → ${file}`);
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.name, pi.url
     FROM product_images pi
     JOIN products p ON p.id = pi.product_id
     ORDER BY p.id, pi.id`
  );

  console.log('\nCurrent product_images:');
  for (const row of rows) {
    console.log(`  product ${row.id} | ${row.name}`);
    console.log(`    ${row.url}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
