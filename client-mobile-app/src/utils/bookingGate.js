import api, { getStoredUser } from '../api/client';
import { storage } from './storage';

export async function fetchUpcomingBooking() {
  try {
    const user = getStoredUser();
    const uid = user?._id || user?.id || 'anon';
    const res = await api.get(`/bookings/upcoming?_t=${Date.now()}`);
    if (res.data?._id || res.data?.date) {
      storage.setItem(`has_active_booking_${uid}`, 'true');
      storage.setItem(`last_booking_date_${uid}`, res.data.date);
      return res.data;
    }
    return null;
  } catch (err) {
    const user = getStoredUser();
    const uid = user?._id || user?.id || 'anon';
    const savedDate = storage.getItem(`last_booking_date_${uid}`);
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return { date: savedDate, location: storage.getItem(`last_location_${uid}`) || 'Coimbatore' };
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
    const savedDate = storage.getItem(`last_booking_date_${uid}`);
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
