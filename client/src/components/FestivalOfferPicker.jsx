import { useCart } from '../context/CartContext'

function Spark({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180
        const inner = i % 2 === 0 ? 16 : 26
        const outer = i % 2 === 0 ? 52 : 36
        return (
          <line
            key={i}
            x1={60 + Math.cos(angle) * inner}
            y1={60 + Math.sin(angle) * inner}
            x2={60 + Math.cos(angle) * outer}
            y2={60 + Math.sin(angle) * outer}
            stroke="currentColor"
            strokeWidth={i % 2 === 0 ? 1.6 : 1}
            strokeLinecap="round"
          />
        )
      })}
      <circle cx="60" cy="60" r="3" fill="currentColor" />
    </svg>
  )
}

export default function FestivalOfferPicker() {
  const { festivalActive, festivalQuote, festivalDiscount } = useCart()

  if (!festivalActive || !festivalQuote.applied) return null

  return (
    <section className="relative overflow-hidden bg-[#fbf3e4] mb-6 px-4 py-4 sm:px-6 text-center">
      <div className="pointer-events-none absolute -top-8 left-1/2 h-20 w-56 -translate-x-1/2 rounded-full bg-[#f6c453]/45 blur-2xl" />
      <Spark className="pointer-events-none absolute left-3 top-1/2 h-8 w-8 -translate-y-1/2 text-[#e8b045]" />
      <Spark className="pointer-events-none absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 text-[#f0b429]" />
      <p className="relative text-xs font-semibold tracking-[0.45em] text-[#a16207]">DIWALI</p>
      <p className="relative mt-1 text-sm sm:text-base font-semibold text-[#16352b]">
        {festivalQuote.title} applied{festivalDiscount > 0 ? ` · You save ₹${festivalDiscount}` : ''}
      </p>
    </section>
  )
}
