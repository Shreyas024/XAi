import { motion } from 'framer-motion';
import { getFactorColor } from '../utils/format';

const FACTOR_LABELS = {
  severity_weight: 'Severity',
  exploitability: 'Exploitability',
  data_sensitivity: 'Data Sensitivity',
  exposure: 'Exposure',
  fix_complexity: 'Fix Complexity',
};

const FACTOR_WEIGHTS = {
  severity_weight: 30,
  exploitability: 25,
  data_sensitivity: 20,
  exposure: 15,
  fix_complexity: 10,
};

export function RiskFactorBars({ factors, contributions }) {
  // Use contributions if available (from /explain endpoint), else fall back to raw factors
  const items = contributions
    ? contributions.map(c => ({
        name: c.name,
        label: c.label,
        value: c.value,
        weight: Math.round(c.weight * 100),
        level: c.level,
        description: c.description,
      }))
    : Object.entries(factors || {}).map(([name, value]) => ({
        name,
        label: FACTOR_LABELS[name] || name,
        value,
        weight: FACTOR_WEIGHTS[name] || 0,
        level: value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low',
        description: '',
      }));

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-text-primary">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{item.weight}%</span>
              <span className="text-xs font-mono font-semibold" style={{ color: getFactorColor(item.level) }}>
                {(item.value * 100).toFixed(0)}
              </span>
            </div>
          </div>
          <div className="h-2 bg-surface2 rounded-md overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${item.value * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.1, type: 'spring', stiffness: 100, damping: 20 }}
              className="h-full rounded-md"
              style={{ backgroundColor: getFactorColor(item.level) }}
            />
          </div>
          {item.description && (
            <p className="text-xs text-text-muted mt-0.5">{item.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
