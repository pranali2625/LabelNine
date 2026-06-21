const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizeLoginIdentifier = (identifier) => {
  const trimmed = String(identifier || '').trim();
  const phone = normalizePhone(trimmed);
  if (/^[6-9]\d{9}$/.test(phone)) return { type: 'phone', value: phone };
  return { type: 'email', value: trimmed.toLowerCase() };
};

module.exports = { normalizePhone, normalizeEmail, normalizeLoginIdentifier };
