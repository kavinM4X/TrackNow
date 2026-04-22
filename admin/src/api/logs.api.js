import axiosInstance from './axiosInstance';

export const getLogs = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.type) params.append('type', filters.type);
  
  const queryString = params.toString();
  const response = await axiosInstance.get(`/logs${queryString ? '?' + queryString : ''}`);
  return response.data;
};
