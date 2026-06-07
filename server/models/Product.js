const { pool } = require('../config/db');
const { formatProduct } = require('../utils/format');

const generateSlug = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();

class Product {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    await pool.query(
      `UPDATE products SET name=?, slug=?, variety=?, description=?, price=?, discounted_price=?,
       fabric=?, fit=?, color=?, care=?, is_active=?, is_featured=?, tags=?, updated_at=NOW()
       WHERE id=?`,
      [
        this.name,
        this.slug,
        this.variety,
        this.description,
        this.price,
        this.discountedPrice,
        this.fabric || null,
        this.fit || null,
        this.color || null,
        JSON.stringify(this.care || []),
        this.isActive ? 1 : 0,
        this.isFeatured ? 1 : 0,
        JSON.stringify(this.tags || []),
        this.id
      ]
    );

    for (const s of this.sizes) {
      await pool.query(
        `INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
        [this.id, s.size, s.stock]
      );
    }
    return this;
  }

  static async _loadRelations(productId) {
    const [[images], [sizes]] = await Promise.all([
      pool.query('SELECT url, public_id FROM product_images WHERE product_id = ?', [productId]),
      pool.query('SELECT size, stock FROM product_sizes WHERE product_id = ?', [productId])
    ]);
    return { images, sizes };
  }

  static async _formatRow(row) {
    if (!row) return null;
    const { images, sizes } = await Product._loadRelations(row.id);
    return formatProduct(row, images, sizes);
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    const formatted = await Product._formatRow(rows[0]);
    return formatted ? new Product(formatted) : null;
  }

  static async findOne(conditions) {
    const params = [];
    let sql = 'SELECT * FROM products WHERE 1=1';

    if (conditions.$or) {
      const parts = [];
      for (const cond of conditions.$or) {
        if (cond._id) {
          parts.push('id = ?');
          params.push(cond._id);
        } else if (cond.slug) {
          parts.push('slug = ?');
          params.push(cond.slug);
        }
      }
      sql += ` AND (${parts.join(' OR ')})`;
    }

    if (conditions.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(conditions.isActive ? 1 : 0);
    }

    const [rows] = await pool.query(sql, params);
    const formatted = await Product._formatRow(rows[0]);
    return formatted ? new Product(formatted) : null;
  }

  static async find(conditions = {}, options = {}) {
    const params = [];
    let sql = 'SELECT * FROM products WHERE 1=1';

    if (conditions.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(conditions.isActive ? 1 : 0);
    }
    if (conditions.variety) {
      sql += ' AND variety = ?';
      params.push(conditions.variety);
    }
    if (conditions.isFeatured) {
      sql += ' AND is_featured = ?';
      params.push(conditions.isFeatured ? 1 : 0);
    }
    if (conditions.name?.$regex) {
      sql += ' AND name LIKE ?';
      params.push(`%${conditions.name.$regex}%`);
    }
    if (conditions.price?.$gte !== undefined) {
      sql += ' AND price >= ?';
      params.push(conditions.price.$gte);
    }
    if (conditions.price?.$lte !== undefined) {
      sql += ' AND price <= ?';
      params.push(conditions.price.$lte);
    }
    if (conditions['sizes']?.$elemMatch) {
      sql += ` AND EXISTS (
        SELECT 1 FROM product_sizes ps
        WHERE ps.product_id = products.id AND ps.size = ? AND ps.stock > ?
      )`;
      params.push(conditions.sizes.$elemMatch.size, conditions.sizes.$elemMatch.stock?.$gt || 0);
    }

    const sortMap = {
      price: options.sort?.price,
      createdAt: options.sort?.createdAt,
      ratings: options.sort?.ratings
    };
    if (sortMap.price) sql += ` ORDER BY price ${sortMap.price === 1 ? 'ASC' : 'DESC'}`;
    else if (sortMap.createdAt) sql += ` ORDER BY created_at ${sortMap.createdAt === -1 ? 'DESC' : 'ASC'}`;
    else if (sortMap.ratings) sql += ` ORDER BY ratings ${sortMap.ratings === -1 ? 'DESC' : 'ASC'}`;
    else sql += ' ORDER BY created_at DESC';

    if (options.skip !== undefined) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(options.limit || 12, options.skip);
    }

    const [rows] = await pool.query(sql, params);
    return Promise.all(rows.map((row) => Product._formatRow(row)));
  }

  static async countDocuments(conditions = {}) {
    const params = [];
    let sql = 'SELECT COUNT(*) as count FROM products WHERE 1=1';

    if (conditions.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(conditions.isActive ? 1 : 0);
    }
    if (conditions.variety) {
      sql += ' AND variety = ?';
      params.push(conditions.variety);
    }
    if (conditions.isFeatured) {
      sql += ' AND is_featured = ?';
      params.push(conditions.isFeatured ? 1 : 0);
    }
    if (conditions.name?.$regex) {
      sql += ' AND name LIKE ?';
      params.push(`%${conditions.name.$regex}%`);
    }
    if (conditions.price?.$gte !== undefined) {
      sql += ' AND price >= ?';
      params.push(conditions.price.$gte);
    }
    if (conditions.price?.$lte !== undefined) {
      sql += ' AND price <= ?';
      params.push(conditions.price.$lte);
    }
    if (conditions['sizes']?.$elemMatch) {
      sql += ` AND EXISTS (
        SELECT 1 FROM product_sizes ps
        WHERE ps.product_id = products.id AND ps.size = ? AND ps.stock > ?
      )`;
      params.push(conditions.sizes.$elemMatch.size, conditions.sizes.$elemMatch.stock?.$gt || 0);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  static async create(data) {
    const slug = data.slug || generateSlug(data.name);
    const [result] = await pool.query(
      `INSERT INTO products (name, slug, variety, description, price, discounted_price, fabric, fit, color, care, is_active, is_featured, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        slug,
        data.variety,
        data.description,
        data.price,
        data.discountedPrice || null,
        data.fabric || null,
        data.fit || null,
        data.color || null,
        JSON.stringify(data.care || []),
        data.isActive !== false ? 1 : 0,
        data.isFeatured ? 1 : 0,
        JSON.stringify(data.tags || [])
      ]
    );

    const productId = result.insertId;

    for (const img of data.images || []) {
      await pool.query(
        'INSERT INTO product_images (product_id, url, public_id) VALUES (?, ?, ?)',
        [productId, img.url, img.publicId || null]
      );
    }

    for (const s of data.sizes || []) {
      await pool.query(
        'INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)',
        [productId, s.size, s.stock]
      );
    }

    return Product.findById(productId);
  }

  static async findByIdAndUpdate(id, updates, options = {}) {
    const existing = await Product.findById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates, id: existing.id, _id: existing._id };
    const product = new Product(merged);

    await pool.query(
      `UPDATE products SET name=?, variety=?, description=?, price=?, discounted_price=?,
       fabric=?, fit=?, color=?, care=?, is_active=?, is_featured=?, tags=?, updated_at=NOW()
       WHERE id=?`,
      [
        product.name,
        product.variety,
        product.description,
        product.price,
        product.discountedPrice,
        product.fabric || null,
        product.fit || null,
        product.color || null,
        JSON.stringify(product.care || []),
        product.isActive ? 1 : 0,
        product.isFeatured ? 1 : 0,
        JSON.stringify(product.tags || []),
        id
      ]
    );

    if (updates.images) {
      await pool.query('DELETE FROM product_images WHERE product_id = ?', [id]);
      for (const img of updates.images) {
        await pool.query(
          'INSERT INTO product_images (product_id, url, public_id) VALUES (?, ?, ?)',
          [id, img.url, img.publicId || null]
        );
      }
    }

    if (updates.sizes) {
      for (const s of updates.sizes) {
        await pool.query(
          `INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
          [id, s.size, s.stock]
        );
      }
    }

    return Product.findById(id);
  }

  static async updateOne(filter, update) {
    if (update.$inc?.['sizes.$.stock'] !== undefined) {
      const delta = update.$inc['sizes.$.stock'];
      await pool.query(
        'UPDATE product_sizes SET stock = stock + ? WHERE product_id = ? AND size = ?',
        [delta, filter._id, filter['sizes.size']]
      );
    }
  }

  static async insertMany(items) {
    for (const item of items) {
      await Product.create(item);
    }
  }

  static async deleteMany() {
    await pool.query('DELETE FROM product_images');
    await pool.query('DELETE FROM product_sizes');
    const [result] = await pool.query('DELETE FROM products');
    return { deletedCount: result.affectedRows };
  }

  static async findLowStock(limit = 10) {
    const [rows] = await pool.query(
      `SELECT p.id, p.name FROM products p
       JOIN product_sizes ps ON p.id = ps.product_id
       WHERE p.is_active = 1 AND ps.stock <= 5
       GROUP BY p.id, p.name
       LIMIT ?`,
      [limit]
    );

    return Promise.all(
      rows.map(async (row) => {
        const product = await Product.findById(row.id);
        return { _id: product._id, name: product.name, sizes: product.sizes };
      })
    );
  }
}

module.exports = Product;
