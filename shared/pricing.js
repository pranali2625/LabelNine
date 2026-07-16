const SHIPPING_THRESHOLD = 1500;
const FLAT_SHIPPING = 79;
const NEW_CUSTOMER_DISCOUNT_PERCENT = 10;

/** No shipping at or below threshold; ₹79 shipping on orders above ₹1,500 */
function calculateShipping(itemsPrice) {
  return itemsPrice > SHIPPING_THRESHOLD ? FLAT_SHIPPING : 0;
}

module.exports = {
  SHIPPING_THRESHOLD,
  FLAT_SHIPPING,
  NEW_CUSTOMER_DISCOUNT_PERCENT,
  calculateShipping
};
