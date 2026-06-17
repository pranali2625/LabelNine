/**
 * Seed extra product_images for slideshow testing.
 * Embedded dev: DB_PORT=13205 node scripts/seed-test-images.js
 * Production (Hostinger): run the SQL in the script comment via phpMyAdmin instead.
 */
if (process.argv.includes('--embedded')) {
  const port = process.env.DB_PORT || '13205';
  process.env.DATABASE_URL = `mysql://root:@127.0.0.1:${port}/labelnine_db`;
  delete process.env.DB_SOCKET;
}

const { pool } = require('../config/db');

const extraImages = [
  { productId: 1, url: 'https://labelnine.in/mens-shirt-ice-blue.png' },
  { productId: 1, url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600' },
  { productId: 1, url: 'https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=600' },
  { productId: 1, url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4dce?w=600' },
  { productId: 2, url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600' },
  { productId: 2, url: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600' },
];

async function main() {
  const [existing] = await pool.query(
    'SELECT id, product_id, url FROM product_images ORDER BY product_id, id'
  );
  console.log(`Current images: ${existing.length}`);

  for (const img of extraImages) {
    const [dup] = await pool.query(
      'SELECT id FROM product_images WHERE product_id = ? AND url = ?',
      [img.productId, img.url]
    );
    if (dup.length) {
      console.log(`Skip (exists): product ${img.productId}`);
      continue;
    }

    const [result] = await pool.query(
      'INSERT INTO product_images (product_id, url, public_id) VALUES (?, ?, NULL)',
      [img.productId, img.url]
    );
    console.log(`Inserted id ${result.insertId} for product ${img.productId}`);
  }

  const [updated] = await pool.query(
    'SELECT id, product_id, url FROM product_images ORDER BY product_id, id'
  );
  console.log(`\nAfter insert (${updated.length} total):`);
  for (const row of updated) {
    console.log(`  id ${row.id} | product ${row.product_id} | ${row.url}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
