import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getScan } from '../api/scans';
import { Breadcrumb } from '../components/Breadcrumb';
import { RiskBadge } from '../components/RiskBadge';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { SkeletonTable } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { ReportModal } from '../components/ReportModal';
import { formatRelativeTime, formatRiskScore, getRiskLevel, truncatePath } from '../utils/format';

const FILTER_OPTIONS = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function ScanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [reportOpen, setReportOpen] = useState(false);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    getScan(id)
      .then(res => { setScan(res.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    if (scan) document.title = `Scan #${id.slice(0, 8)} — XAI-SecOps`;
  }, [scan, id]);

  if (loading) return <SkeletonTable rows={8} cols={5} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!scan) return <ErrorState message="Scan not found" />;

  const filteredFindings = scan.findings?.filter(f => {
    if (activeFilter === 'ALL') return true;
    return getRiskLevel(f.risk_score) === activeFilter;
  }) || [];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/' },
        { label: `Scan #${id.slice(0, 8)}` },
      ]} />

      {/* Scan Metadata */}
      <div className="bg-surface border border-border rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1 font-mono">{truncatePath(scan.target, 60)}</h2>
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <StatusBadge status={scan.status} />
              <span>{formatRelativeTime(scan.created_at)}</span>
              <span>{scan.total_findings} findings</span>
            </div>
            {scan.error && (
              <p className="mt-2 text-sm text-accent-red">{scan.error}</p>
            )}
          </div>
          <button
            onClick={() => setReportOpen(true)}
            className="bg-accent-purple/10 border border-accent-purple/30 text-accent-purple text-sm font-medium px-4 py-1.5 rounded-md hover:bg-accent-purple/20 transition-colors"
          >
            View Report
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 mt-4">
          {[
            { label: 'Critical', count: scan.critical_count, color: 'bg-accent-red/10 text-accent-red border-accent-red/30' },
            { label: 'High', count: scan.high_count, color: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30' },
            { label: 'Medium', count: scan.medium_count, color: 'bg-yellow-600/10 text-yellow-500 border-yellow-600/30' },
            { label: 'Low', count: scan.low_count, color: 'bg-accent-green/10 text-accent-green border-accent-green/30' },
          ].map(item => (
            <span key={item.label} className={`px-2.5 py-1 rounded-md text-xs font-medium border ${item.color}`}>
              {item.label}: {item.count || 0}
            </span>
          ))}
          <span className="ml-auto text-sm text-text-muted">
            Avg Risk: <span className="font-mono font-semibold text-text-primary">{formatRiskScore(scan.avg_risk_score)}</span>
          </span>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 mb-4">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => setActiveFilter(opt)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              activeFilter === opt
                ? 'bg-surface2 text-text-primary border-border'
                : 'bg-transparent text-text-muted border-transparent hover:border-border'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Findings Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {scan.total_findings === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-accent-green text-xl font-bold mb-1">
              ✓
            </div>
            <h3 className="text-base font-semibold text-text-primary">No Vulnerabilities Detected</h3>
            <p className="text-sm text-text-muted max-w-md">
              The security scan completed successfully and found no known vulnerabilities in this codebase.
            </p>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No findings match the "{activeFilter}" filter.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-text-muted uppercase tracking-wider border-b border-border">
                <th className="text-left px-5 py-3 font-medium">Severity</th>
                <th className="text-left px-5 py-3 font-medium">File : Line</th>
                <th className="text-left px-5 py-3 font-medium">Rule ID</th>
                <th className="text-left px-5 py-3 font-medium">Risk Score</th>
                <th className="text-left px-5 py-3 font-medium">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredFindings.map((finding, i) => (
                  <motion.tr
                    key={finding.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.03 * Math.min(i, 20) }}
                    className="border-b border-border last:border-0 hover:bg-surface2/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/scans/${id}/findings/${finding.id}`)}
                  >
                    <td className="px-5 py-3"><SeverityBadge severity={finding.severity} /></td>
                    <td className="px-5 py-3 text-sm font-mono text-text-primary">
                      {truncatePath(finding.file, 30)}:{finding.line_start}
                    </td>
                    <td className="px-5 py-3 text-sm font-mono text-text-muted">{finding.rule_id}</td>
                    <td className="px-5 py-3"><RiskBadge score={finding.risk_score} /></td>
                    <td className="px-5 py-3 text-xs font-semibold" style={{
                      color: finding.risk_score >= 8 ? '#DA3633' : finding.risk_score >= 5 ? '#D29922' : '#238636'
                    }}>
                      {finding.risk_level || getRiskLevel(finding.risk_score)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <ReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} scanId={id} />
    </div>
  );
}
