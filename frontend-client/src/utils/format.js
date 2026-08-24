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
  const s = String(id);
  return `USR-${s.slice(-4).toUpperCase()}`;
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

export function displayTotalKg(batch) {
  if (batch?.totalWeightKg != null && batch.totalWeightKg !== '') {
    return Number(batch.totalWeightKg);
  }
  const g = Number(batch?.goodSilkKg ?? batch?.quantityKg ?? 0);
  const w = Number(batch?.wasteKg ?? 0);
  const d = Number(batch?.doubles ?? 0);
  const sum = g + w + d;
  if (sum > 0) return Math.round(sum * 10) / 10;
  return Number(batch?.quantityKg ?? 0);
}
