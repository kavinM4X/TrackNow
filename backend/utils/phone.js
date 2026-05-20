/** Normalize phone for storage and lookup (trim, remove spaces/dashes). */
function normalizePhone(phone) {
  if (phone == null) return '';
  return String(phone).trim().replace(/[\s-]/g, '');
}

module.exports = { normalizePhone };
