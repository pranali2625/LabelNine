const { resolveOrderDiscount } = require('./inviteCoupon');

function loadOffers() {
  return import('../../shared/festivalOffers.js');
}

function mapLines(orderItems) {
  return (orderItems || []).map((item) => ({
    productId: item.product ?? item.productId,
    size: item.size,
    quantity: item.quantity,
    price: item.price,
    name: item.name
  }));
}

function withEffectivePrices(orderItems, quote) {
  const byKey = new Map(
    (quote?.lines || []).map((line) => [`${line.productId}::${line.size}`, line])
  );
  return (orderItems || []).map((item) => {
    const id = item.product ?? item.productId;
    const line = byKey.get(`${id}::${item.size}`);
    if (!line) return item;
    const qty = Number(item.quantity) || 0;
    return {
      ...item,
      price: qty > 0 ? line.billedTotal / qty : 0
    };
  });
}

/**
 * Apply a Diwali offer before welcome/coupon discounts.
 * Festival math uses catalog prices. Other discounts use the amount left after the offer.
 */
async function applyFestivalPricing(items, festivalOffer) {
  const { quoteFestivalOffer, roundMoney } = await loadOffers();
  const lines = mapLines(items);
  const subtotal = roundMoney(lines.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const requestedId = festivalOffer?.id || null;
  if (!requestedId) {
    return { ok: true, items: lines, subtotal, quote: null };
  }

  const quote = quoteFestivalOffer(lines, requestedId, festivalOffer.selections || []);
  if (!quote.ok) return { ok: false, message: quote.message };
  if (!quote.applied) {
    return {
      ok: false,
      message: quote.message || 'Select the shirts required for this offer.'
    };
  }

  return {
    ok: true,
    items: withEffectivePrices(lines, quote),
    subtotal: quote.payable,
    quote
  };
}

async function priceCheckout(user, orderItems, { couponCode, festivalOffer } = {}) {
  const { roundMoney, FESTIVAL_SHIPPING } = await loadOffers();
  const lines = mapLines(orderItems);
  const itemsPrice = roundMoney(lines.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const festival = await applyFestivalPricing(lines, festivalOffer);
  if (!festival.ok) return { ok: false, message: festival.message };

  const merchandise = festival.quote ? festival.quote.payable : itemsPrice;
  const discountItems = festival.quote ? withEffectivePrices(orderItems, festival.quote) : orderItems;
  const resolved = await resolveOrderDiscount(user, merchandise, couponCode, discountItems);
  if (!resolved.ok) return { ok: false, message: resolved.message };

  const payable = resolved.discount.discountedItemsPrice;
  const discountAmount = roundMoney(itemsPrice - payable);
  const codes = [];
  if (festival.quote?.applied && festival.quote.code) codes.push(festival.quote.code);
  if (resolved.discount.discountCode) codes.push(resolved.discount.discountCode);

  return {
    ok: true,
    itemsPrice,
    discountAmount,
    discountCode: codes.length ? codes.join('+') : null,
    shippingPrice: festival.quote?.applied ? FESTIVAL_SHIPPING : 0,
    taxPrice: 0,
    totalAmount: roundMoney(payable + (festival.quote?.applied ? FESTIVAL_SHIPPING : 0)),
    festival: festival.quote,
    discount: resolved.discount,
    source: resolved.source,
    allowlistId: resolved.allowlistId
  };
}

module.exports = {
  applyFestivalPricing,
  priceCheckout,
  withEffectivePrices
};
