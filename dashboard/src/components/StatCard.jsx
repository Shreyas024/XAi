import { motion } from 'framer-motion';
import { useCountUp } from '../hooks/useCountUp';
import { formatRiskScore } from '../utils/format';

export function StatCard({ label, value, suffix = '', isScore = false, color = 'text-text-primary', icon }) {
  const animatedValue = useCountUp(typeof value === 'number' ? value : 0, 800);
  const isCriticalMetric = label.toLowerCase().includes('critical') && Number(value) > 0;

  const displayValue = isScore
    ? formatRiskScore(animatedValue)
    : typeof value === 'number'
      ? Math.round(animatedValue)
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-surface border border-border rounded-lg p-5 flex flex-col gap-1 ${isCriticalMetric ? 'soft-hover' : ''}`}
    >
      <div className="flex items-center gap-2 text-text-muted text-xs font-medium uppercase tracking-wider">
        {icon && (
          <motion.span
            className="text-sm"
            animate={isCriticalMetric ? { rotate: [0, -8, 8, 0] } : {}}
            transition={isCriticalMetric ? { duration: 1.4, repeat: Infinity, repeatDelay: 1.2 } : {}}
          >
            {icon}
          </motion.span>
        )}
        {label}
      </div>
      <div className={`font-mono text-2xl font-bold ${color}`}>
        {displayValue}{suffix}
      </div>
    </motion.div>
  );
}
