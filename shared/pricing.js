const SHIPPING_THRESHOLD = 1500;
const FLAT_SHIPPING = 79;
const NEW_CUSTOMER_DISCOUNT_PERCENT = 10;

/**
 * Shipping fee disabled for now — all shipping is FREE.
 * Restore later:
 *   return itemsPrice > SHIPPING_THRESHOLD ? FLAT_SHIPPING : 0;
 */
function calculateShipping(_itemsPrice) {
  // return itemsPrice > SHIPPING_THRESHOLD ? FLAT_SHIPPING : 0;
  return 0;
}

module.exports = {
  SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
  NEW_CUSTOMER_DISCOUNT_PERCENT,
  calculateShipping
};
