export const SHIPPING_THRESHOLD = 1500
export const FLAT_SHIPPING = 79

/** No shipping at or below threshold; ₹79 shipping on orders above ₹1,500 */
export function calculateShipping(itemsPrice) {
  return itemsPrice > SHIPPING_THRESHOLD ? FLAT_SHIPPING : 0
}
