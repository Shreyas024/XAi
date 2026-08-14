import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getHealth } from '../api/health';
import { SkeletonCard } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';

const COMPONENTS = [
  { key: 'mongodb', label: 'MongoDB', icon: '⛁', description: 'Database for scan results and findings' },
  { key: 'ollama', label: 'Ollama (CodeLlama)', icon: '⚙', description: 'Risk Engine for contextual code analysis' },
  { key: 'semgrep', label: 'Semgrep', icon: '⊘', description: 'Multi-language static analysis scanner' },
];

export default function Health() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCheck, setLastCheck] = useState(null);

  const fetchHealth = () => {
    setError(null);
    getHealth()
      .then(res => {
        setHealth(res.data);
        setLoading(false);
        setLastCheck(new Date());
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.title = 'System Health — XAI-SecOps';
  }, []);

  const getStatusConfig = (status) => {
    if (!status) return { color: 'text-text-muted', bg: 'bg-surface2', border: 'border-border', dot: 'bg-text-muted', label: 'Unknown' };
    const s = status.toLowerCase();
    if (
      s.includes('connected') ||
      (s.includes('available') && !s.includes('unavailable')) ||
      s.startsWith('v') ||
      (s.includes('installed') && !s.includes('not installed'))
    )
      return { color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/30', dot: 'bg-accent-green pulse-green', label: status };
    if (s.includes('error') || s.includes('not installed') || s.includes('disconnected'))
      return { color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/30', dot: 'bg-accent-red', label: status };
    return { color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/30', dot: 'bg-accent-amber', label: status };
  };

  const hasIssues = health && (
    !health.mongodb?.includes('connected') ||
    health.ollama?.includes('error') ||
    health.semgrep?.includes('not installed')
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchHealth} />;

  return (
    <div>
      {/* Warning Banner */}
      {hasIssues && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent-amber/10 border border-accent-amber/30 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-accent-amber"
        >
          <span>⚠</span>
          <span>One or more system components require attention.</span>
        </motion.div>
      )}

      {/* Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {COMPONENTS.map((comp, i) => {
          const status = health?.[comp.key];
          const cfg = getStatusConfig(status);
          return (
            <motion.div
              key={comp.key}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-surface border border-border rounded-lg p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{comp.icon}</span>
                  <span className="font-medium text-text-primary">{comp.label}</span>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              </div>
              <p className="text-xs text-text-muted mb-3">{comp.description}</p>
              <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                {cfg.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* System Info */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">System Status</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-accent-green pulse-green' : 'bg-accent-amber'}`} />
              <span className="text-sm text-text-primary font-medium capitalize">{health?.status || 'unknown'}</span>
              <span className="text-xs text-text-muted ml-2">v{health?.version || '0.1.0'}</span>
            </div>
          </div>
          {lastCheck && (
            <span className="text-xs text-text-muted">
              Last checked: {lastCheck.toLocaleTimeString()} · Auto-refreshing every 10s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
