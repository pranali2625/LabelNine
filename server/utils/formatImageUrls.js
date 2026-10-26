const { env } = require('../config/env');
const { resolvePublicImageUrl } = require('./productImages');

function hostnameWithoutWww(host) {
  return String(host || '').toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
}

function isSameShopHost(hostA, hostB) {
  const a = hostnameWithoutWww(hostA);
  const b = hostnameWithoutWww(hostB);
  return Boolean(a && b && a === b);
}

function getBaseUrl(req) {
  const configured = (env('CLIENT_URL') || '').replace(/\/$/, '');
  const requestHost = (req.get('host') || '').split(':')[0];

  // www.labelnine.in and labelnine.in are the same shop — keep images on the
  // host the customer actually opened so Helmet img-src 'self' does not block them.
  if (requestHost && configured) {
    try {
      if (isSameShopHost(requestHost, new URL(configured).hostname)) {
        return `${req.protocol}://${requestHost}`;
      }
    } catch {
      // ignore invalid CLIENT_URL
    }
  }

  return (configured || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
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

module.exports = { getBaseUrl, normalizeImageUrl, formatProductImages, isSameShopHost };
