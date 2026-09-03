import api from '../api/client';
import { storage } from './storage';

export async function fetchUpcomingBooking() {
  try {
    const res = await api.get(`/bookings/upcoming?_t=${Date.now()}`);
    if (res.data?._id || res.data?.date) {
      storage.setItem('has_active_booking', 'true');
      storage.setItem('last_booking_date', res.data.date);
      return res.data;
    }
    return null;
  } catch (err) {
    const savedDate = storage.getItem('last_booking_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return { date: savedDate, location: storage.getItem('last_location') || 'Coimbatore' };
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
    const savedDate = storage.getItem('last_booking_date');
    const today = new Date().toISOString().split('T')[0];
    if (savedDate && savedDate >= today) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
