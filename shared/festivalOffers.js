/**
 * Diwali shirt offers. Client and server both use this so cart preview
 * and final billing match.
 *
 * b2g2   — choose 4 shirts; bill only the 2 highest priced.
 * b1g199 — choose 2 shirts; bill the higher one in full and ₹199 for the other.
 *
 * Window is inclusive in Asia/Kolkata: 26 Oct 2026 through 10 Nov 2026.
 */

const SECOND_SHIRT_PRICE = 199;
const FESTIVAL_SHIPPING = 99;
const FESTIVAL_START = '2026-10-26';
const FESTIVAL_END = '2026-11-10';
const FESTIVAL_WINDOW_LABEL = '26 Oct 2026 – 10 Nov 2026';

const FESTIVAL_OFFER_LIST = [
  {
    id: 'b2g2',
    code: 'DIWALI-B2G2',
    title: 'Buy 2 Get 2 Free',
    required: 4,
    detail: 'Buy 2 Get 2 Free'
  },
  {
    id: 'b1g199',
    code: 'DIWALI-199',
    title: 'Buy 1, Get 2nd at ₹199',
    required: 2,
    detail: 'Buy 1, Get 2nd at ₹199'
  }
];

const FESTIVAL_OFFERS = Object.fromEntries(FESTIVAL_OFFER_LIST.map((offer) => [offer.id, offer]));
const FESTIVAL_CODES = new Set(FESTIVAL_OFFER_LIST.map((offer) => offer.code));

function roundMoney(amount) {
  return Math.round((Number(amount) || 0) * 100) / 100;
}

function istDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function isFestivalOfferActive(date = new Date()) {
  const day = istDateString(date);
  return day >= FESTIVAL_START && day <= FESTIVAL_END;
}

function itemId(item) {
  return item?.productId ?? item?.product;
}

function lineKey(item) {
  return `${itemId(item)}::${item?.size}`;
}

function normalizeItems(rawItems) {
  return (rawItems || [])
    .map((item) => ({
      productId: itemId(item),
      size: item.size,
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      price: roundMoney(item.price)
    }))
    .filter((item) => item.productId != null && item.size != null && item.quantity > 0);
}

function mergeSelections(selections) {
  const map = new Map();
  for (const sel of selections || []) {
    const qty = Math.floor(Number(sel?.quantity) || 0);
    if (qty <= 0 || itemId(sel) == null || sel.size == null) continue;
    const key = lineKey(sel);
    const prev = map.get(key) || { productId: itemId(sel), size: sel.size, quantity: 0 };
    prev.quantity += qty;
    map.set(key, prev);
  }
  return [...map.values()];
}

function sumItems(items) {
  return roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
}

/**
 * Pick the shirts that save the most under each offer.
 * Buy 2 Get 2 Free frees the two lowest of the four chosen, so the four
 * highest-priced shirts save the most. The ₹199 offer discounts the cheaper
 * of the pair, so the two highest-priced shirts save the most.
 */
function bestFestivalSelection(rawItems, offerId) {
  const offer = FESTIVAL_OFFERS[offerId];
  if (!offer) return [];
  const items = normalizeItems(rawItems);
  const units = [];
  for (const item of items) {
    for (let i = 0; i < item.quantity; i += 1) {
      units.push({ productId: item.productId, size: item.size, price: item.price });
    }
  }
  units.sort((a, b) => b.price - a.price);
  const picked = units.slice(0, offer.required);
  const map = new Map();
  for (const unit of picked) {
    const key = lineKey(unit);
    const prev = map.get(key) || { productId: unit.productId, size: unit.size, quantity: 0 };
    prev.quantity += 1;
    map.set(key, prev);
  }
  return [...map.values()];
}

function quoteFestivalOffer(rawItems, offerId, selections, now = new Date()) {
  const items = normalizeItems(rawItems);
  const originalPayable = sumItems(items);
  const active = isFestivalOfferActive(now);
  const baseLines = items.map((item) => ({
    productId: item.productId,
    size: item.size,
    quantity: item.quantity,
    included: 0,
    originalTotal: roundMoney(item.price * item.quantity),
    billedTotal: roundMoney(item.price * item.quantity),
    savings: 0,
    note: ''
  }));

  const idle = {
    ok: true,
    active,
    applied: false,
    offerId: null,
    code: null,
    title: null,
    required: 0,
    selectedCount: 0,
    discountAmount: 0,
    payable: originalPayable,
    message: '',
    lines: baseLines
  };

  if (!offerId) return idle;

  const offer = FESTIVAL_OFFERS[offerId];
  if (!offer) {
    return { ...idle, ok: false, message: 'That offer is not available.' };
  }

  const identified = {
    ...idle,
    offerId: offer.id,
    code: offer.code,
    title: offer.title,
    required: offer.required
  };

  if (!active) {
    return {
      ...identified,
      ok: false,
      message: `This offer is valid from ${FESTIVAL_WINDOW_LABEL} only.`
    };
  }

  const chosen = mergeSelections(selections);
  const byKey = new Map(items.map((item) => [lineKey(item), item]));

  for (const sel of chosen) {
    const line = byKey.get(lineKey(sel));
    if (!line) {
      return {
        ...identified,
        ok: false,
        message: 'One of the chosen shirts is no longer in your cart.'
      };
    }
    if (sel.quantity > line.quantity) {
      return {
        ...identified,
        ok: false,
        message: 'You chose more of a shirt than you have in the cart.'
      };
    }
  }

  const units = [];
  for (const sel of chosen) {
    const line = byKey.get(lineKey(sel));
    for (let n = 0; n < sel.quantity; n += 1) {
      units.push({ key: lineKey(sel), price: line.price, charge: line.price });
    }
  }

  const selectedCount = units.length;
  const linesWithIncluded = baseLines.map((line) => {
    const match = chosen.find((sel) => lineKey(sel) === lineKey(line));
    return { ...line, included: match ? Math.min(match.quantity, line.quantity) : 0 };
  });

  if (selectedCount !== offer.required) {
    const remaining = offer.required - selectedCount;
    return {
      ...identified,
      ok: selectedCount <= offer.required,
      selectedCount,
      lines: linesWithIncluded,
      message:
        selectedCount > offer.required
          ? `This offer applies to exactly ${offer.required} shirts.`
          : `Choose ${remaining} more shirt${remaining === 1 ? '' : 's'} (${selectedCount} of ${offer.required} selected).`
    };
  }

  if (offer.id === 'b2g2') {
    const ranked = [...units].sort((a, b) => b.price - a.price);
    ranked.forEach((unit, index) => {
      unit.charge = index < 2 ? unit.price : 0;
    });
  } else {
    const [first, second] = units;
    const higher = first.price >= second.price ? first : second;
    const lower = higher === first ? second : first;
    higher.charge = higher.price;
    lower.charge = Math.min(SECOND_SHIRT_PRICE, lower.price);
  }

  const chargeByKey = new Map();
  const freeByKey = new Map();
  const offerPriceByKey = new Map();
  for (const unit of units) {
    chargeByKey.set(unit.key, roundMoney((chargeByKey.get(unit.key) || 0) + unit.charge));
    if (unit.charge === 0) freeByKey.set(unit.key, (freeByKey.get(unit.key) || 0) + 1);
    if (unit.charge === SECOND_SHIRT_PRICE && unit.price > SECOND_SHIRT_PRICE) {
      offerPriceByKey.set(unit.key, (offerPriceByKey.get(unit.key) || 0) + 1);
    }
  }

  const lines = items.map((item) => {
    const key = lineKey(item);
    const included = chosen.find((sel) => lineKey(sel) === key)?.quantity || 0;
    const unselected = item.quantity - included;
    const billedTotal = roundMoney((chargeByKey.get(key) || 0) + unselected * item.price);
    const originalTotal = roundMoney(item.price * item.quantity);
    const freeCount = freeByKey.get(key) || 0;
    const offerCount = offerPriceByKey.get(key) || 0;
    const paidIncluded = included - freeCount - offerCount;
    let note = '';
    if (freeCount > 0 && paidIncluded > 0) note = `${freeCount} free, ${paidIncluded} billed`;
    else if (freeCount > 0) note = freeCount === 1 ? '1 shirt free' : `${freeCount} shirts free`;
    else if (offerCount > 0 && paidIncluded > 0) note = `1 at full price, 1 at ₹${SECOND_SHIRT_PRICE}`;
    else if (offerCount > 0) note = `Offer price ₹${SECOND_SHIRT_PRICE}`;
    else if (included > 0) note = 'Included in offer';

    return {
      productId: item.productId,
      size: item.size,
      quantity: item.quantity,
      included,
      originalTotal,
      billedTotal,
      savings: roundMoney(originalTotal - billedTotal),
      note
    };
  });

  const discountAmount = roundMoney(lines.reduce((sum, line) => sum + line.savings, 0));
  const payable = roundMoney(originalPayable - discountAmount);
  let message;
  if (offer.id === 'b2g2') {
    message = discountAmount > 0 ? `Offer applied. You save ₹${discountAmount}.` : 'Offer applied.';
  } else if (discountAmount > 0) {
    message = `Offer applied. You save ₹${discountAmount}.`;
  } else {
    message = 'Offer applied.';
  }

  return {
    ...identified,
    ok: true,
    active: true,
    applied: true,
    selectedCount,
    discountAmount,
    payable,
    message,
    lines
  };
}

export {
  SECOND_SHIRT_PRICE,
  FESTIVAL_SHIPPING,
  FESTIVAL_START,
  FESTIVAL_END,
  FESTIVAL_WINDOW_LABEL,
  FESTIVAL_OFFER_LIST,
  FESTIVAL_OFFERS,
  FESTIVAL_CODES,
  roundMoney,
  isFestivalOfferActive,
  bestFestivalSelection,
  quoteFestivalOffer
};
