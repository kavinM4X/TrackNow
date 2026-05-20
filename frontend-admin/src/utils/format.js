export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateDayMonth(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function shortUserId(id) {
  if (!id) return '—';
  return `USR-${String(id).slice(-4).toUpperCase()}`;
}

export function initials(name) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function formatINR(amount) {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

export const MARKETS = [
  { label: 'Coimbatore', key: 'coimbatore' },
  { label: 'Mamballi', key: 'mamballi' },
  { label: 'Ramnagar', key: 'ramnagar' },
  { label: 'Dharmapuri', key: 'dharmapuri' }
];

export function formatBookingId(id) {
  if (!id) return '—';
  const s = String(id);
  const year = new Date().getFullYear();
  return `BK-${year}-${s.slice(-3).toUpperCase()}`;
}
