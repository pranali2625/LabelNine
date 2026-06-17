const { pool } = require('../config/db');
const { formatOrder } = require('../utils/format');

class Order {
  constructor(data) {
    Object.assign(this, data);
  }

  async save(conn) {
    const db = conn || pool;
    await db.query(
      `UPDATE orders SET order_status=?, payment_status=?, razorpay_order_id=?, razorpay_payment_id=?,
       razorpay_signature=?, paid_at=?, delivered_at=?, cancellation_reason=?, updated_at=NOW()
       WHERE id=?`,
      [
        this.orderStatus,
        this.paymentInfo?.status || 'pending',
        this.paymentInfo?.razorpayOrderId || null,
        this.paymentInfo?.razorpayPaymentId || null,
        this.paymentInfo?.razorpaySignature || null,
        this.paymentInfo?.paidAt || null,
        this.deliveredAt || null,
        this.cancellationReason || null,
        this.id
      ]
    );

    for (const event of this.trackingHistory || []) {
      if (!event._id) {
        await db.query(
          'INSERT INTO order_tracking (order_id, status, message, location, tracked_at) VALUES (?, ?, ?, ?, ?)',
          [this.id, event.status, event.message, event.location || null, event.timestamp || new Date()]
        );
      }
    }
    return this;
  }

  static async _loadItems(orderId, populateProduct = false) {
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
    if (!populateProduct) return items;

    return Promise.all(
      items.map(async (item) => {
        const [images] = await pool.query(
          'SELECT url FROM product_images WHERE product_id = ? LIMIT 1',
          [item.product_id]
        );
        const [productRow] = await pool.query(
          'SELECT id, name, variety, slug FROM products WHERE id = ?',
          [item.product_id]
        );
        const product = productRow[0]
          ? {
              id: productRow[0].id,
              name: productRow[0].name,
              variety: productRow[0].variety,
              slug: productRow[0].slug,
              images: images.map((img) => ({ url: img.url }))
            }
          : null;
        return { ...item, product };
      })
    );
  }

  static async _loadTracking(orderId) {
    const [rows] = await pool.query(
      'SELECT * FROM order_tracking WHERE order_id = ? ORDER BY tracked_at ASC',
      [orderId]
    );
    return rows;
  }

  static async _loadUser(userId) {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone FROM users WHERE id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  static async _formatRow(row, options = {}) {
    if (!row) return null;
    const populateProduct = options.populate?.includes('items.product');
    const populateUser = options.populate?.includes('user');
    const [items, tracking, user] = await Promise.all([
      Order._loadItems(row.id, populateProduct),
      Order._loadTracking(row.id),
      populateUser ? Order._loadUser(row.user_id) : null
    ]);
    return formatOrder(row, items, tracking, user);
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    const formatted = await Order._formatRow(rows[0]);
    return formatted ? new Order(formatted) : null;
  }

  static async findOne(conditions, options = {}) {
    const params = [];
    let sql = 'SELECT * FROM orders WHERE 1=1';

    if (conditions.orderId) {
      sql += ' AND order_id = ?';
      params.push(conditions.orderId);
    }
    if (conditions.user) {
      sql += ' AND user_id = ?';
      params.push(conditions.user);
    }
    if (conditions.$or) {
      const parts = [];
      for (const cond of conditions.$or) {
        if (cond._id) {
          parts.push('id = ?');
          params.push(cond._id);
        } else if (cond.orderId) {
          parts.push('order_id = ?');
          params.push(cond.orderId);
        }
      }
      if (parts.length) sql += ` AND (${parts.join(' OR ')})`;
    }

    const [rows] = await pool.query(sql, params);
    const formatted = await Order._formatRow(rows[0], options);
    return formatted ? new Order(formatted) : null;
  }

  static async find(conditions = {}, options = {}) {
    const params = [];
    let sql = 'SELECT * FROM orders WHERE 1=1';

    if (conditions.user) {
      sql += ' AND user_id = ?';
      params.push(conditions.user);
    }
    if (conditions.orderStatus) {
      sql += ' AND order_status = ?';
      params.push(conditions.orderStatus);
    }
    if (conditions.orderStatus?.$in) {
      sql += ` AND order_status IN (${conditions.orderStatus.$in.map(() => '?').join(',')})`;
      params.push(...conditions.orderStatus.$in);
    }
    if (conditions.orderId?.$regex) {
      sql += ' AND order_id LIKE ?';
      params.push(`%${conditions.orderId.$regex}%`);
    }
    if (conditions['paymentInfo.status']) {
      sql += ' AND payment_status = ?';
      params.push(conditions['paymentInfo.status']);
    }

    if (options.sort?.createdAt === -1) sql += ' ORDER BY created_at DESC';

    if (options.skip !== undefined) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(options.limit || 20, options.skip);
    } else if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.query(sql, params);
    return Promise.all(rows.map((row) => Order._formatRow(row, options)));
  }

  static async countDocuments(conditions = {}) {
    const params = [];
    let sql = 'SELECT COUNT(*) as count FROM orders WHERE 1=1';

    if (conditions.orderStatus) {
      sql += ' AND order_status = ?';
      params.push(conditions.orderStatus);
    }
    if (conditions.orderStatus?.$in) {
      sql += ` AND order_status IN (${conditions.orderStatus.$in.map(() => '?').join(',')})`;
      params.push(...conditions.orderStatus.$in);
    }
    if (conditions.orderId?.$regex) {
      sql += ' AND order_id LIKE ?';
      params.push(`%${conditions.orderId.$regex}%`);
    }

    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  static async create(data, conn) {
    const db = conn || pool;
    const addr = data.shippingAddress;
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 6);

    const [result] = await db.query(
      `INSERT INTO orders (
        order_id, user_id, shipping_name, shipping_phone, shipping_line1, shipping_line2,
        shipping_city, shipping_state, shipping_pincode, items_price, shipping_price, tax_price,
        total_amount, payment_method, payment_status, order_status, estimated_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.orderId,
        data.user,
        addr.name,
        addr.phone,
        addr.line1,
        addr.line2 || null,
        addr.city,
        addr.state,
        addr.pincode,
        data.itemsPrice,
        data.shippingPrice,
        data.taxPrice,
        data.totalAmount,
        data.paymentInfo?.method || 'COD',
        data.paymentInfo?.status || 'pending',
        data.orderStatus || 'placed',
        estimatedDelivery
      ]
    );

    const orderDbId = result.insertId;

    for (const item of data.items) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, name, image, size, quantity, price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderDbId,
          item.product,
          item.name,
          item.image || '',
          item.size,
          item.quantity,
          item.price
        ]
      );
    }

    await db.query(
      'INSERT INTO order_tracking (order_id, status, message, tracked_at) VALUES (?, ?, ?, NOW())',
      [orderDbId, 'placed', 'Your order has been placed successfully']
    );

    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [orderDbId]);
    const formatted = await Order._formatRow(rows[0]);
    return new Order(formatted);
  }

  static async aggregate(pipeline) {
    if (pipeline?.[0]?.$match?.['paymentInfo.status'] === 'paid') {
      const [rows] = await pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders
         WHERE payment_status = 'paid'
            OR (payment_method = 'COD' AND order_status NOT IN ('cancelled', 'returned'))`
      );
      return [{ total: Number(rows[0].total) }];
    }
    return [];
  }

  static async findOneAndUpdate(filter, update) {
    const order = await Order.findOne({ orderId: filter.orderId });
    if (!order) return null;

    const setFields = {};
    if (update['paymentInfo.status']) setFields.payment_status = update['paymentInfo.status'];
    if (update['paymentInfo.razorpayPaymentId']) setFields.razorpay_payment_id = update['paymentInfo.razorpayPaymentId'];
    if (update['paymentInfo.paidAt']) setFields.paid_at = update['paymentInfo.paidAt'];
    if (update.orderStatus) setFields.order_status = update.orderStatus;

    const sets = Object.entries(setFields).map(([k]) => `${k} = ?`);
    const vals = Object.values(setFields);

    if (sets.length) {
      await pool.query(`UPDATE orders SET ${sets.join(', ')}, updated_at=NOW() WHERE order_id = ?`, [
        ...vals,
        filter.orderId
      ]);
    }

    if (update.$push?.trackingHistory) {
      const t = update.$push.trackingHistory;
      const [rows] = await pool.query('SELECT id FROM orders WHERE order_id = ?', [filter.orderId]);
      if (rows[0]) {
        await pool.query(
          'INSERT INTO order_tracking (order_id, status, message, tracked_at) VALUES (?, ?, ?, ?)',
          [rows[0].id, t.status, t.message, t.timestamp || new Date()]
        );
      }
    }

    return Order.findOne({ orderId: filter.orderId });
  }

  static async findForTracking(orderId) {
    const [rows] = await pool.query(
      `SELECT order_id, order_status, estimated_delivery, delivered_at, created_at,
              shipping_city, shipping_state, items_price, shipping_price, tax_price, total_amount,
              payment_status, payment_method
       FROM orders WHERE order_id = ?`,
      [orderId]
    );
    if (!rows[0]) return null;

    const row = rows[0];
    const [items] = await pool.query(
      'SELECT name, size, quantity FROM order_items WHERE order_id = (SELECT id FROM orders WHERE order_id = ?)',
      [orderId]
    );
    const [tracking] = await pool.query(
      'SELECT status, message, tracked_at, location FROM order_tracking WHERE order_id = (SELECT id FROM orders WHERE order_id = ?) ORDER BY tracked_at ASC',
      [orderId]
    );

    return {
      orderId: row.order_id,
      orderStatus: row.order_status,
      estimatedDelivery: row.estimated_delivery,
      deliveredAt: row.delivered_at,
      createdAt: row.created_at,
      shippingAddress: { city: row.shipping_city, state: row.shipping_state },
      items: items.map((i) => ({ name: i.name, size: i.size, quantity: i.quantity })),
      totalAmount: Number(row.total_amount),
      paymentInfo: { status: row.payment_status },
      trackingHistory: tracking.map((t) => ({
        status: t.status,
        message: t.message,
        timestamp: t.tracked_at,
        location: t.location
      }))
    };
  }
}

module.exports = Order;
