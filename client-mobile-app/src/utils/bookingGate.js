import api, { deduplicatedGet } from '../api/client';

export async function hasUpcomingBooking() {
  try {
    const res = await deduplicatedGet('/bookings/upcoming', {}, 5000);
    return Boolean(res.data);
  } catch {
    return false;
  }
}
