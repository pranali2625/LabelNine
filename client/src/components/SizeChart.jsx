import { X } from 'lucide-react'

const MEASUREMENTS = [
  { size: 'M', chest: '38–40"', chestCm: '96–102', length: '28"', shoulder: '17"' },
  { size: 'L', chest: '40–42"', chestCm: '102–107', length: '29"', shoulder: '18"' },
  { size: 'XL', chest: '42–44"', chestCm: '107–112', length: '30"', shoulder: '19"' },
  { size: 'XXL', chest: '44–46"', chestCm: '112–117', length: '31"', shoulder: '20"' },
]

export default function SizeChart({ open, onClose, fit }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        className="relative bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-lg sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-chart-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 id="size-chart-title" className="text-sm font-semibold tracking-wider">
            SIZE GUIDE
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {fit && (
            <p className="text-sm text-gray-600">
              This product has a <span className="font-medium text-black">{fit}</span> fit.
              Measurements below are garment dimensions in inches.
            </p>
          )}

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm border-collapse min-w-[320px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 font-semibold tracking-wide">Size</th>
                  <th className="text-left py-2 px-2 font-semibold tracking-wide">Chest</th>
                  <th className="text-left py-2 px-2 font-semibold tracking-wide hidden sm:table-cell">Chest (cm)</th>
                  <th className="text-left py-2 px-2 font-semibold tracking-wide">Length</th>
                  <th className="text-left py-2 px-2 font-semibold tracking-wide">Shoulder</th>
                </tr>
              </thead>
              <tbody>
                {MEASUREMENTS.map((row) => (
                  <tr key={row.size} className="border-b border-gray-100">
                    <td className="py-2.5 px-2 font-medium">{row.size}</td>
                    <td className="py-2.5 px-2 text-gray-600">{row.chest}</td>
                    <td className="py-2.5 px-2 text-gray-600 hidden sm:table-cell">{row.chestCm}</td>
                    <td className="py-2.5 px-2 text-gray-600">{row.length}</td>
                    <td className="py-2.5 px-2 text-gray-600">{row.shoulder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500 space-y-2 leading-relaxed">
            <p>
              <span className="font-medium text-gray-700">How to measure:</span> Lay the shirt flat.
              Chest is measured pit-to-pit and doubled. Length is from the highest shoulder point to the hem.
            </p>
            <p>
              For the best fit, compare these garment measurements with a shirt you already own.
              If you are between sizes, we recommend sizing up.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
