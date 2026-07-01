const { v4: uuidv4 } = require('uuid');

const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LN-${timestamp}-${random}`;
};

const { calculateShipping } = require('../../shared/pricing');

const calculatePrices = (items) => {
  const itemsPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingPrice = calculateShipping(itemsPrice);
  const taxPrice = 0; // GST disabled for now
  const totalAmount = itemsPrice + shippingPrice + taxPrice;
  return { itemsPrice, shippingPrice, taxPrice, totalAmount };
};

const { isMaharashtraPincode } = require('../../shared/maharashtra');

const validatePincode = (pincode) => isMaharashtraPincode(pincode);

module.exports = { generateOrderId, calculatePrices, validatePincode };
