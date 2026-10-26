import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createScan } from '../api/scans';

export function NewScanDrawer({ isOpen, onClose }) {
  const [target, setTarget] = useState('tests/sample_vulnerable_app.py');
  const [fastMode, setFastMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleScan = async () => {
    const cleanTarget = target.trim().replace(/^["']|["']$/g, '');
    if (!cleanTarget) return;
    setScanning(true);
    setError(null);
    setElapsed(0);

    const timer = setInterval(() => setElapsed(e => e + 1), 1000);

    try {
      const { data } = await createScan(cleanTarget, 'auto', true, fastMode);
      clearInterval(timer);
      setScanning(false);
      onClose();
      setTarget('');
      navigate(`/scans/${data.scan_id}`);
    } catch (err) {
      clearInterval(timer);
      setScanning(false);
      setError(err.response?.data?.detail || err.message || 'Scan failed');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            onClick={!scanning ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg bg-surface/80 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-surface to-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center border border-accent-blue/30">
                  <span className="text-accent-blue text-lg">⚡</span>
                </div>
                <h2 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-white to-text-muted">New Scan</h2>
              </div>
              <button
                onClick={onClose}
                disabled={scanning}
                className="text-text-muted hover:text-white transition-colors disabled:opacity-50 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Target Path</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                    📁
                  </div>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="tests/sample_vulnerable_app.py"
                    disabled={scanning}
                    className="w-full bg-bg/50 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-text-primary placeholder:text-text-muted/40 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 transition-all disabled:opacity-50 group-hover:border-border/80"
                    onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  />
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Path relative to the API folder, or an absolute path. Try <span className="font-mono text-text-primary">tests/sample_vulnerable_app.py</span>.
                </p>
              </div>

              {/* Fast Mode Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface/60 border border-border/80">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                    <span>⚡</span> Fast Analysis Mode
                  </span>
                  <span className="text-xs text-text-muted">
                    Instant deterministic scoring (~1s). Uncheck for deep CodeLlama LLM.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-3">
                  <input
                    type="checkbox"
                    checked={fastMode}
                    onChange={(e) => setFastMode(e.target.checked)}
                    disabled={scanning}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-surface border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-blue"></div>
                </label>
              </div>

              {scanning ? (
                <div className="bg-bg/60 border border-accent-blue/20 rounded-xl p-5 font-mono text-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 bg-accent-blue/40 w-full">
                    <motion.div 
                      className="h-full bg-accent-blue"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-accent-blue mb-3">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-accent-blue pulse-blue shadow-[0_0_8px_rgba(31,111,235,0.8)]" />
                    <span className="font-semibold tracking-wide">SCAN IN PROGRESS</span>
                  </div>
                  <div className="text-text-muted mb-1 flex justify-between">
                    <span>Status:</span>
                    <span className="text-text-primary">Analyzing...</span>
                  </div>
                  <div className="text-text-muted mb-2 flex justify-between">
                    <span>Elapsed Time:</span>
                    <span className="text-text-primary">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
                  </div>
                  <div className="mt-3 text-text-muted/60 text-xs border-t border-white/5 pt-3">
                    <span className="text-accent-purple">➔</span> Running Semgrep rules<br/>
                    <span className="text-accent-purple">➔</span> CodeLlama analysis<br/>
                    <span className="text-accent-purple animate-pulse">➔</span> Generating Risk Score...
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleScan}
                  disabled={!target.trim()}
                  className="w-full bg-gradient-to-r from-accent-blue to-blue-600 hover:from-blue-500 hover:to-blue-400 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-accent-blue/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Start Security Scan
                </button>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 text-sm text-accent-red flex gap-3 items-start"
                >
                  <span className="text-lg leading-none">⚠️</span>
                  <div>
                    <div className="font-semibold mb-0.5">Scan Failed</div>
                    <div className="text-accent-red/80">{error}</div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
