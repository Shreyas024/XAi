import { getSeverityColor } from '../utils/format';

export function SeverityBadge({ severity }) {
  const colorClass = getSeverityColor(severity);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${colorClass}`}>
      {severity || 'UNKNOWN'}
    </span>
  );
}

export function StatusBadge({ status }) {
  const config = {
    completed: { label: 'Completed', bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/30', dot: 'bg-accent-green', effect: '' },
    running: { label: 'Running', bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/30', dot: 'bg-accent-blue pulse-blue', effect: 'scan-sweep' },
    failed: { label: 'Failed', bg: 'bg-accent-red/10', text: 'text-accent-red', border: 'border-accent-red/30', dot: 'bg-accent-red' },
    pending: { label: 'Pending', bg: 'bg-surface2', text: 'text-text-muted', border: 'border-border', dot: 'bg-text-muted', effect: '' },
  };

  const c = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${c.bg} ${c.text} ${c.border} ${c.effect || ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
