// Default fit-based charts used when a product has no custom sizeChart

export const CHART_SIZES = ['M', 'L', 'XL', 'XXL']

export const SIZE_CHARTS = {
  Slim: {
    label: 'Slim Fit',
    sizes: {
      M: { chest: 42, shoulder: 18, length: 29.5 },
      L: { chest: 43, shoulder: 18.5, length: 30 },
      XL: { chest: 45, shoulder: 19, length: 30.5 },
      XXL: { chest: 47, shoulder: 19.5, length: 31 },
    },
  },
  Regular: {
    label: 'Regular Fit',
    sizes: {
      M: { chest: '40–42', shoulder: 18, length: 28.5 },
      L: { chest: '42–44', shoulder: 18.5, length: 29 },
      XL: { chest: '44–46', shoulder: 19, length: 30 },
      XXL: { chest: '46–48', shoulder: 19.5, length: 30.5 },
    },
  },
  Relaxed: {
    label: 'Relaxed Fit',
    sizes: {
      M: { chest: 42, shoulder: 18, length: 29.5 },
      L: { chest: 44, shoulder: 18.5, length: 30 },
      XL: { chest: 46, shoulder: 19, length: 30.5 },
      XXL: { chest: 48, shoulder: 19.5, length: 31.5 },
    },
  },
  Oversized: {
    label: 'Oversized Fit',
    sizes: {
      M: { chest: 44, shoulder: 18.5, length: 30 },
      L: { chest: 46, shoulder: 19, length: 30.5 },
      XL: { chest: 48, shoulder: 19.5, length: 31 },
      XXL: { chest: 50, shoulder: 20, length: 31.5 },
    },
  },
}

function normalizeFitKey(fit) {
  if (!fit) return 'Regular'
  const raw = String(fit).trim().toLowerCase().replace(/\s*fit\s*$/i, '')
  return Object.keys(SIZE_CHARTS).find((k) => k.toLowerCase() === raw) || 'Regular'
}

export function getSizeChartForFit(fit) {
  return SIZE_CHARTS[normalizeFitKey(fit)]
}

/** Prefer product-specific chart; fall back to fit defaults */
export function resolveSizeChart(sizeChart, fit) {
  if (sizeChart && typeof sizeChart === 'object' && Object.keys(sizeChart).length) {
    return {
      label: 'Product Size Chart',
      sizes: sizeChart,
      isCustom: true,
    }
  }
  const fallback = getSizeChartForFit(fit)
  return { ...fallback, isCustom: false }
}

export function getMeasurements(sizeChartOrFit, size, fit) {
  // Back-compat: getMeasurements(fit, size)
  if (typeof sizeChartOrFit === 'string' || sizeChartOrFit == null) {
    const chart = getSizeChartForFit(sizeChartOrFit)
    return chart.sizes[size] || null
  }
  // getMeasurements(sizeChart, size, fit)
  const chart = resolveSizeChart(sizeChartOrFit, fit)
  return chart.sizes[size] || null
}

export function formatInches(value) {
  if (value == null || value === '') return '—'
  return typeof value === 'number' ? String(value) : String(value)
}

export function emptySizeChartForm(fit) {
  const template = getSizeChartForFit(fit).sizes
  const form = {}
  for (const size of CHART_SIZES) {
    const row = template[size]
    form[size] = {
      chest: row?.chest != null ? String(row.chest) : '',
      shoulder: row?.shoulder != null ? String(row.shoulder) : '',
      length: row?.length != null ? String(row.length) : '',
    }
  }
  return form
}

export function sizeChartToForm(sizeChart, fit) {
  if (sizeChart && typeof sizeChart === 'object' && Object.keys(sizeChart).length) {
    const form = emptySizeChartForm(fit)
    for (const size of CHART_SIZES) {
      const row = sizeChart[size]
      if (!row) continue
      form[size] = {
        chest: row.chest != null ? String(row.chest) : '',
        shoulder: row.shoulder != null ? String(row.shoulder) : '',
        length: row.length != null ? String(row.length) : '',
      }
    }
    return form
  }
  return emptySizeChartForm(fit)
}

export function formToSizeChart(form) {
  if (!form || typeof form !== 'object') return null
  const chart = {}
  for (const size of CHART_SIZES) {
    const row = form[size]
    if (!row) continue
    const chest = String(row.chest || '').trim()
    const shoulder = String(row.shoulder || '').trim()
    const length = String(row.length || '').trim()
    if (!chest && !shoulder && !length) continue
    chart[size] = { chest, shoulder, length }
  }
  return Object.keys(chart).length ? chart : null
}
