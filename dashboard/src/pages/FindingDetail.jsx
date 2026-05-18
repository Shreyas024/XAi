import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getScan } from '../api/scans';
import { getFindingExplanation } from '../api/reports';
import { Breadcrumb } from '../components/Breadcrumb';
import { CodeBlock } from '../components/CodeBlock';
import { RiskScoreLarge } from '../components/RiskBadge';
import { SeverityBadge } from '../components/Badges';
import { RiskFactorBars } from '../components/RiskFactorBars';
import { SkeletonTable } from '../components/Skeleton';
import { ErrorState } from '../components/ErrorState';
import { useTypingEffect } from '../hooks/useTypingEffect';
import { getRiskLevel } from '../utils/format';

export default function FindingDetail() {
  const { id: scanId, findingId } = useParams();
  const [finding, setFinding] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch scan to get the finding data
      const scanRes = await getScan(scanId);
      const f = scanRes.data.findings?.find(f => f.id === findingId);
      if (!f) throw new Error('Finding not found in scan');
      setFinding(f);

      // Fetch XAI explanation
      try {
        const explainRes = await getFindingExplanation(scanId, findingId);
        setExplanation(explainRes.data);
      } catch {
        // Explanation endpoint may not exist for all findings — that's ok
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [scanId, findingId]);

  useEffect(() => {
    if (finding) document.title = `${finding.rule_id} — XAI-SecOps`;
  }, [finding]);

  // Typing effect for explanation
  const explanationText = finding?.explanation || explanation?.explanation || '';
  const typedExplanation = useTypingEffect(explanationText, 8, !loading && !!explanationText);

  if (loading) return <SkeletonTable rows={6} cols={2} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!finding) return <ErrorState message="Finding not found" />;

  const rec = finding.recommendation || explanation?.recommendation || {};
  const contributions = explanation?.factor_contributions || null;
  const riskFactors = finding.risk_factors || {};

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/' },
        { label: `Scan #${scanId.slice(0, 8)}`, to: `/scans/${scanId}` },
        { label: finding.rule_id },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: Code + Metadata ── */}
        <div className="space-y-4">
          {/* File header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface border border-border rounded-lg p-4"
          >
            <div className="font-mono text-sm text-text-primary mb-2">
              {finding.file}:<span className="text-accent-amber">{finding.line_start}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={finding.severity} />
              {finding.cwe && (
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-accent-purple/10 text-accent-purple border border-accent-purple/30">
                  {finding.cwe.split(':')[0]}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-surface2 text-text-muted border border-border">
                {finding.rule_id}
              </span>
            </div>
          </motion.div>

          {/* Code Block */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CodeBlock
              code={finding.code_snippet}
              lineStart={finding.line_start}
              highlightLine={finding.line_start}
            />
          </motion.div>

          {/* Scanner Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface border border-border rounded-lg p-4"
          >
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Scanner Message</h3>
            <p className="text-sm text-text-primary">{finding.message}</p>
          </motion.div>
        </div>

        {/* ── Right Column: XAI Breakdown ── */}
        <div className="space-y-4">
          {/* Risk Score */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-surface border border-border rounded-lg p-5"
          >
            <h3 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Risk Score</h3>
            <RiskScoreLarge score={finding.risk_score} />
            <div className="mt-1 text-xs font-semibold" style={{
              color: finding.risk_score >= 8 ? '#DA3633' : finding.risk_score >= 5 ? '#D29922' : '#238636'
            }}>
              {finding.risk_level || getRiskLevel(finding.risk_score)}
            </div>
          </motion.div>

          {/* Risk Factors */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border rounded-lg p-5"
          >
            <h3 className="text-xs font-medium text-accent-purple uppercase tracking-wider mb-4">
              ◈ Risk Factors
            </h3>
            <RiskFactorBars factors={riskFactors} contributions={contributions} />
          </motion.div>

          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-border rounded-lg p-5"
          >
            <h3 className="text-xs font-medium text-accent-purple uppercase tracking-wider mb-3">
              ◈ Why This Matters
            </h3>
            <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
              {typedExplanation}
              {typedExplanation.length < explanationText.length && (
                <span className="animate-pulse text-accent-purple">▋</span>
              )}
            </pre>
          </motion.div>

          {/* Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface border border-accent-green/20 rounded-lg p-5"
          >
            <h3 className="text-xs font-medium text-accent-green uppercase tracking-wider mb-3">
              ✦ How to Fix
            </h3>
            {rec.title && (
              <h4 className="text-sm font-semibold text-text-primary mb-2">{rec.title}</h4>
            )}
            {rec.description && (
              <p className="text-sm text-text-muted mb-3">{rec.description}</p>
            )}
            {rec.fix && (
              <pre className="text-xs font-mono bg-bg border border-border rounded-md p-3 text-text-primary whitespace-pre-wrap mb-3">
                {rec.fix}
              </pre>
            )}
            {rec.ai_suggestion && (
              <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-md p-3 mb-3">
                <div className="text-xs text-accent-purple font-medium mb-1">CodeLlama Analysis</div>
                <p className="text-sm text-text-primary">{rec.ai_suggestion}</p>
              </div>
            )}
            {rec.references?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {rec.references.map((ref, i) => (
                  <a
                    key={i}
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-blue hover:underline"
                  >
                    OWASP Reference →
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
