import api from '../api/client';

/** Farmer has a future booking (pending or confirmed) — skip login gate */
export async function fetchUpcomingBooking() {
  try {
    const res = await api.get(`/bookings/upcoming?_t=${Date.now()}`);
    if (res.data?._id || res.data?.date) {
      localStorage.setItem('has_active_booking', 'true');
      localStorage.setItem('last_booking_date', res.data.date);
      return res.data;
    }
    return null;
  } catch (err) {
    console.warn('fetchUpcomingBooking failed', err);
    // Fallback: check if local storage had a future or current booking date
    const savedDate = localStorage.getItem('last_booking_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return { date: savedDate, location: localStorage.getItem('last_location') || 'Coimbatore' };
    }
    return null;
  }
}

export async function hasUpcomingBooking() {
  try {
    const booking = await fetchUpcomingBooking();
    if (booking?._id || booking?.date) {
      return true;
    }
    const savedDate = localStorage.getItem('last_booking_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
