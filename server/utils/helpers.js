const { v4: uuidv4 } = require('uuid');

const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LN-${timestamp}-${random}`;
};

const calculatePrices = (items) => {
  const itemsPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingPrice = itemsPrice >= 499 ? 0 : 79; // Free shipping above ₹499
  const taxPrice = Math.round(itemsPrice * 0.05); // 5% GST
  const totalAmount = itemsPrice + shippingPrice + taxPrice;
  return { itemsPrice, shippingPrice, taxPrice, totalAmount };
};

const validatePincode = (pincode) => /^[1-9][0-9]{5}$/.test(pincode);

module.exports = { generateOrderId, calculatePrices, validatePincode };
