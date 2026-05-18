import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getScanReportSummary } from '../api/reports';

const RISK_COLORS = {
  CRITICAL: '#DA3633',
  HIGH: '#D29922',
  MEDIUM: '#D29922',
  LOW: '#238636',
  INFO: '#8B949E',
};

export function ReportModal({ isOpen, onClose, scanId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !scanId) return;
    setLoading(true);
    getScanReportSummary(scanId)
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [isOpen, scanId]);

  const pieData = data?.risk_distribution
    ? Object.entries(data.risk_distribution)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const barData = data?.top_risk_factors?.map(f => ({
    name: f.factor.replace('_', ' ').replace(/^\w/, c => c.toUpperCase()),
    avg: Math.round(f.average_value * 100),
    max: Math.round(f.max_value * 100),
  })) || [];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-8 bg-surface border border-border rounded-lg z-50 overflow-auto shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-surface z-10">
              <h2 className="text-lg font-semibold">Scan Report</h2>
              <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">✕</button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-text-muted">Loading report...</div>
            ) : error ? (
              <div className="p-8 text-center text-accent-red">{error}</div>
            ) : (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Distribution Donut */}
                <div className="bg-bg border border-border rounded-lg p-5">
                  <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Risk Distribution</h3>
                  {pieData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            innerRadius={50}
                            outerRadius={80}
                            dataKey="value"
                            paddingAngle={2}
                            animationBegin={0}
                            animationDuration={800}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={RISK_COLORS[entry.name] || '#8B949E'} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap gap-3 mt-3 justify-center">
                        {pieData.map(entry => (
                          <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[entry.name] }} />
                            <span className="text-text-muted">{entry.name}</span>
                            <span className="font-mono text-text-primary">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-text-muted text-sm text-center py-10">No findings</div>
                  )}
                </div>

                {/* Top Risk Factors Bar Chart */}
                <div className="bg-bg border border-border rounded-lg p-5">
                  <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Risk Factors</h3>
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: '#8B949E', fontSize: 11 }} width={90} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '6px', color: '#E6EDF3' }}
                        />
                        <Bar dataKey="avg" fill="#1F6FEB" name="Average" radius={[0, 2, 2, 0]} />
                        <Bar dataKey="max" fill="#DA3633" name="Max" radius={[0, 2, 2, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-text-muted text-sm text-center py-10">No data</div>
                  )}
                </div>

                {/* Common Vulnerability Types */}
                <div className="bg-bg border border-border rounded-lg p-5">
                  <h3 className="text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Common Vulnerabilities</h3>
                  {data?.common_vulnerabilities?.length > 0 ? (
                    <div className="space-y-2">
                      {data.common_vulnerabilities.map((v, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-sm text-text-primary font-mono truncate mr-2">{v.rule_id}</span>
                          <span className="flex-shrink-0 text-xs font-mono bg-surface2 border border-border rounded-md px-2 py-0.5 text-text-muted">
                            ×{v.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-text-muted text-sm text-center py-10">No findings</div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
