import axios from 'axios';

/** No auth — driver vehicle rental portal */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api'
});

export default publicApi;
