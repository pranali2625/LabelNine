import { getMeasurements } from '../constants/sizeCharts'

const AVAILABLE_SIZES = ['M', 'L', 'XL', 'XXL']

const CREAM = '#f5f0e8'
const CREAM_BORDER = '#e0d5c5'

function MeasureBar({ measurements, size }) {
  if (!measurements) {
    return (
      <div
        className="px-4 py-3 mb-2.5 text-xs text-gray-400"
        style={{ backgroundColor: CREAM }}
      >
        Measurements not available for size {size}
      </div>
    )
  }

  const items = [
    { label: 'Chest', value: measurements.chest },
    { label: 'Shoulder', value: measurements.shoulder },
    { label: 'Length', value: measurements.length },
  ]

  return (
    <div
      key={size}
      className="px-4 py-3 mb-2.5 text-[13px] sm:text-sm text-gray-800"
      style={{ backgroundColor: CREAM }}
    >
      <div className="flex flex-wrap items-center">
        {items.map((item, i) => (
          <span key={item.label} className="inline-flex items-center">
            {i > 0 && (
              <span className="text-gray-300 mx-3 sm:mx-4 select-none" aria-hidden="true">
                |
              </span>
            )}
            <span className="text-gray-500">{item.label}:</span>
            <span className="font-bold text-gray-900 ml-0.5">{item.value} in</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SizeSelector({
  sizes,
  fit,
  sizeChart,
  selectedSize,
  onSelectSize,
  onOpenSizeGuide,
}) {
  const available = sizes.filter(({ size }) => AVAILABLE_SIZES.includes(size))
  const measurements = selectedSize
    ? getMeasurements(sizeChart, selectedSize, fit)
    : null

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold tracking-wider">SIZES</h3>
        <button
          type="button"
          onClick={onOpenSizeGuide}
          className="text-xs text-gray-500 underline underline-offset-2 hover:text-black transition-colors"
        >
          Size Guide
        </button>
      </div>

      {selectedSize ? (
        <MeasureBar measurements={measurements} size={selectedSize} />
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-200 px-4 py-3 mb-2.5 text-xs text-gray-400 text-center">
          Tap a size to view measurements
        </div>
      )}

      <div className="flex gap-2">
        {available.map(({ size, stock }) => {
          const isSelected = selectedSize === size
          const outOfStock = stock === 0

          let className =
            'flex-1 h-11 min-w-[2.75rem] text-sm font-bold border transition-colors duration-150 '

          if (outOfStock) {
            className += 'border-gray-200 text-gray-300 bg-white cursor-not-allowed'
          } else if (isSelected) {
            className += 'text-gray-900 border-[#e0d5c5]'
          } else {
            className += 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
          }

          return (
            <button
              key={size}
              type="button"
              disabled={outOfStock}
              onClick={() => onSelectSize(size)}
              className={className}
              style={isSelected && !outOfStock ? { backgroundColor: CREAM, borderColor: CREAM_BORDER } : undefined}
            >
              {size}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { AVAILABLE_SIZES }
