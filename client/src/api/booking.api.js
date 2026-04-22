import axiosInstance from './axiosInstance';

export const createBooking = async (bookingData) => {
  const response = await axiosInstance.post('/bookings', bookingData);
  return response.data;
};

export const getMyBookings = async () => {
  const response = await axiosInstance.get('/bookings/my');
  return response.data;
};

export const getAllBookings = async () => {
  const response = await axiosInstance.get('/bookings');
  return response.data;
};
