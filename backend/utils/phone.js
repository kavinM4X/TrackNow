/** Normalize phone for storage and lookup (trim, remove spaces/dashes). */
function normalizePhone(phone) {
  if (phone == null) return '';
  return String(phone).trim().replace(/[\s-]/g, '');
}

/** Last 10 digits — matches +91 / 91 / local formats. */
function phoneTail(phone) {
  const digits = normalizePhone(phone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function phonesMatch(a, b) {
  const ta = phoneTail(a);
  const tb = phoneTail(b);
  return ta.length >= 10 && ta === tb;
}

module.exports = { normalizePhone, phoneTail, phonesMatch };
