import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Truck, RotateCcw, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import api from '../services/api'
import ImageSlideshow from '../components/ImageSlideshow'
import { RakhiGiftBadge } from '../components/RakhiGiftOffer'

const HERO_FALLBACK = 'https://images.unsplash.com/photo-1602810316693-3667c854239a?w=1400'

const CAMPAIGN_SLIDES = [
  {
    src: '/images/home/campaign-1.png',
    alt: 'Label Nine — Classic by Choice campaign',
  },
  {
    src: '/images/home/campaign-2.png',
    alt: 'Label Nine — Classy Collection campaign',
  },
  {
    src: '/images/home/campaign-3.png',
    alt: 'Label Nine — Effortless by Nature campaign',
  },
]

const OUR_STORY_IMAGES = [
  { src: '/images/our-story.png', alt: 'Precision fabric cutting' },
  { src: '/images/our-story-sewing.png', alt: 'Expert shirt stitching' },
  { src: '/images/our-story-packaging.png', alt: 'Premium Label Nine packaging' },
]

/* Restore after 28 Aug — original yellow promo strip
const PROMO_HIGHLIGHTS = [
  'PREMIUM MEN\'S SHIRTS',
  'SECURE ONLINE PAYMENT',
  'EASY 3-DAY RETURNS',
  'CRAFTED WITH CARE',
]
*/

// Raksha Bandhan promo strip — remove after 28 Aug
const RAKSHA_BANDHAN_HIGHLIGHTS = [
  'HAPPY RAKSHA BANDHAN',
  'SPECIAL GIFT HAMPER',
  'SHIRT + RAKHI + CHOCOLATE + CARD',
  '₹999 ONWARDS',
  'VALID TILL 28 AUGUST',
  'SINGLE-DAY DELIVERY IN KOLHAPUR',
]

const TRUST_BADGES = [
  { Icon: Truck, title: 'MAHARASHTRA DELIVERY', subtitle: 'Delivered across Maharashtra' },
  { Icon: RotateCcw, title: 'EASY RETURNS', subtitle: '3-day hassle-free returns' },
  { Icon: ShieldCheck, title: 'SECURE PAYMENT', subtitle: 'UPI, cards & netbanking' },
]

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/products?limit=8', {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })
      .then(res => setProducts(Array.isArray(res.data?.products) ? res.data.products : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const featured = products.filter((p) => p.isFeatured).slice(0, 4)
  const displayFeatured = featured.length > 0 ? featured : products.slice(0, 4)

  const heroImages = (() => {
    const urls = products
      .map((p) => p.images?.[0]?.url)
      .filter(Boolean)
    return urls.length > 0 ? urls : [HERO_FALLBACK]
  })()

  return (
    <div>
      {/* Hero */}
      <section className="bg-black text-white min-h-[90vh] flex items-center relative overflow-hidden">
        <HeroBackground images={heroImages} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/15 z-10" />
        <div className="relative z-20 max-w-7xl mx-auto px-6 py-24">
          <p className="text-amber-400 text-sm tracking-[0.4em] mb-4 font-medium">PREMIUM MEN'S SHIRTS</p>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight tracking-tight">
            DRESS WITH<br />
            <span className="text-amber-400">PURPOSE.</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
            Premium shirts crafted for the modern Indian man who values quality, comfort, and timeless style.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/shop" className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 font-semibold tracking-wide hover:bg-amber-400 transition-colors duration-200">
              SHOP NOW <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/track" className="inline-flex items-center gap-2 border border-white text-white px-8 py-4 font-semibold tracking-wide hover:bg-white hover:text-black transition-colors duration-200">
              TRACK ORDER
            </Link>
          </div>
        </div>
      </section>

      {/* Restore after 28 Aug — original yellow promo strip
      <section className="bg-amber-400 py-3.5 md:py-4 overflow-hidden">
        <div className="marquee-track items-center">
          {[...PROMO_HIGHLIGHTS, ...PROMO_HIGHLIGHTS, ...PROMO_HIGHLIGHTS, ...PROMO_HIGHLIGHTS].map((text, i) => (
            <span
              key={`${text}-${i}`}
              className="text-black text-xs font-semibold tracking-[0.2em] whitespace-nowrap px-14 md:px-20 flex-shrink-0"
            >
              {text}
            </span>
          ))}
        </div>
      </section>
      */}

      {/* Raksha Bandhan promo strip — remove after 28 Aug */}
      <section
        className="py-2.5 md:py-3 overflow-hidden"
        style={{ background: '#5A1A1B' }}
      >
        <div className="marquee-track items-center">
          {[...RAKSHA_BANDHAN_HIGHLIGHTS, ...RAKSHA_BANDHAN_HIGHLIGHTS, ...RAKSHA_BANDHAN_HIGHLIGHTS, ...RAKSHA_BANDHAN_HIGHLIGHTS].map((text, i) => (
            <span
              key={`${text}-${i}`}
              className="text-[13px] md:text-sm font-extrabold tracking-[0.12em] whitespace-nowrap px-10 md:px-16 flex-shrink-0"
              style={{ color: '#F7F2E8' }}
            >
              {text}
            </span>
          ))}
        </div>
      </section>

      {/* Raksha Bandhan gift hamper banners — remove after 28 Aug */}
      <RakshaBandhanBanner />

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-xs tracking-[0.3em] text-gray-500 mb-1">HANDPICKED</p>
            <h2 className="text-3xl font-bold tracking-tight">FEATURED SHIRTS</h2>
          </div>
          <Link to="/shop" className="flex items-center gap-2 text-sm font-medium tracking-wide hover:gap-3 transition-all">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 aspect-[3/4] mb-3" />
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {displayFeatured.map(product => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Brand story */}
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[minmax(0,28rem)_1fr] gap-8 lg:gap-10 items-start">
            <div>
              <p className="text-xs tracking-[0.3em] text-gray-500 mb-2">OUR STORY</p>
              <h2 className="text-3xl font-bold mb-6 tracking-tight">CRAFTED FOR THE<br />MODERN MAN</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Label Nine was born from a simple belief — that a great shirt is the foundation of every great outfit. We focus on quality fabrics, clean fits, and shirts you can wear with confidence.
              </p>
              <p className="text-gray-600 leading-relaxed mb-8">
                Every Label Nine shirt is made with premium materials and careful attention to detail, designed for work, weekends, and everything in between.
              </p>
              <Link to="/shop" className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 font-semibold text-sm tracking-wide hover:bg-gray-800 transition-colors">
                EXPLORE COLLECTION <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full items-start">
              {OUR_STORY_IMAGES.map((image, i) => (
                <CraftImage
                  key={image.src}
                  src={image.src}
                  alt={image.alt}
                  aspect="aspect-[4/5]"
                  className={i === 1 ? 'mt-6 sm:mt-8' : ''}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="border-t border-b border-gray-200 py-6 sm:py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-6 md:gap-8">
            {TRUST_BADGES.map((badge) => (
              <div
                key={badge.title}
                className="flex flex-col items-center text-center gap-2 sm:flex-row sm:items-start sm:text-left sm:gap-4"
              >
                <badge.Icon className="w-5 h-5 sm:w-7 sm:h-7 flex-shrink-0 sm:mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="font-semibold text-[10px] leading-tight tracking-wide sm:text-sm sm:leading-snug">
                    {badge.title}
                  </p>
                  <p className="text-gray-500 text-[10px] leading-tight mt-0.5 sm:text-sm sm:leading-snug">
                    {badge.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campaign slider — before collection CTA; full image, no crop */}
      <CampaignSlider />

      {/* Shop CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-xs tracking-[0.3em] text-gray-500 mb-1">THE COLLECTION</p>
        <h2 className="text-3xl font-bold tracking-tight mb-4">SHOP ALL SHIRTS</h2>
        <p className="text-gray-600 max-w-md mx-auto mb-8">
          Browse our full range of premium shirts and find your next favourite.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 font-semibold tracking-wide hover:bg-gray-800 transition-colors"
        >
          VIEW COLLECTION <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  )
}

function RakshaBandhanBanner() {
  const slides = [
    {
      src: '/images/home/raksha-bandhan-hamper.png',
      alt: 'Label Nine Raksha Bandhan special gift hamper — shirt, rakhi, chocolate and card, 24th to 28th August',
    },
    {
      src: '/images/home/raksha-bandhan-gift.png',
      alt: 'Label Nine Raksha Bandhan gift — choose his shirt from ₹999 onwards, valid till 28 August',
    },
  ]

  const [index, setIndex] = useState(0)
  const total = slides.length
  const touchStart = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (total <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, 5000)
    return () => clearInterval(timer)
  }, [total, index])

  useEffect(() => {
    const el = containerRef.current
    if (!el || total <= 1) return

    const onTouchStart = (e) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    }

    const onTouchMove = (e) => {
      if (!touchStart.current) return
      const dx = e.touches[0].clientX - touchStart.current.x
      const dy = e.touches[0].clientY - touchStart.current.y
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        e.preventDefault()
      }
    }

    const onTouchEnd = (e) => {
      if (!touchStart.current) return
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      if (Math.abs(dx) >= 50) {
        setIndex((i) => {
          const next = dx < 0 ? i + 1 : i - 1
          return (next + total) % total
        })
      }
      touchStart.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [total])

  return (
    <section
      aria-label="Raksha Bandhan Gift Hamper"
      className="relative w-full mt-4 sm:mt-5 md:mt-6 bg-[#F7F2E8]"
    >
      <div ref={containerRef} className="relative w-full select-none touch-pan-y">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            aria-hidden={i !== index}
            className={
              i === index
                ? 'relative z-[1]'
                : 'absolute inset-x-0 top-0 z-0 opacity-0 pointer-events-none'
            }
          >
            <Link
              to="/shop"
              tabIndex={i === index ? 0 : -1}
              className="block"
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className={`w-full h-auto block pointer-events-none transition-opacity duration-700 ease-in-out ${
                  i === index ? 'opacity-100' : 'opacity-0'
                }`}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function CampaignSlider() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = CAMPAIGN_SLIDES.length

  useEffect(() => {
    if (paused || total <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total)
    }, 5000)
    return () => clearInterval(timer)
  }, [paused, total])

  const go = (next) => setIndex((next + total) % total)

  return (
    <section
      aria-label="Label Nine campaign"
      className="relative bg-[#111]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Natural image height — no aspect crop */}
      <div className="relative w-full">
        {CAMPAIGN_SLIDES.map((slide, i) => (
          <div
            key={slide.src}
            aria-hidden={i !== index}
            className={
              i === index
                ? 'relative z-[1]'
                : 'absolute inset-x-0 top-0 z-0 opacity-0 pointer-events-none'
            }
          >
            <Link
              to="/shop"
              tabIndex={i === index ? 0 : -1}
              className={`block transition-opacity duration-700 ease-in-out ${
                i === index ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                className="w-full h-auto block"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            </Link>
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Previous slide"
        onClick={() => go(index - 1)}
        className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-[2] w-10 h-10 flex items-center justify-center bg-black/35 text-white hover:bg-black/55 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        aria-label="Next slide"
        onClick={() => go(index + 1)}
        className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-[2] w-10 h-10 flex items-center justify-center bg-black/35 text-white hover:bg-black/55 transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[2] flex gap-2">
        {CAMPAIGN_SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </section>
  )
}

function CraftImage({ src, alt, className = '', aspect = 'aspect-[3/4]' }) {
  const [imgSrc, setImgSrc] = useState(src)

  useEffect(() => {
    setImgSrc(src)
  }, [src])

  return (
    <div className={`${aspect} overflow-hidden bg-gray-100 ${className}`}>
      <img
        src={imgSrc}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        onError={() => {
          if (imgSrc !== HERO_FALLBACK) setImgSrc(HERO_FALLBACK)
        }}
      />
    </div>
  )
}

function HeroBackground({ images }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [images])

  useEffect(() => {
    if (images.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [images])

  return (
    <div className="absolute inset-0">
      {images.map((url, i) => (
        <div
          key={`${url}-${i}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out ${
            i === index ? 'opacity-70' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url('${url}')` }}
        />
      ))}
    </div>
  )
}

function ProductCard({ product }) {
  return (
    <Link to={`/shop/${product.slug || product._id}`} className="group">
      <div className="relative mb-3">
        <ImageSlideshow
          images={product.images}
          alt={product.name}
          hoverPlay
          showDots
          showArrows={false}
          imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          overlay={<RakhiGiftBadge />}
        />
        {product.discountedPrice && (
          <span className="absolute top-2 left-2 bg-black text-white text-xs px-2 py-1 font-medium z-10">
            {Math.round((1 - product.discountedPrice / product.price) * 100)}% OFF
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-1">{product.variety}</p>
        <p className="font-semibold text-sm mb-1 group-hover:underline">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="font-bold">₹{product.discountedPrice || product.price}</span>
          {product.discountedPrice && (
            <span className="text-gray-400 line-through text-sm">₹{product.price}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
