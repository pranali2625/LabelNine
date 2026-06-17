const Product = require('../models/Product');

const getProductId = (item) => {
  if (item.product == null) return null;
  if (typeof item.product === 'object') return item.product._id || item.product.id;
  return item.product;
};

async function restoreOrderStock(items, conn) {
  for (const item of items) {
    const productId = getProductId(item);
    if (!productId) continue;
    await Product.updateStock(productId, item.size, item.quantity, conn);
  }
}

async function deductOrderStock(items, conn) {
  for (const item of items) {
    const productId = getProductId(item);
    const ok = await Product.updateStock(productId, item.size, -item.quantity, conn);
    if (!ok) {
      throw new Error(`Insufficient stock for ${item.name} (${item.size})`);
    }
  }
}

module.exports = { getProductId, restoreOrderStock, deductOrderStock };
