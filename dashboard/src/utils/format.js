import { formatDistanceToNow } from 'date-fns';

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '—';
  try {
    let str = String(dateString).trim();
    if (str && !str.endsWith('Z') && !str.includes('+') && !str.includes('-', 10)) {
      str += 'Z';
    }
    return formatDistanceToNow(new Date(str), { addSuffix: true });
  } catch {
    return '—';
  }
};

export const formatRiskScore = (score) => {
  if (score == null) return '0.0';
  return Number(score).toFixed(1);
};

export const getRiskColor = (score) => {
  if (score >= 8) return 'text-accent-red';
  if (score >= 5) return 'text-accent-amber';
  return 'text-accent-green';
};

export const getRiskBg = (score) => {
  if (score >= 8) return 'bg-accent-red';
  if (score >= 5) return 'bg-accent-amber';
  return 'bg-accent-green';
};

export const getRiskLevel = (score) => {
  if (score >= 8) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score >= 2) return 'LOW';
  return 'INFO';
};

export const getSeverityColor = (severity) => {
  switch (severity?.toUpperCase()) {
    case 'ERROR': return 'text-accent-red bg-accent-red/10 border-accent-red/30';
    case 'WARNING': return 'text-accent-amber bg-accent-amber/10 border-accent-amber/30';
    case 'INFO': return 'text-accent-blue bg-accent-blue/10 border-accent-blue/30';
    default: return 'text-text-muted bg-surface2 border-border';
  }
};

export const getFactorColor = (level) => {
  switch (level?.toLowerCase()) {
    case 'high': return '#DA3633';
    case 'medium': return '#D29922';
    case 'low': return '#238636';
    default: return '#8B949E';
  }
};

export const truncatePath = (path, maxLen = 40) => {
  if (!path || path.length <= maxLen) return path;
  return '...' + path.slice(-(maxLen - 3));
};
