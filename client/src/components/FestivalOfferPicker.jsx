import { useCart } from '../context/CartContext'
import {
  FESTIVAL_OFFER_LIST,
  FESTIVAL_OFFERS,
  FESTIVAL_WINDOW_LABEL
} from '../constants/festivalOffers'

export default function FestivalOfferPicker() {
  const {
    cartCount,
    festivalActive,
    festivalOfferId,
    festivalQuote,
    selectFestivalOffer,
    clearFestivalOffer,
    applyBestFestivalSelection
  } = useCart()

  if (!festivalActive) return null

  const offer = FESTIVAL_OFFERS[festivalOfferId]
  const canAutoPick = Boolean(offer && cartCount >= offer.required)

  return (
    <section className="border border-amber-300 bg-amber-50 p-4 sm:p-5 mb-6">
      <p className="text-xs tracking-[0.25em] text-amber-800 mb-1">DIWALI OFFERS</p>
      <h2 className="text-lg font-bold mb-1">Choose one offer</h2>
      <p className="text-sm text-gray-600 mb-4">
        Valid {FESTIVAL_WINDOW_LABEL}. Pick the shirts below. We apply the price when you pay.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {FESTIVAL_OFFER_LIST.map((option) => {
          const selected = festivalOfferId === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (!selected) selectFestivalOffer(option.id)
              }}
              className={`text-left border p-4 transition-colors ${
                selected
                  ? 'border-black bg-white'
                  : 'border-amber-200 bg-amber-50 hover:border-black'
              }`}
              aria-pressed={selected}
            >
              <p className="font-bold mb-1">{option.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{option.detail}</p>
            </button>
          )
        })}
      </div>

      {offer && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-800">{festivalQuote.message}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={applyBestFestivalSelection}
              disabled={!canAutoPick}
              className="bg-black text-white px-4 py-2 text-xs font-semibold tracking-wide hover:bg-gray-800 disabled:opacity-40"
            >
              Pick my {offer.required} highest-priced shirts
            </button>
            <button
              type="button"
              onClick={clearFestivalOffer}
              className="text-sm text-gray-600 underline hover:text-black"
            >
              Remove offer
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {offer.id === 'b2g2'
              ? 'The 2 lowest-priced shirts in the 4 you choose are free, so choosing your 4 most expensive shirts saves the most. Other shirts in the cart stay at full price.'
              : 'The cheaper of the 2 shirts you choose becomes ₹199, so choosing your 2 most expensive shirts saves the most. If that shirt is already ₹199 or less, its own price is used. Other shirts stay at full price.'}
          </p>
        </div>
      )}
    </section>
  )
}
