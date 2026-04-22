import axiosInstance from './axiosInstance';

export const createBatch = async (batchData) => {
  const response = await axiosInstance.post('/batches', batchData);
  return response.data;
};

export const getAllBatches = async () => {
  const response = await axiosInstance.get('/batches');
  return response.data;
};
