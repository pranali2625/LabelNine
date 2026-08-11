const { pool } = require('../config/db');
const { normalizeEmail, normalizePhone } = require('./authNormalize');
const {
  isEligibleForNewCustomerDiscount,
  roundMoney,
  snapPayableToWholeRupee
} = require('./newCustomerDiscount');

function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function mapCouponRow(coupon) {
  if (!coupon) return null;
  return {
    id: coupon.id,
    code: coupon.code,
    discountPercent: Number(coupon.discount_percent),
    firstOrderOnly: Boolean(coupon.first_order_only),
    isPublic: Boolean(coupon.is_public),
    isActive: Boolean(coupon.is_active),
    productIds: []
  };
}

function itemProductId(item) {
  return Number(item?.productId ?? item?.product ?? item?._id ?? 0) || 0;
}

/**
 * Sum of line totals eligible for a coupon.
 * - If productIds is non-empty: only those products
 * - If empty + public coupon: applies to nothing until products are selected
 * - If empty + invite coupon: applies to whole cart
 */
function getCouponEligibleSubtotal(items, coupon, fallbackItemsPrice = 0) {
  const productIds = Array.isArray(coupon?.productIds) ? coupon.productIds : [];
  const restricted = productIds.length > 0;
  const publicNeedsSelection = Boolean(coupon?.isPublic) && !restricted;

  if (publicNeedsSelection) {
    return 0;
  }

  const allowed = restricted
    ? new Set(productIds.map((id) => Number(id)))
    : null;

  if (Array.isArray(items) && items.length) {
    return roundMoney(
      items.reduce((sum, i) => {
        const pid = itemProductId(i);
        if (allowed && !allowed.has(pid)) return sum;
        return sum + (Number(i.price) || 0) * (Number(i.quantity) || 0);
      }, 0)
    );
  }

  if (restricted) return 0;
  return roundMoney(Number(fallbackItemsPrice) || 0);
}

async function loadCouponProductIds(couponId) {
  const [rows] = await pool.query(
    `SELECT product_id FROM invite_coupon_products WHERE coupon_id = ?`,
    [couponId]
  );
  return rows.map((r) => Number(r.product_id));
}

/**
 * Resolve a coupon for a user.
 * - Public codes (e.g. FREEDOM15): any signed-in user, reusable
 * - Invite codes: allowlisted email/phone, unused, optional first-order-only
 * Product scope comes from invite_coupon_products (empty = all products).
 */
async function resolveInviteCoupon(user, code) {
  const normalized = normalizeCouponCode(code);
  if (!normalized || !user) {
    return { ok: false, message: 'Enter a coupon code' };
  }

  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);

  const [couponRows] = await pool.query(
    `SELECT id, code, discount_percent, first_order_only, is_active, is_public
     FROM invite_coupons
     WHERE code = ?
     LIMIT 1`,
    [normalized]
  );
  const coupon = mapCouponRow(couponRows[0]);
  if (!coupon || !coupon.isActive) {
    return { ok: false, message: 'Invalid coupon code' };
  }

  coupon.productIds = await loadCouponProductIds(coupon.id);

  if (coupon.isPublic) {
    if (coupon.firstOrderOnly) {
      const eligible = await isEligibleForNewCustomerDiscount(user);
      if (!eligible) {
        return { ok: false, message: 'This coupon is only valid on your first order' };
      }
    }
    return {
      ok: true,
      coupon: {
        ...coupon,
        allowlistId: null
      }
    };
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

  if (coupon.firstOrderOnly) {
    const eligible = await isEligibleForNewCustomerDiscount(user);
    if (!eligible) {
      return { ok: false, message: 'This coupon is only valid on your first order' };
    }
  }

  return {
    ok: true,
    coupon: {
      ...coupon,
      allowlistId: allow.id
    }
  };
}

function calculateInviteCouponDiscount(itemsPrice, coupon, items = null) {
  const fullSubtotal = Number(itemsPrice) || 0;
  const percent = Number(coupon?.discountPercent) || 0;
  const eligibleSubtotal = getCouponEligibleSubtotal(items, coupon, fullSubtotal);
  const productScoped = Array.isArray(coupon?.productIds) && coupon.productIds.length > 0;

  if (!coupon || eligibleSubtotal <= 0 || percent <= 0) {
    return {
      eligible: false,
      discountPercent: percent,
      discountCode: coupon?.code || null,
      discountAmount: 0,
      discountedItemsPrice: fullSubtotal,
      eligibleSubtotal,
      allowlistId: coupon?.allowlistId || null,
      productScoped
    };
  }

  const discountAmount = roundMoney(eligibleSubtotal * (percent / 100));
  return {
    eligible: true,
    discountPercent: percent,
    discountCode: coupon.code,
    discountAmount,
    discountedItemsPrice: roundMoney(fullSubtotal - discountAmount),
    eligibleSubtotal,
    allowlistId: coupon.allowlistId,
    productScoped
  };
}

/**
 * Stack invite/public coupon + WELCOME10 when both apply.
 * Coupon may be limited to selected products; welcome still uses full itemsPrice.
 */
async function resolveOrderDiscount(user, itemsPrice, couponCode, items = null) {
  const {
    calculateNewCustomerDiscount,
    NEW_CUSTOMER_DISCOUNT_CODE
  } = require('./newCustomerDiscount');
  const subtotal = Number(itemsPrice) || 0;

  let invitePart = null;
  let allowlistId = null;

  if (couponCode) {
    const resolved = await resolveInviteCoupon(user, couponCode);
    if (!resolved.ok) {
      return { ok: false, message: resolved.message };
    }
    invitePart = calculateInviteCouponDiscount(subtotal, resolved.coupon, items);
    allowlistId = resolved.coupon.allowlistId;

    const productScoped =
      Array.isArray(resolved.coupon.productIds) && resolved.coupon.productIds.length > 0;
    const publicNeedsProducts =
      resolved.coupon.isPublic && !productScoped;

    if ((productScoped || publicNeedsProducts) && (invitePart.eligibleSubtotal || 0) <= 0 && subtotal > 0) {
      return {
        ok: false,
        message: publicNeedsProducts
          ? 'This coupon is not set up for any products yet'
          : 'This coupon does not apply to items in your cart'
      };
    }
  }

  const eligible = await isEligibleForNewCustomerDiscount(user);
  const welcomePart = calculateNewCustomerDiscount(subtotal, eligible);

  const welcomeAmount = welcomePart.discountAmount || 0;
  const inviteAmount = invitePart?.discountAmount || 0;
  const rawDiscount = roundMoney(welcomeAmount + inviteAmount);
  const snapped = snapPayableToWholeRupee(subtotal, rawDiscount);

  const codes = [];
  if (welcomeAmount > 0) codes.push(NEW_CUSTOMER_DISCOUNT_CODE);
  if (inviteAmount > 0) codes.push(invitePart.discountCode);

  return {
    ok: true,
    source: codes.length > 1 ? 'both' : inviteAmount > 0 ? 'invite' : 'welcome',
    discount: {
      eligible: snapped.discountAmount > 0,
      discountPercent:
        inviteAmount > 0 && welcomeAmount > 0
          ? welcomePart.discountPercent + invitePart.discountPercent
          : inviteAmount > 0
            ? invitePart.discountPercent
            : welcomePart.discountPercent,
      discountCode: codes.length ? codes.join('+') : null,
      discountAmount: snapped.discountAmount,
      discountedItemsPrice: snapped.totalAmount,
      welcomeAmount,
      inviteAmount,
      eligibleSubtotal: invitePart?.eligibleSubtotal ?? subtotal,
      productScoped: Boolean(invitePart?.productScoped)
    },
    allowlistId
  };
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
  const { NEW_CUSTOMER_DISCOUNT_CODE } = require('./newCustomerDiscount');
  const parts = String(code || '')
    .split('+')
    .map((c) => normalizeCouponCode(c))
    .filter((c) => c && c !== NEW_CUSTOMER_DISCOUNT_CODE);
  const normalized = parts[0];
  if (!normalized || !user) return;

  const [couponRows] = await pool.query(
    `SELECT id, is_public FROM invite_coupons WHERE code = ? LIMIT 1`,
    [normalized]
  );
  if (!couponRows.length || couponRows[0].is_public) return;

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

/** Freedom Sale — public 15%; apply only to products linked in Admin → Coupons. */
async function ensureFreedomSaleCoupon() {
  const [rows] = await pool.query(
    `SELECT id FROM invite_coupons WHERE code = 'FREEDOM15' LIMIT 1`
  );
  if (rows.length) {
    await pool.query(
      `UPDATE invite_coupons
       SET discount_percent = 15,
           first_order_only = 0,
           is_public = 1,
           exclude_discounted_products = 0,
           is_active = 1
       WHERE code = 'FREEDOM15'`
    );
    return;
  }
  await pool.query(
    `INSERT INTO invite_coupons
      (code, discount_percent, first_order_only, is_active, is_public, exclude_discounted_products)
     VALUES ('FREEDOM15', 15, 0, 1, 1, 0)`
  );
}

module.exports = {
  normalizeCouponCode,
  resolveInviteCoupon,
  calculateInviteCouponDiscount,
  getCouponEligibleSubtotal,
  loadCouponProductIds,
  resolveOrderDiscount,
  markInviteCouponUsed,
  markInviteCouponUsedForUser,
  ensureDefaultInviteCoupon,
  ensureFreedomSaleCoupon
};
