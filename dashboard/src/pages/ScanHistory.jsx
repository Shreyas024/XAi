import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { listScans } from '../api/scans';
import { RiskBadge } from '../components/RiskBadge';
import { StatusBadge } from '../components/Badges';
import { SkeletonTable } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { formatRelativeTime, truncatePath } from '../utils/format';

export default function ScanHistory() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    setError(null);
    listScans(100)
      .then(res => { setScans(res.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    document.title = 'Scan History — XAI-SecOps';
  }, []);

  const filtered = scans.filter(s =>
    !filter || s.target?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <SkeletonTable rows={8} cols={6} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <div>
      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by target path..."
          className="w-full max-w-md bg-surface2 border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent-blue transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            {scans.length === 0 ? 'No scans yet.' : 'No scans match your filter.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
                <th className="text-left px-5 py-3 font-medium">Target Path</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Findings</th>
                <th className="text-left px-5 py-3 font-medium">C / H / M / L</th>
                <th className="text-left px-5 py-3 font-medium">Avg Risk</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((scan, i) => (
                <motion.tr
                  key={scan.scan_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 * Math.min(i, 20) }}
                  className="border-b border-border last:border-0 hover:bg-surface2/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/scans/${scan.scan_id}`)}
                >
                  <td className="px-5 py-3 text-sm font-mono text-text-primary">{truncatePath(scan.target, 50)}</td>
                  <td className="px-5 py-3"><StatusBadge status={scan.status} /></td>
                  <td className="px-5 py-3 text-sm font-mono">{scan.total_findings}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      {scan.critical_count > 0 && <span className="text-accent-red">{scan.critical_count}</span>}
                      {scan.high_count > 0 && <span className="text-accent-amber">{scan.high_count}</span>}
                      {scan.medium_count > 0 && <span className="text-yellow-600">{scan.medium_count}</span>}
                      {scan.low_count > 0 && <span className="text-accent-green">{scan.low_count}</span>}
                      {(scan.critical_count + scan.high_count + scan.medium_count + scan.low_count) === 0 && (
                        <span className="text-text-muted">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3"><RiskBadge score={scan.avg_risk_score} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
