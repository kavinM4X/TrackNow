import api, { getStoredUser } from '../api/client';

/** Farmer has a future booking (pending or confirmed) — skip login gate */
export async function fetchUpcomingBooking() {
  try {
    const user = getStoredUser();
    const uid = user?._id || user?.id || 'anon';
    const res = await api.get(`/bookings/upcoming?_t=${Date.now()}`);
    if (res.data?._id || res.data?.date) {
      localStorage.setItem(`has_active_booking_${uid}`, 'true');
      localStorage.setItem(`last_booking_date_${uid}`, res.data.date);
      return res.data;
    }
    return null;
  } catch (err) {
    const user = getStoredUser();
    const uid = user?._id || user?.id || 'anon';
    const savedDate = localStorage.getItem(`last_booking_date_${uid}`);
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return { date: savedDate, location: localStorage.getItem(`last_location_${uid}`) || 'Coimbatore' };
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
    const user = getStoredUser();
    const uid = user?._id || user?.id || 'anon';
    const savedDate = localStorage.getItem(`last_booking_date_${uid}`);
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
