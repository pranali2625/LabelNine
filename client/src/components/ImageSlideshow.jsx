import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'

const PLACEHOLDER = 'https://placehold.co/600x800/e5e5e5/999?text=LABEL+NINE'
const SWIPE_THRESHOLD = 50

export default function ImageSlideshow({
  images = [],
  alt = '',
  placeholder = PLACEHOLDER,
  autoPlay = false,
  autoPlayInterval = 4000,
  hoverPlay = false,
  hoverPlayInterval = 1500,
  showThumbnails = false,
  showArrows = true,
  showDots = false,
  className = '',
  imgClassName = 'w-full h-full object-cover',
  pauseOnHover = true,
  enableSwipe = true,
}) {
  const validImages = images.filter((img) => img?.url)
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)
  const [autoPlayPaused, setAutoPlayPaused] = useState(false)

  const containerRef = useRef(null)
  const touchStart = useRef(null)
  const didSwipe = useRef(false)

  useEffect(() => {
    setIndex(0)
    setAutoPlayPaused(false)
  }, [images])

  useEffect(() => {
    if (validImages.length <= 1) return

    const shouldAutoPlay = autoPlay && !autoPlayPaused && !(pauseOnHover && hovering)
    const shouldHoverPlay = hoverPlay && hovering

    if (!shouldAutoPlay && !shouldHoverPlay) return

    const interval = shouldHoverPlay ? hoverPlayInterval : autoPlayInterval
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % validImages.length)
    }, interval)

    return () => clearInterval(timer)
  }, [
    validImages.length,
    autoPlay,
    autoPlayInterval,
    hoverPlay,
    hoverPlayInterval,
    hovering,
    pauseOnHover,
    autoPlayPaused,
  ])

  useEffect(() => {
    const el = containerRef.current
    if (!el || !enableSwipe || validImages.length <= 1) return

    const onTouchStart = (e) => {
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
      didSwipe.current = false
    }

    const onTouchMove = (e) => {
      if (!touchStart.current) return
      const dx = e.touches[0].clientX - touchStart.current.x
      const dy = e.touches[0].clientY - touchStart.current.y
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        didSwipe.current = true
        e.preventDefault()
      }
    }

    const onTouchEnd = (e) => {
      if (!touchStart.current) return
      const dx = e.changedTouches[0].clientX - touchStart.current.x
      if (Math.abs(dx) >= SWIPE_THRESHOLD) {
        setAutoPlayPaused(true)
        setIndex((i) => {
          const next = dx < 0 ? i + 1 : i - 1
          return (next + validImages.length) % validImages.length
        })
        didSwipe.current = true
        e.preventDefault()
        e.stopPropagation()
      }
      touchStart.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [enableSwipe, validImages.length])

  const currentUrl = validImages[index]?.url || placeholder
  const hasMultiple = validImages.length > 1

  const goTo = (next) => {
    if (!hasMultiple) return
    setAutoPlayPaused(true)
    setIndex((i) => (next + validImages.length) % validImages.length)
  }

  const selectIndex = (i) => {
    setAutoPlayPaused(true)
    setIndex(i)
  }

  const handleClickCapture = (e) => {
    if (didSwipe.current) {
      e.preventDefault()
      e.stopPropagation()
      didSwipe.current = false
    }
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative bg-gray-100 aspect-[3/4] overflow-hidden touch-pan-y select-none"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClickCapture={handleClickCapture}
      >
        <img
          key={currentUrl}
          src={currentUrl}
          alt={alt}
          className={`${imgClassName} transition-opacity duration-500 pointer-events-none`}
          loading="lazy"
          draggable={false}
        />

        {hasMultiple && autoPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setAutoPlayPaused((p) => !p)
            }}
            className="absolute top-2 right-2 bg-black/60 text-white p-2 hover:bg-black/80 transition-colors z-10"
            aria-label={autoPlayPaused ? 'Resume slideshow' : 'Pause slideshow'}
          >
            {autoPlayPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        )}

        {hasMultiple && showArrows && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goTo(index - 1)
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goTo(index + 1)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {hasMultiple && showDots && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {validImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  selectIndex(i)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === i ? 'bg-white' : 'bg-white/50'
                }`}
                aria-label={`View image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {hasMultiple && showThumbnails && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {validImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => selectIndex(i)}
              className={`w-16 h-20 flex-shrink-0 overflow-hidden border-2 ${
                index === i ? 'border-black' : 'border-transparent'
              }`}
            >
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
