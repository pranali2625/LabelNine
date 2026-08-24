export const RAKHI_GIFT_NOTE_INCLUDED =
  'Rakhi gift included (shirt + rakhi + chocolate + card)'
export const RAKHI_GIFT_NOTE_DECLINED = 'Rakhi gift declined'

/** Offer runs through 28 August 2026 (IST). */
export function isRakhiGiftOfferActive() {
  return Date.now() < new Date('2026-08-29T00:00:00+05:30').getTime()
}

export function rakhiGiftOrderNote(includeRakhiGift) {
  return includeRakhiGift === false ? RAKHI_GIFT_NOTE_DECLINED : RAKHI_GIFT_NOTE_INCLUDED
}
