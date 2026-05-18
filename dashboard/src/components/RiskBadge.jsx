import { motion } from 'framer-motion';
import { formatRiskScore, getRiskColor, getRiskBg } from '../utils/format';

export function RiskBadge({ score }) {
  const colorClass = getRiskColor(score);
  const bgClass = score >= 8
    ? 'bg-accent-red/10 border-accent-red/30'
    : score >= 5
      ? 'bg-accent-amber/10 border-accent-amber/30'
      : 'bg-accent-green/10 border-accent-green/30';

  const animateProps = score >= 8
    ? {
        scale: [1, 1.03, 1],
        transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
      }
    : {};

  return (
    <motion.span
      animate={animateProps}
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${bgClass} ${colorClass} ${score >= 8 ? 'threat-pulse' : ''}`}
    >
      {formatRiskScore(score)}
    </motion.span>
  );
}

export function RiskScoreLarge({ score }) {
  const colorClass = getRiskColor(score);

  return (
    <div className="flex items-baseline gap-1">
      <span className={`font-mono text-4xl font-bold ${colorClass}`}>
        {formatRiskScore(score)}
      </span>
      <span className="text-text-muted text-lg font-mono">/ 10</span>
    </div>
  );
}
