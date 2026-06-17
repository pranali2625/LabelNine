const {
  saveSnapshot,
  countSnapshotRows
} = require('../utils/dbSnapshot');

const ALLOWED_SIZES = new Set(['M', 'L', 'XL', 'XXL']);
const DEFAULT_VARIETY = 'Casual Linen';

function apiProductToSnapshotRows(products) {
  const productRows = [];
  const imageRows = [];
  const sizeRows = [];

  products.forEach((p, index) => {
    const id = index + 1;
    const variety = p.variety || DEFAULT_VARIETY;

    productRows.push({
      id,
      name: p.name,
      slug: p.slug || `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id}`,
      variety,
      description: p.description || p.name,
      price: p.price,
      discounted_price: p.discountedPrice ?? null,
      fabric: p.fabric || null,
      fit: p.fit || null,
      color: p.color || null,
      care: JSON.stringify(Array.isArray(p.care) ? p.care : []),
      is_active: p.isActive !== false ? 1 : 0,
      is_featured: p.isFeatured ? 1 : 0,
      ratings: p.ratings ?? 0,
      num_reviews: p.numReviews ?? 0,
      tags: JSON.stringify(Array.isArray(p.tags) ? p.tags : [])
    });

    (p.images || []).forEach((img) => {
      if (!img?.url) return;
      imageRows.push({
        id: imageRows.length + 1,
        product_id: id,
        url: img.url,
        public_id: img.publicId || null
      });
    });

    (p.sizes || []).filter((s) => ALLOWED_SIZES.has(s.size)).forEach((s) => {
      sizeRows.push({
        id: sizeRows.length + 1,
        product_id: id,
        size: s.size,
        stock: Number(s.stock) || 0
      });
    });
  });

  return {
    exportedAt: new Date().toISOString(),
    source: 'api',
    tables: {
      products: productRows,
      product_images: imageRows,
      product_sizes: sizeRows
    }
  };
}

async function pullFromApi({ apiUrl, email, password }) {
  const base = apiUrl.replace(/\/$/, '');

  if (password) {
    try {
      const loginRes = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, password })
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.token) {
        const productsRes = await fetch(`${base}/api/admin/products`, {
          headers: { Authorization: `Bearer ${loginData.token}` }
        });
        const productsData = await productsRes.json();

        if (productsRes.ok && productsData.products?.length) {
          return { ...apiProductToSnapshotRows(productsData.products), source: 'api-admin' };
        }
      }
    } catch {
      // fall through to public API
    }
    console.warn('Admin login failed — using public product list (active products only).');
  } else {
    console.log('No PROD_ADMIN_PASSWORD set — using public product list (active products only).');
  }

  const productsRes = await fetch(`${base}/api/products?limit=100`);
  const productsData = await productsRes.json();

  if (!productsRes.ok) {
    throw new Error(productsData.message || `Failed to fetch products (${productsRes.status})`);
  }

  const products = productsData.products || [];
  if (!products.length) {
    throw new Error('No products returned from production API');
  }

  return { ...apiProductToSnapshotRows(products), source: 'api-public' };
}

module.exports = { pullFromApi, apiProductToSnapshotRows };
