import api from '../api/client';

/** Farmer has a future booking (pending or confirmed) — skip login gate */
export async function fetchUpcomingBooking() {
  const res = await api.get('/bookings/upcoming');
  return res.data || null;
}

export async function hasUpcomingBooking() {
  const booking = await fetchUpcomingBooking();
  return Boolean(booking?._id || booking?.date);
}
