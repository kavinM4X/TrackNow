import axiosInstance from './axiosInstance';

export const getMyBatches = async (userId) => {
  const response = await axiosInstance.get(`/batches/user/${userId}`);
  return response.data;
};

export const createBatch = async (batchData) => {
  const response = await axiosInstance.post('/batches', batchData);
  return response.data;
};
