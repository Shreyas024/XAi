import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '' : 'http://localhost:8000',
  timeout: 300000, // 5 min — scans can take a while
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
