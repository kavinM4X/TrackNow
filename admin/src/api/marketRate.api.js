import axiosInstance from './axiosInstance';

export const getLatestRates = async () => {
  const response = await axiosInstance.get('/rates/latest');
  return response.data;
};

export const getRateHistory = async () => {
  const response = await axiosInstance.get('/rates');
  return response.data;
};

export const publishRate = async (rateData) => {
  const response = await axiosInstance.post('/rates', rateData);
  return response.data;
};
