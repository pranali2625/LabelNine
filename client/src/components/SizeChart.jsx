import { X } from 'lucide-react'
import { resolveSizeChart, formatInches } from '../constants/sizeCharts'

export default function SizeChart({ open, onClose, fit, sizeChart }) {
  if (!open) return null

  const chart = resolveSizeChart(sizeChart, fit)
  const rows = Object.entries(chart.sizes)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div
        className="relative bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-chart-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 id="size-chart-title" className="text-sm font-bold tracking-wider">
              SIZE GUIDE
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{chart.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-xs text-gray-500 leading-relaxed">
            All measurements are garment dimensions in inches. Lay the shirt flat —
            chest is pit-to-pit, shoulder is seam-to-seam, length is highest shoulder point to hem.
          </p>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f5f0e8] text-left">
                  <th className="py-3 px-4 font-semibold text-xs tracking-wide">Size</th>
                  <th className="py-3 px-3 font-semibold text-xs tracking-wide">Chest</th>
                  <th className="py-3 px-3 font-semibold text-xs tracking-wide">Shoulder</th>
                  <th className="py-3 px-4 font-semibold text-xs tracking-wide">Length</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([size, m], i) => (
                  <tr
                    key={size}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}
                  >
                    <td className="py-3 px-4 font-semibold">{size}</td>
                    <td className="py-3 px-3 text-gray-700">{formatInches(m.chest)}"</td>
                    <td className="py-3 px-3 text-gray-700">{formatInches(m.shoulder)}"</td>
                    <td className="py-3 px-4 text-gray-700">{formatInches(m.length)}"</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to measure — below size table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <img
              src="/images/how-to-measure.png"
              alt="How to measure a shirt: across shoulder, chest, and front length"
              className="w-full h-auto block"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
