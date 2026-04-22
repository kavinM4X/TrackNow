import axiosInstance from './axiosInstance';

export const getAllBookings = async () => {
  const response = await axiosInstance.get('/bookings');
  return response.data;
};
