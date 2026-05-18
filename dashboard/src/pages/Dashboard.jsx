import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listScans } from '../api/scans';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/Badges';
import { SkeletonCard, SkeletonTable } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { formatRelativeTime, truncatePath } from '../utils/format';

export default function Dashboard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    setError(null);
    listScans(50)
      .then(res => { setScans(res.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    document.title = 'Dashboard — XAI-SecOps';
  }, []);

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  }

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  // Compute stats based on the latest scan for each unique target
  const latestScansByTarget = {};
  scans.forEach(scan => {
    if (!latestScansByTarget[scan.target]) {
      latestScansByTarget[scan.target] = scan;
    }
  });
  const activeScans = Object.values(latestScansByTarget);

  const totalScans = scans.length;
  const totalCritical = activeScans.reduce((sum, s) => sum + (s.critical_count || 0), 0);
  const avgRisk = activeScans.length
    ? activeScans.reduce((sum, s) => sum + (s.avg_risk_score || 0), 0) / activeScans.length
    : 0;
  const lastScanTime = scans.length ? scans[0]?.created_at : null;

  // Risk distribution across active codebase
  const totalC = activeScans.reduce((s, x) => s + (x.critical_count || 0), 0);
  const totalH = activeScans.reduce((s, x) => s + (x.high_count || 0), 0);
  const totalM = activeScans.reduce((s, x) => s + (x.medium_count || 0), 0);
  const totalL = activeScans.reduce((s, x) => s + (x.low_count || 0), 0);
  const totalFindings = totalC + totalH + totalM + totalL;

  const recentScans = scans.slice(0, 5);

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Scans" value={totalScans} icon="⊘" />
        <StatCard label="Critical Findings" value={totalCritical} color="text-accent-red" icon="⚠" />
        <StatCard label="Avg Risk Score" value={avgRisk} isScore suffix=" / 10" color={avgRisk >= 8 ? 'text-accent-red' : avgRisk >= 5 ? 'text-accent-amber' : 'text-accent-green'} icon="◉" />
      </div>

      {/* Risk Distribution Bar */}
      {totalFindings > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel soft-hover rounded-xl p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Risk Distribution</h3>
            <span className="text-xs text-text-muted">{totalFindings} total findings</span>
          </div>
          <div className="h-3 bg-surface2 rounded-md overflow-hidden flex">
            {[
              { count: totalC, color: 'bg-accent-red', label: 'Critical' },
              { count: totalH, color: 'bg-accent-amber', label: 'High' },
              { count: totalM, color: 'bg-yellow-600', label: 'Medium' },
              { count: totalL, color: 'bg-accent-green', label: 'Low' },
            ].map((item, i) => (
              item.count > 0 && (
                <motion.div
                  key={i}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / totalFindings) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`${item.color} h-full`}
                  title={`${item.label}: ${item.count}`}
                />
              )
            ))}
          </div>
          <div className="flex gap-4 mt-2">
            {[
              { label: 'Critical', count: totalC, color: 'bg-accent-red' },
              { label: 'High', count: totalH, color: 'bg-accent-amber' },
              { label: 'Medium', count: totalM, color: 'bg-yellow-600' },
              { label: 'Low', count: totalL, color: 'bg-accent-green' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-text-muted">
                <span className={`w-2 h-2 rounded-sm ${item.color}`} />
                {item.label}: <span className="font-mono text-text-primary">{item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Scans Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border/80">
          <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider">Recent Scans</h3>
        </div>

        {recentScans.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No scans yet. Click "New Scan" to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
                <th className="text-left px-5 py-3 font-medium">Target</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Findings</th>
                <th className="text-left px-5 py-3 font-medium">Risk Score</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentScans.map((scan, i) => (
                <motion.tr
                  key={scan.scan_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * i }}
                  className="border-b border-border/80 last:border-0 hover:bg-surface2/45 transition-colors cursor-pointer"
                  onClick={() => navigate(`/scans/${scan.scan_id}`)}
                >
                  <td className="px-5 py-3 text-sm font-mono text-text-primary">{truncatePath(scan.target)}</td>
                  <td className="px-5 py-3"><StatusBadge status={scan.status} /></td>
                  <td className="px-5 py-3 text-sm font-mono">{scan.total_findings}</td>
                  <td className="px-5 py-3"><RiskBadge score={scan.avg_risk_score} /></td>
                  <td className="px-5 py-3">
                    <span className="text-xs text-accent-blue hover:underline">View →</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
