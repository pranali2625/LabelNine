const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { formatUser } = require('../utils/format');

class User {
  constructor(data) {
    Object.assign(this, data);
  }

  async save() {
    if (this._id) {
      await pool.query(
        `UPDATE users SET name=?, email=?, phone=?, password=?, role=?,
         is_phone_verified=?, is_email_verified=?, is_active=?, otp=?, otp_expire=?,
         profile_picture=?, updated_at=NOW() WHERE id=?`,
        [
          this.name,
          this.email || null,
          this.phone || null,
          this.password || null,
          this.role,
          this.isPhoneVerified ? 1 : 0,
          this.isEmailVerified ? 1 : 0,
          this.isActive ? 1 : 0,
          this.otp || null,
          this.otpExpire || null,
          this.profilePicture || null,
          this.id
        ]
      );
    }
    return this;
  }

  async matchPassword(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
  }

  generateOtp() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpire = new Date(Date.now() + 10 * 60 * 1000);
    return otp;
  }

  static async _loadAddresses(userId) {
    const [rows] = await pool.query('SELECT * FROM user_addresses WHERE user_id = ?', [userId]);
    return rows;
  }

  static async _toUserInstance(row, options = {}) {
    if (!row) return null;
    const addresses = await User._loadAddresses(row.id);
    const user = formatUser(row, addresses);
    if (options.excludePassword) delete user.password;
    if (options.excludeOtp) {
      delete user.otp;
      delete user.otpExpire;
    }
    const instance = new User(user);
    instance.id = row.id;
    return instance;
  }

  static async findById(id, select = '') {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    const excludePassword = select.includes('-password');
    const includePassword = select.includes('+password');
    const excludeOtp = !select.includes('+otp');
    const user = await User._toUserInstance(rows[0], {
      excludePassword: excludePassword && !includePassword,
      excludeOtp: excludeOtp && !select.includes('+otp')
    });
    return user;
  }

  static async findOne(conditions, select = '') {
    const params = [];
    let sql = 'SELECT * FROM users WHERE 1=1';

    if (conditions.$or) {
      const parts = conditions.$or.map((cond) => {
        const key = Object.keys(cond)[0];
        params.push(cond[key]);
        return key === 'email' ? 'email = ?' : 'phone = ?';
      });
      sql += ` AND (${parts.join(' OR ')})`;
    } else if (conditions.email) {
      sql += ' AND email = ?';
      params.push(conditions.email);
    } else if (conditions.phone) {
      sql += ' AND phone = ?';
      params.push(conditions.phone);
    } else if (conditions.id || conditions._id) {
      sql += ' AND id = ?';
      params.push(conditions.id || conditions._id);
    }

    const [rows] = await pool.query(sql, params);
    const excludePassword = select.includes('-password');
    const includePassword = select.includes('+password');
    const excludeOtp = !select.includes('+otp') && !select.includes('+otpExpire');
    return User._toUserInstance(rows[0], {
      excludePassword: excludePassword && !includePassword,
      excludeOtp: excludeOtp && !select.includes('+otp')
    });
  }

  static async find(conditions = {}, options = {}) {
    const params = [];
    let sql = 'SELECT * FROM users WHERE 1=1';

    if (conditions.role) {
      sql += ' AND role = ?';
      params.push(conditions.role);
    }

    if (conditions.$or) {
      const parts = [];
      for (const cond of conditions.$or) {
        const key = Object.keys(cond)[0];
        if (cond[key]?.$regex) {
          parts.push(`${key === 'name' ? 'name' : key} LIKE ?`);
          params.push(`%${cond[key].$regex}%`);
        }
      }
      if (parts.length) sql += ` AND (${parts.join(' OR ')})`;
    }

    if (options.sort?.createdAt === -1) sql += ' ORDER BY created_at DESC';
    if (options.skip) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(options.limit || 20, options.skip);
    } else if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const [rows] = await pool.query(sql, params);
    return Promise.all(rows.map((row) => User._toUserInstance(row, { excludePassword: true, excludeOtp: true })));
  }

  static async countDocuments(conditions = {}) {
    let sql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const params = [];
    if (conditions.role) {
      sql += ' AND role = ?';
      params.push(conditions.role);
    }
    const [rows] = await pool.query(sql, params);
    return rows[0].count;
  }

  static async create(data) {
    let hashedPassword = data.password;
    if (hashedPassword) {
      const salt = await bcrypt.genSalt(12);
      hashedPassword = await bcrypt.hash(hashedPassword, salt);
    }

    const [result] = await pool.query(
      `INSERT INTO users (name, email, phone, password, role, is_phone_verified, is_email_verified, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.email || null,
        data.phone || null,
        hashedPassword || null,
        data.role || 'user',
        data.isPhoneVerified ? 1 : 0,
        data.isEmailVerified ? 1 : 0,
        data.isActive !== false ? 1 : 0
      ]
    );

    return User.findById(result.insertId);
  }

  static async findByIdAndUpdate(id, updates) {
    const fields = [];
    const params = [];

    const map = {
      isActive: 'is_active',
      isPhoneVerified: 'is_phone_verified',
      isEmailVerified: 'is_email_verified'
    };

    for (const [key, col] of Object.entries(map)) {
      if (updates[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(updates[key] ? 1 : 0);
      }
    }

    if (fields.length === 0) return User.findById(id);

    params.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')}, updated_at=NOW() WHERE id=?`, params);
    return User.findById(id);
  }

  static async deleteMany(conditions) {
    if (conditions.role) {
      const [result] = await pool.query('DELETE FROM users WHERE role = ?', [conditions.role]);
      return { deletedCount: result.affectedRows };
    }
    return { deletedCount: 0 };
  }

  async _savePassword(newPassword) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(newPassword, salt);
    await pool.query('UPDATE users SET password=?, updated_at=NOW() WHERE id=?', [this.password, this.id]);
  }

  async saveProfile() {
    if (this.password && !this.password.startsWith('$2')) {
      await this._savePassword(this.password);
    } else {
      await this.save();
    }
  }

  addressesId(addressId) {
    return this.addresses.find((a) => a._id === String(addressId) || a._id === addressId);
  }

  async pushAddress(address) {
    if (address.isDefault) {
      await pool.query('UPDATE user_addresses SET is_default=0 WHERE user_id=?', [this.id]);
    }
    const [result] = await pool.query(
      `INSERT INTO user_addresses (user_id, name, phone, line1, line2, city, state, pincode, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.id,
        address.name,
        address.phone,
        address.line1,
        address.line2 || null,
        address.city,
        address.state,
        address.pincode,
        address.isDefault ? 1 : 0
      ]
    );
    this.addresses.push({
      _id: String(result.insertId),
      ...address,
      isDefault: Boolean(address.isDefault)
    });
  }

  async updateAddress(addressId, data) {
    if (data.isDefault) {
      await pool.query('UPDATE user_addresses SET is_default=0 WHERE user_id=?', [this.id]);
    }
    await pool.query(
      `UPDATE user_addresses SET name=?, phone=?, line1=?, line2=?, city=?, state=?, pincode=?, is_default=?
       WHERE id=? AND user_id=?`,
      [
        data.name,
        data.phone,
        data.line1,
        data.line2 || null,
        data.city,
        data.state,
        data.pincode,
        data.isDefault ? 1 : 0,
        addressId,
        this.id
      ]
    );
    const idx = this.addresses.findIndex((a) => a._id === String(addressId));
    if (idx >= 0) Object.assign(this.addresses[idx], data);
  }

  async pullAddress(addressId) {
    await pool.query('DELETE FROM user_addresses WHERE id=? AND user_id=?', [addressId, this.id]);
    this.addresses = this.addresses.filter((a) => a._id !== String(addressId));
  }
}

module.exports = User;
