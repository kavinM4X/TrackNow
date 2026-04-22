import axiosInstance from './axiosInstance';

export const getAllUsers = async () => {
  const response = await axiosInstance.get('/users');
  return response.data;
};

export const createUser = async (userData) => {
  const response = await axiosInstance.post('/users', userData);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await axiosInstance.put(`/users/${userId}`, userData);
  return response.data;
};

export const toggleStatus = async (userId) => {
  const response = await axiosInstance.patch(`/users/${userId}/status`);
  return response.data;
};

export const resetPassword = async (userId, newPassword) => {
  const response = await axiosInstance.post(`/users/${userId}/reset-password`, { newPassword });
  return response.data;
};
