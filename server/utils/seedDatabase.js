const { pool } = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const sampleProducts = require('../data/sampleProducts');

const slugFromName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') +
  '-' + Date.now() + Math.floor(Math.random() * 1000);

function getAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || 'admin@labelnine.in').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || 'Admin@123'
  };
}

async function ensureAdmin() {
  const { email, password } = getAdminCredentials();
  const existing = await User.findOne({ email });
  if (existing) return { created: false, email };

  await User.create({
    name: 'Label Nine Admin',
    email,
    password,
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true
  });

  console.log(`Admin user created: ${email}`);
  return { created: true, email };
}

async function seedProductsIfEmpty() {
  const [rows] = await pool.query('SELECT COUNT(*) as count FROM products');
  if (Number(rows[0].count) > 0) {
    return { seeded: false, count: Number(rows[0].count) };
  }

  const productsWithSlugs = sampleProducts.map((p) => ({
    ...p,
    slug: slugFromName(p.name)
  }));
  await Product.insertMany(productsWithSlugs);

  console.log(`Seeded ${sampleProducts.length} products`);
  return { seeded: true, count: sampleProducts.length };
}

/** Run on server startup — fills empty DB without wiping existing data */
async function initializeDatabase() {
  const products = await seedProductsIfEmpty();
  const admin = await ensureAdmin();
  return { products, admin };
}

/** Full reset — used by `node seed.js` */
async function resetDatabase() {
  await Product.deleteMany({});
  await User.deleteMany({ role: 'admin' });

  const productsWithSlugs = sampleProducts.map((p) => ({
    ...p,
    slug: slugFromName(p.name)
  }));
  await Product.insertMany(productsWithSlugs);

  const { email } = getAdminCredentials();
  await User.create({
    name: 'Label Nine Admin',
    email,
    password: getAdminCredentials().password,
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true
  });

  console.log(`Reset complete: ${sampleProducts.length} products, admin ${email}`);
}

module.exports = { initializeDatabase, resetDatabase, ensureAdmin, getAdminCredentials };
