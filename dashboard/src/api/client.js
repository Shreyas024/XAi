import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: 300000, // 5 min — scans can take a while
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
