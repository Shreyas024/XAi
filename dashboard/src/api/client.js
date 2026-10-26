import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 600000, // 10 min — allow local CPU model inference
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
