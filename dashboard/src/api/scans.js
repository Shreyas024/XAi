import api from './client';

export const createScan = (target, config = 'auto', useCustomRules = true) =>
  api.post('/scans', { target, config, use_custom_rules: useCustomRules });

export const listScans = (limit = 50, skip = 0) =>
  api.get('/scans', { params: { limit, skip } });

export const getScan = (scanId) =>
  api.get(`/scans/${scanId}`);

export const deleteScan = (scanId) =>
  api.delete(`/scans/${scanId}`);
