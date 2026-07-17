const { pool } = require('../config/db');
const { normalizeEmail, normalizePhone } = require('./authNormalize');

const NEW_CUSTOMER_DISCOUNT_PERCENT = 10;
const NEW_CUSTOMER_DISCOUNT_CODE = 'WELCOME10';

function roundMoney(amount) {
  return Math.round(Number(amount) * 100) / 100;
}

/** Drop paise — 1399.1 / 1399.10 → 1399 */
function toWholeRupee(amount) {
  const n = Number(amount) || 0;
  return Math.max(0, Math.floor(n + 1e-9));
}

/**
 * Floor payable total to whole rupees; fold leftover into discount so totals match.
 */
function snapPayableToWholeRupee(itemsPrice, discountAmount, shippingPrice = 0, taxPrice = 0) {
  const subtotal = Number(itemsPrice) || 0;
  const shipping = Number(shippingPrice) || 0;
  const tax = Number(taxPrice) || 0;
  const discount = Math.max(0, Number(discountAmount) || 0);
  const totalAmount = toWholeRupee(subtotal - discount + shipping + tax);
  const adjustedDiscount = roundMoney(subtotal + shipping + tax - totalAmount);
  return {
    totalAmount,
    discountAmount: Math.max(0, adjustedDiscount),
    discountedItemsPrice: Math.max(0, totalAmount - shipping - tax)
  };
}

function hasUniqueContact(user) {
  const email = normalizeEmail(user?.email);
  const phone = normalizePhone(user?.phone);
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^[6-9]\d{9}$/.test(phone));
}

/**
 * New customer = unique email + phone on account, and no prior
 * non-cancelled order for this user or the same email/phone.
 */
async function isEligibleForNewCustomerDiscount(user) {
  if (!user?._id && !user?.id) return false;
  if (!hasUniqueContact(user)) return false;

  const userId = Number(user._id || user.id);
  const email = normalizeEmail(user.email);
  const phone = normalizePhone(user.phone);

  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE (
         o.payment_status = 'paid'
         OR o.order_status IN (
           'confirmed', 'processing', 'shipped', 'out_for_delivery',
           'delivered', 'return_requested', 'returned'
         )
       )
       AND (
         o.user_id = ?
         OR LOWER(TRIM(u.email)) = ?
         OR u.phone = ?
         OR o.shipping_phone = ?
       )`,
    [userId, email, phone, phone]
  );

  return Number(rows[0]?.count || 0) === 0;
}

function calculateNewCustomerDiscount(itemsPrice, eligible) {
  const subtotal = Number(itemsPrice) || 0;
  if (!eligible || subtotal <= 0) {
    return {
      eligible: false,
      discountPercent: NEW_CUSTOMER_DISCOUNT_PERCENT,
      discountCode: NEW_CUSTOMER_DISCOUNT_CODE,
      discountAmount: 0,
      discountedItemsPrice: subtotal
    };
  }

  const discountAmount = roundMoney(subtotal * (NEW_CUSTOMER_DISCOUNT_PERCENT / 100));
  return {
    eligible: true,
    discountPercent: NEW_CUSTOMER_DISCOUNT_PERCENT,
    discountCode: NEW_CUSTOMER_DISCOUNT_CODE,
    discountAmount,
    discountedItemsPrice: roundMoney(subtotal - discountAmount)
  };
}

module.exports = {
  NEW_CUSTOMER_DISCOUNT_PERCENT,
  NEW_CUSTOMER_DISCOUNT_CODE,
  hasUniqueContact,
  isEligibleForNewCustomerDiscount,
  calculateNewCustomerDiscount,
  roundMoney,
  toWholeRupee,
  snapPayableToWholeRupee
};
