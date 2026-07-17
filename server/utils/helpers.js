const { v4: uuidv4 } = require('uuid');

const generateOrderId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LN-${timestamp}-${random}`;
};

const { calculateShipping } = require('../../shared/pricing');
const {
  calculateNewCustomerDiscount,
  snapPayableToWholeRupee
} = require('./newCustomerDiscount');

const calculatePrices = (items, options = {}) => {
  const itemsPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discountAmount = 0;
  let discountCode = null;

  if (options.discountAmount != null) {
    discountAmount = Number(options.discountAmount) || 0;
    discountCode = discountAmount > 0 ? options.discountCode || null : null;
  } else {
    const discount = calculateNewCustomerDiscount(itemsPrice, Boolean(options.newCustomerDiscount));
    discountAmount = discount.discountAmount;
    discountCode = discount.discountAmount > 0 ? discount.discountCode : null;
  }

  const shippingPrice = calculateShipping(itemsPrice);
  const taxPrice = 0; // GST disabled for now
  const snapped = snapPayableToWholeRupee(itemsPrice, discountAmount, shippingPrice, taxPrice);
  return {
    itemsPrice,
    discountAmount: snapped.discountAmount,
    discountCode: snapped.discountAmount > 0 ? discountCode : null,
    shippingPrice,
    taxPrice,
    totalAmount: snapped.totalAmount
  };
};

const { isMaharashtraPincode } = require('../../shared/maharashtra');

const validatePincode = (pincode) => isMaharashtraPincode(pincode);

module.exports = { generateOrderId, calculatePrices, validatePincode };
