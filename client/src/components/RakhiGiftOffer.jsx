import { Gift } from 'lucide-react'
import { isRakhiGiftOfferActive } from '../constants/rakhiGift'

function ShirtIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M11 6.5 16 9l5-2.5 4 3.5-3 2.2V26H10V12.2L7 10l4-3.5Z" strokeLinejoin="round" />
      <path d="M16 9v4" strokeLinecap="round" />
    </svg>
  )
}

function RakhiIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-8 h-8">
      <path d="M4 16h7M21 16h7" stroke="#C4A35A" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="16" r="5.5" fill="#C62828" />
      <circle cx="16" cy="16" r="3.2" fill="#E8C547" />
      <circle cx="16" cy="16" r="1.3" fill="#C62828" />
    </svg>
  )
}

function ChocolateIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
      <rect x="8" y="10" width="16" height="13" rx="1.5" fill="#4A2C2A" />
      <path d="M16 10v13M8 16.5h16" stroke="#F3E6D8" strokeWidth="1.2" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
      <rect x="8" y="9" width="16" height="14" rx="1.2" stroke="#333" strokeWidth="1.5" />
      <path d="M16 13.5c1.2-1.6 3.6-.4 3.6 1.5 0 2.4-3.6 4.5-3.6 4.5S12.4 17.4 12.4 15c0-1.9 2.4-3.1 3.6-1.5Z" fill="#C62828" />
    </svg>
  )
}

const HAMPER_ITEMS = [
  { label: 'Shirt', Icon: ShirtIcon },
  { label: 'Rakhi', Icon: RakhiIcon },
  { label: 'Chocolate', Icon: ChocolateIcon },
  { label: 'Card', Icon: CardIcon },
]

export function RakhiGiftBadge({ className = '' }) {
  if (!isRakhiGiftOfferActive()) return null
  return (
    <div
      className={`pointer-events-none absolute top-0 right-0 z-20 h-[6.5rem] w-[6.5rem] overflow-hidden sm:h-[7.25rem] sm:w-[7.25rem] ${className}`}
    >
      <div className="absolute top-6 -right-9 flex h-[22px] w-[155px] rotate-45 items-center justify-center bg-[#C62828] px-4 text-[7px] font-bold uppercase leading-none tracking-[0.12em] text-white whitespace-nowrap sm:top-[1.65rem] sm:-right-10 sm:h-6 sm:w-[170px] sm:px-5 sm:text-[8px]">
        <span className="translate-y-[1px]">Rakhi Gift Included</span>
      </div>
    </div>
  )
}

export function RakhiGiftBanner({ className = '' }) {
  if (!isRakhiGiftOfferActive()) return null
  return (
    <div className={`relative mb-6 rounded-2xl border border-[#F0D0C8] bg-[#FFF1ED] px-4 pt-8 pb-5 ${className}`}>
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-md bg-[#C62828] px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wide text-white shadow-sm whitespace-nowrap">
        <Gift className="w-3.5 h-3.5" strokeWidth={2.4} />
        Rakhi Gift Included
      </div>
      <p className="text-center text-[15px] sm:text-base text-[#2B2B2B] leading-snug font-serif">
        Buy this shirt & we&apos;ll turn it into a{' '}
        <span className="text-[#9B2C2C] font-semibold">Raksha Bandhan</span> gift.
      </p>
      <div className="mt-4 flex items-end justify-center gap-2 sm:gap-3">
        {HAMPER_ITEMS.map((item, i) => (
          <div key={item.label} className="flex items-end">
            {i > 0 && (
              <span className="mb-5 mr-2 sm:mr-3 text-gray-400 font-semibold text-sm">+</span>
            )}
            <div className="flex flex-col items-center gap-1 min-w-[3.5rem]">
              <item.Icon />
              <span className="text-[11px] text-gray-700 font-medium">{item.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RakhiGiftSummaryLine({ includeRakhiGift, onToggle }) {
  if (!isRakhiGiftOfferActive()) return null
  return (
    <label className="flex items-start gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={includeRakhiGift}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-black"
      />
      <span className="flex-1 flex justify-between gap-3 min-w-0">
        <span className={includeRakhiGift ? 'text-gray-600' : 'text-gray-400'}>
          Rakhi gift hamper
          <span className="block text-[11px] text-gray-400 font-normal leading-snug">
            Shirt + rakhi + chocolate + card
          </span>
        </span>
        <span className={`flex-shrink-0 ${includeRakhiGift ? 'text-green-600 font-medium' : 'text-gray-400 line-through'}`}>
          FREE
        </span>
      </span>
    </label>
  )
}
