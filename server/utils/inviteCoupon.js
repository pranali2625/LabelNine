const { pool } = require('../config/db');
const { normalizeEmail, normalizePhone } = require('./authNormalize');
const {
  isEligibleForNewCustomerDiscount,
  roundMoney
} = require('./newCustomerDiscount');

function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * Resolve an invite coupon for a user.
 * Rules: active code, allowlisted email/phone, unused, first-order if required.
 */
async function resolveInviteCoupon(user, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized || !user) {
    return { ok: false, message: 'Enter a coupon code' };
  }

  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);

  const [couponRows] = await pool.query(
    `SELECT id, code, discount_percent, first_order_only, is_active
     FROM invite_coupons
     WHERE code = ?
     LIMIT 1`,
    [normalized]
  );
  const coupon = couponRows[0];
  if (!coupon || !coupon.is_active) {
    return { ok: false, message: 'Invalid coupon code' };
  }

  const [allowRows] = await pool.query(
    `SELECT id, email, phone, used_at, used_order_id
     FROM invite_coupon_customers
     WHERE coupon_id = ?
       AND (
         (? <> '' AND email = ?)
         OR (? <> '' AND phone = ?)
       )
     ORDER BY id ASC
     LIMIT 1`,
    [coupon.id, email, email, phone, phone]
  );
  const allow = allowRows[0];
  if (!allow) {
    return { ok: false, message: 'This coupon is not available for your account' };
  }
  if (allow.used_at) {
    return { ok: false, message: 'This coupon has already been used' };
  }

  if (Number(coupon.first_order_only)) {
    const eligible = await isEligibleForNewCustomerDiscount(user);
    if (!eligible) {
      return { ok: false, message: 'This coupon is only valid on your first order' };
    }
  }

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountPercent: Number(coupon.discount_percent),
      allowlistId: allow.id
    }
  };
}

function calculateInviteCouponDiscount(itemsPrice, coupon) {
  const subtotal = Number(itemsPrice) || 0;
  const percent = Number(coupon?.discountPercent) || 0;
  if (!coupon || subtotal <= 0 || percent <= 0) {
    return {
      eligible: false,
      discountPercent: percent,
      discountCode: coupon?.code || null,
      discountAmount: 0,
      discountedItemsPrice: subtotal,
      allowlistId: coupon?.allowlistId || null
    };
  }

  const discountAmount = roundMoney(subtotal * (percent / 100));
  return {
    eligible: true,
    discountPercent: percent,
    discountCode: coupon.code,
    discountAmount,
    discountedItemsPrice: roundMoney(subtotal - discountAmount),
    allowlistId: coupon.allowlistId
  };
}

/**
 * Prefer invite coupon when provided; otherwise fall back to WELCOME10 auto discount.
 */
async function resolveOrderDiscount(user, itemsPrice, couponCode) {
  const subtotal = Number(itemsPrice) || 0;
  if (couponCode) {
    const resolved = await resolveInviteCoupon(user, couponCode);
    if (!resolved.ok) {
      return { ok: false, message: resolved.message };
    }
    const discount = calculateInviteCouponDiscount(subtotal, resolved.coupon);
    return {
      ok: true,
      source: 'invite',
      discount,
      allowlistId: resolved.coupon.allowlistId
    };
  }

  const { calculateNewCustomerDiscount } = require('./newCustomerDiscount');
  const eligible = await isEligibleForNewCustomerDiscount(user);
  const discount = calculateNewCustomerDiscount(subtotal, eligible);
  return { ok: true, source: 'welcome', discount, allowlistId: null };
}

async function markInviteCouponUsed(allowlistId, orderId) {
  if (!allowlistId) return;
  await pool.query(
    `UPDATE invite_coupon_customers
     SET used_at = NOW(), used_order_id = ?
     WHERE id = ? AND used_at IS NULL`,
    [orderId || null, allowlistId]
  );
}

async function markInviteCouponUsedForUser(user, code, orderId) {
  const normalized = normalizeCouponCode(code);
  if (!normalized || !user) return;

  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);

  await pool.query(
    `UPDATE invite_coupon_customers icc
     INNER JOIN invite_coupons ic ON ic.id = icc.coupon_id
     SET icc.used_at = NOW(), icc.used_order_id = ?
     WHERE ic.code = ?
       AND icc.used_at IS NULL
       AND (
         (? <> '' AND icc.email = ?)
         OR (? <> '' AND icc.phone = ?)
       )`,
    [orderId || null, normalized, email, email, phone, phone]
  );
}

async function ensureDefaultInviteCoupon() {
  const [rows] = await pool.query(
    `SELECT id FROM invite_coupons WHERE code = 'SPECIAL10' LIMIT 1`
  );
  if (rows.length) return;
  await pool.query(
    `INSERT INTO invite_coupons (code, discount_percent, first_order_only, is_active)
     VALUES ('SPECIAL10', 10, 1, 1)`
  );
}

module.exports = {
  normalizeCouponCode,
  resolveInviteCoupon,
  calculateInviteCouponDiscount,
  resolveOrderDiscount,
  markInviteCouponUsed,
  markInviteCouponUsedForUser,
  ensureDefaultInviteCoupon
};
