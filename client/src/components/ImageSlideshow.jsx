import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PLACEHOLDER = 'https://placehold.co/600x800/e5e5e5/999?text=LABEL+NINE'

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
}) {
  const validImages = images.filter((img) => img?.url)
  const [index, setIndex] = useState(0)
  const [hovering, setHovering] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [images])

  useEffect(() => {
    if (validImages.length <= 1) return

    const shouldAutoPlay = autoPlay && !(pauseOnHover && hovering)
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
  ])

  const currentUrl = validImages[index]?.url || placeholder
  const hasMultiple = validImages.length > 1

  const goTo = (next) => {
    if (!hasMultiple) return
    setIndex((i) => (next + validImages.length) % validImages.length)
  }

  return (
    <div className={className}>
      <div
        className="relative bg-gray-100 aspect-[3/4] overflow-hidden"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <img
          key={currentUrl}
          src={currentUrl}
          alt={alt}
          className={`${imgClassName} transition-opacity duration-500`}
          loading="lazy"
        />

        {hasMultiple && showArrows && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
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
                  setIndex(i)
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
              onClick={() => setIndex(i)}
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
