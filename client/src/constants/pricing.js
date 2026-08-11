export const SHIPPING_THRESHOLD = 1500
export const FLAT_SHIPPING = 79
export const NEW_CUSTOMER_DISCOUNT_PERCENT = 10

/**
 * Shipping fee disabled for now — all shipping is FREE.
 * Restore later:
 *   return itemsPrice > SHIPPING_THRESHOLD ? FLAT_SHIPPING : 0
 */
export function calculateShipping(_itemsPrice) {
  // return itemsPrice > SHIPPING_THRESHOLD ? FLAT_SHIPPING : 0
  return 0
}

export function calculateNewCustomerDiscount(itemsPrice, eligible) {
  const subtotal = Number(itemsPrice) || 0
  if (!eligible || subtotal <= 0) return 0
  return Math.round(subtotal * (NEW_CUSTOMER_DISCOUNT_PERCENT / 100) * 100) / 100
}
