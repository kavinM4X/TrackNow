import { format, parseISO } from 'date-fns';

export function formatINR(val) {
  if (val == null || Number.isNaN(Number(val))) return '₹0';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(Number(val));
  } catch (e) {
    // Fallback for React Native without Intl support (common on Android)
    return '₹' + Math.round(Number(val)).toString();
  }
}

export function formatDateDayMonth(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(d, 'd MMM');
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(d, 'EEE, d MMM');
  } catch {
    return dateStr;
  }
}

export function formatDateFull(dateStr) {
  if (!dateStr) return '';
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(d, 'EEEE, d MMMM yyyy');
  } catch {
    return dateStr;
  }
}

export function todayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'F';
}

export function displayTotalKg(batch) {
  if (!batch) return 0;
  if (batch.totalHarvestKg != null) return Number(batch.totalHarvestKg);
  if (batch.goodSilkKg != null || batch.wasteKg != null) {
    return Number(batch.goodSilkKg || 0) + Number(batch.wasteKg || 0);
  }
  if (batch.quantityKg != null) return Number(batch.quantityKg);
  return 0;
}
