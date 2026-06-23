const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

function getProductImagesDir() {
  const configured = env('PRODUCT_IMAGES_DIR');
  if (configured) {
    return path.resolve(configured);
  }

  // Default: server/uploads/products — drop image files here manually or via Admin upload
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

function listProductImageFiles() {
  const dir = getProductImagesDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => IMAGE_EXT.test(name));
}

function extractImageFilename(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const { pathname } = new URL(url);
      if (pathname.includes('/uploads/products/')) {
        return decodeURIComponent(pathname.split('/uploads/products/').pop() || '');
      }
      const base = path.basename(pathname);
      return base ? decodeURIComponent(base) : null;
    } catch {
      return null;
    }
  }
  if (url.includes('/uploads/products/')) {
    return decodeURIComponent(url.split('/uploads/products/').pop().split('?')[0]);
  }
  const base = path.basename(url.split('?')[0]);
  return base ? decodeURIComponent(base) : null;
}

function isResolvableLocalImageUrl(url) {
  if (!url) return false;
  if (url.startsWith('data:')) return false;
  const filename = extractImageFilename(url);
  if (!filename || !IMAGE_EXT.test(filename)) return false;
  if (/^https?:\/\//i.test(url)) {
    try {
      const { hostname, pathname } = new URL(url);
      const clientHost = (env('CLIENT_URL') || '').replace(/^https?:\/\//, '').split('/')[0];
      const localHosts = new Set(['localhost', '127.0.0.1', clientHost].filter(Boolean));
      if (!localHosts.has(hostname)) return false;
      return !pathname.startsWith('/api/');
    } catch {
      return false;
    }
  }
  return true;
}

function resolveProductImage(filename) {
  if (!filename || filename.includes('/') || filename.includes('\\')) return null;
  const decoded = decodeURIComponent(filename);
  const filePath = path.join(getProductImagesDir(), decoded);
  if (fs.existsSync(filePath)) return filePath;

  const lower = decoded.toLowerCase();
  for (const name of listProductImageFiles()) {
    if (name.toLowerCase() === lower) return path.join(getProductImagesDir(), name);
  }
  return null;
}

function findProductImageFile(filenameOrUrl) {
  const filename = extractImageFilename(filenameOrUrl) || filenameOrUrl;
  return resolveProductImage(filename);
}

function publicImageUrl(filename, baseUrl) {
  const base = (baseUrl || '').replace(/\/$/, '');
  const name = path.basename(filename);
  return `${base}/uploads/products/${encodeURIComponent(name)}`;
}

/** Rewrite stored DB URLs to a working /uploads/products/ URL when the file exists on disk. */
function resolvePublicImageUrl(storedUrl, baseUrl) {
  if (!storedUrl) return storedUrl;
  if (!isResolvableLocalImageUrl(storedUrl)) return storedUrl;

  const filePath = findProductImageFile(storedUrl);
  if (!filePath) return storedUrl;

  return publicImageUrl(path.basename(filePath), baseUrl);
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
  listProductImageFiles,
  extractImageFilename,
  isResolvableLocalImageUrl,
  resolveProductImage,
  findProductImageFile,
  publicImageUrl,
  resolvePublicImageUrl,
  saveProductImage
};
