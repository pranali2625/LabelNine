/**
 * Seed script: creates admin user + 5 sample products
 * Run: node seed.js
 */
require('dotenv').config();
const { pool, ensureSchema } = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');

const products = [
  {
    name: 'Classic White Formal',
    variety: 'Classic White Formal',
    description: 'Timeless white formal shirt crafted from premium Egyptian cotton. Perfect for office and formal occasions. Features a classic collar, full button front, and a clean, crisp finish that lasts all day.',
    price: 1499,
    discountedPrice: 1199,
    fabric: '100% Egyptian Cotton',
    fit: 'Regular',
    color: 'White',
    care: ['Machine wash cold', 'Do not bleach', 'Iron on medium heat'],
    isFeatured: true,
    isActive: true,
    images: [{ url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600' }],
    sizes: [
      { size: 'S', stock: 20 },
      { size: 'M', stock: 30 },
      { size: 'L', stock: 25 },
      { size: 'XL', stock: 15 },
      { size: 'XXL', stock: 10 }
    ],
    tags: ['formal', 'white', 'office', 'classic']
  },
  {
    name: 'Oxford Button-Down',
    variety: 'Oxford Button-Down',
    description: 'Premium Oxford weave button-down shirt that transitions effortlessly from casual to smart-casual. Made with a sturdy yet breathable Oxford cloth with a classic button-down collar.',
    price: 1799,
    discountedPrice: 1399,
    fabric: 'Oxford Weave Cotton',
    fit: 'Regular',
    color: 'Light Blue',
    care: ['Machine wash cold', 'Tumble dry low', 'Warm iron'],
    isFeatured: true,
    isActive: true,
    images: [{ url: 'https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=600' }],
    sizes: [
      { size: 'S', stock: 18 },
      { size: 'M', stock: 28 },
      { size: 'L', stock: 22 },
      { size: 'XL', stock: 12 },
      { size: 'XXL', stock: 8 }
    ],
    tags: ['oxford', 'button-down', 'smart-casual', 'blue']
  },
  {
    name: 'Slim Fit Solid',
    variety: 'Slim Fit Solid',
    description: 'A sharp, contemporary slim-fit shirt designed for the modern man. Tailored close to the body for a streamlined silhouette without restricting movement. Available in deep navy.',
    price: 1599,
    discountedPrice: null,
    fabric: '95% Cotton, 5% Elastane',
    fit: 'Slim',
    color: 'Navy Blue',
    care: ['Machine wash cold', 'Do not dry clean', 'Iron on low heat'],
    isFeatured: true,
    isActive: true,
    images: [{ url: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600' }],
    sizes: [
      { size: 'S', stock: 25 },
      { size: 'M', stock: 35 },
      { size: 'L', stock: 20 },
      { size: 'XL', stock: 10 },
      { size: 'XXL', stock: 5 }
    ],
    tags: ['slim-fit', 'navy', 'solid', 'formal', 'modern']
  },
  {
    name: 'Casual Linen',
    variety: 'Casual Linen',
    description: 'Breathable pure linen shirt for the warm Indian climate. Naturally cool and comfortable, with a relaxed fit. Perfect for weekends, brunches, and travel.',
    price: 1999,
    discountedPrice: 1699,
    fabric: '100% Pure Linen',
    fit: 'Relaxed',
    color: 'Off White',
    care: ['Hand wash preferred', 'Flat dry in shade', 'Cool iron'],
    isFeatured: false,
    isActive: true,
    images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600' }],
    sizes: [
      { size: 'S', stock: 15 },
      { size: 'M', stock: 20 },
      { size: 'L', stock: 20 },
      { size: 'XL', stock: 15 },
      { size: 'XXL', stock: 10 }
    ],
    tags: ['linen', 'casual', 'summer', 'breathable', 'relaxed']
  },
  {
    name: 'Printed Heritage',
    variety: 'Printed Heritage',
    description: 'Bold artistic prints inspired by Indian heritage motifs on premium cotton. Each piece is a wearable work of art that makes a statement while staying true to our roots.',
    price: 1899,
    discountedPrice: 1499,
    fabric: '100% Fine Cotton',
    fit: 'Regular',
    color: 'Multicolor',
    care: ['Machine wash cold separately', 'Do not wring', 'Iron inside out'],
    isFeatured: true,
    isActive: true,
    images: [{ url: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4dce?w=600' }],
    sizes: [
      { size: 'S', stock: 12 },
      { size: 'M', stock: 18 },
      { size: 'L', stock: 18 },
      { size: 'XL', stock: 10 },
      { size: 'XXL', stock: 6 }
    ],
    tags: ['printed', 'heritage', 'ethnic', 'artistic', 'statement']
  }
];

const seed = async () => {
  await pool.query('SELECT 1');
  await ensureSchema();
  console.log('Connected to MySQL');

  await Product.deleteMany({});
  await User.deleteMany({ role: 'admin' });

  const productsWithSlugs = products.map((p) => ({
    ...p,
    slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now() + Math.floor(Math.random() * 1000)
  }));
  await Product.insertMany(productsWithSlugs);
  console.log(`Inserted ${products.length} products`);

  const admin = await User.create({
    name: 'Label Nine Admin',
    email: process.env.ADMIN_EMAIL || 'admin@labelnine.com',
    password: process.env.ADMIN_PASSWORD || 'Admin@123',
    role: 'admin',
    isEmailVerified: true,
    isPhoneVerified: true
  });
  console.log(`Admin created: ${admin.email}`);

  await pool.end();
  console.log('Seed complete!');
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
