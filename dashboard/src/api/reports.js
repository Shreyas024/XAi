import api from './client';

export const getFindingExplanation = (scanId, findingId) =>
  api.get(`/reports/${scanId}/findings/${findingId}/explain`);

export const getScanReportSummary = (scanId) =>
  api.get(`/reports/${scanId}/summary`);
