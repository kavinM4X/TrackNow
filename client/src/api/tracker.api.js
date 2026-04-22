import axiosInstance from './axiosInstance';

export const getMyTracker = async () => {
  const response = await axiosInstance.get('/tracker/my');
  return response.data;
};

export const updateTrackerConfig = async (userId, trackerData) => {
  const response = await axiosInstance.patch(`/tracker/${userId}`, trackerData);
  return response.data;
};
