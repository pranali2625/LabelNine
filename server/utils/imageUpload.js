const { env } = require('../config/env');
const { saveProductImage, getProductImagesDir } = require('./productImages');

async function storeProductImage(file, req) {
  if (!file?.buffer?.length) {
    throw new Error('No image file provided');
  }

  const filename = saveProductImage(file.buffer, file.originalname);
  const baseUrl = (env('CLIENT_URL') || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

  return {
    url: `${baseUrl}/uploads/products/${filename}`,
    storage: 'local'
  };
}

function getStorageInfo() {
  return {
    storage: 'local',
    directory: getProductImagesDir()
  };
}

module.exports = { storeProductImage, getStorageInfo };
