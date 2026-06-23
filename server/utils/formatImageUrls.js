const { env } = require('../config/env');
const { resolvePublicImageUrl } = require('./productImages');

function getBaseUrl(req) {
  return (env('CLIENT_URL') || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function normalizeImageUrl(url, req) {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return resolvePublicImageUrl(url, getBaseUrl(req));
  }
  if (url.startsWith('//')) return `${req.protocol}:${url}`;
  if (url.startsWith('/')) return resolvePublicImageUrl(`${getBaseUrl(req)}${url}`, getBaseUrl(req));
  return resolvePublicImageUrl(`${getBaseUrl(req)}/${url}`, getBaseUrl(req));
}

function formatProductImages(images, req) {
  return Array.isArray(images)
    ? images.map((img) => ({
        ...img,
        url: normalizeImageUrl(img.url, req)
      }))
    : [];
}

module.exports = { getBaseUrl, normalizeImageUrl, formatProductImages };
