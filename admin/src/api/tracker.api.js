import axiosInstance from './axiosInstance';

export const updateTrackerConfig = async (userId, trackerData) => {
  const response = await axiosInstance.patch(`/tracker/${userId}`, trackerData);
  return response.data;
};

export const getTrackerStatus = async (userId) => {
  const response = await axiosInstance.get(`/tracker/${userId}`);
  return response.data;
};
