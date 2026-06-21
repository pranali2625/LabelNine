export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2)
  return digits
}

export function normalizeLoginIdentifier(identifier) {
  const trimmed = String(identifier || '').trim()
  const phone = normalizePhone(trimmed)
  if (/^[6-9]\d{9}$/.test(phone)) return phone
  return trimmed.toLowerCase()
}

export function resolveAuthRedirect(path, role) {
  if (role === 'admin') return '/admin'
  if (!path || path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}
