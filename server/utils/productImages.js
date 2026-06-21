const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

function getProductImagesDir() {
  const configured = env('PRODUCT_IMAGES_DIR');
  if (configured) {
    return path.resolve(configured);
  }

  // Hostinger: sibling of public_html/nodejs — survives redeploys
  const hostingerPersistent = path.resolve(__dirname, '..', '..', 'product-images');
  if (fs.existsSync(path.dirname(hostingerPersistent))) {
    return hostingerPersistent;
  }

  return path.join(__dirname, '..', 'uploads', 'products');
}

function ensureProductImagesDir() {
  const dir = getProductImagesDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFilename(name) {
  const base = path.basename(name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
  return base || `image-${Date.now()}.jpg`;
}

function resolveProductImage(filename) {
  if (!filename || filename.includes('/') || filename.includes('\\')) return null;
  const filePath = path.join(getProductImagesDir(), filename);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

function saveProductImage(buffer, originalName) {
  const dir = ensureProductImagesDir();
  const filename = `${Date.now()}-${safeFilename(originalName)}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return filename;
}

module.exports = {
  getProductImagesDir,
  ensureProductImagesDir,
  safeFilename,
  resolveProductImage,
  saveProductImage
};
