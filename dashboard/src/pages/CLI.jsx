import { motion } from 'framer-motion';

export default function CLI() {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-text-primary mb-2">XAI-SecOps CLI Tool</h1>
        <p className="text-text-muted">
          Analyze codebases across your entire local system directly from the terminal, bypassing Docker volume limitations.
        </p>
      </motion.div>

      <div className="space-y-8">
        {/* Section: Installation */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface border border-border rounded-xl overflow-hidden"
        >
          <div className="border-b border-border p-5 bg-surface2/30">
            <h2 className="text-lg font-semibold text-text-primary">1. Installation & Setup</h2>
          </div>
          <div className="p-6">
            <p className="text-text-muted mb-4">
              The CLI tool is written in Python and uses <code className="text-accent-blue bg-accent-blue/10 px-1 py-0.5 rounded">rich</code> for beautiful terminal formatting. Make sure you have your virtual environment active and the required libraries installed.
            </p>
            <div className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary mb-4">
              <span className="text-text-muted"># 1. Activate your virtual environment</span><br/>
              source venv/bin/activate<br/><br/>
              
              <span className="text-text-muted"># 2. Install the required dependencies</span><br/>
              pip install rich semgrep<br/><br/>
              
              <span className="text-text-muted"># 3. Make the CLI script executable</span><br/>
              chmod +x xaisec.py
            </div>
            <p className="text-sm text-accent-amber bg-accent-amber/10 border border-accent-amber/20 rounded-lg p-3">
              <strong>Tip:</strong> For global access, you can symlink this script into your binary path: <br/>
              <code className="mt-1 block font-mono text-xs">ln -s $(pwd)/xaisec.py /usr/local/bin/xaisec</code>
            </p>
          </div>
        </motion.section>

        {/* Section: Usage */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-surface border border-border rounded-xl overflow-hidden"
        >
          <div className="border-b border-border p-5 bg-surface2/30">
            <h2 className="text-lg font-semibold text-text-primary">2. How to Use</h2>
          </div>
          <div className="p-6">
            <p className="text-text-muted mb-4">
              Once set up, you can run the scanner against any directory on your computer. The CLI will automatically analyze the code, score vulnerabilities using AI, and securely push the report to your MongoDB Atlas dashboard.
            </p>
            
            <h3 className="text-md font-medium text-text-primary mb-2 mt-6">Basic Scan</h3>
            <div className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary mb-2">
              ./xaisec.py scan /path/to/any/project
            </div>
            <p className="text-sm text-text-muted mb-6">This will scan the specified absolute or relative path and upload the findings to this dashboard.</p>

            <h3 className="text-md font-medium text-text-primary mb-2">Current Directory</h3>
            <div className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary mb-2">
              ./xaisec.py scan .
            </div>
            <p className="text-sm text-text-muted mb-6">Scans the folder you are currently in.</p>

            <h3 className="text-md font-medium text-text-primary mb-2">Offline Mode</h3>
            <div className="bg-bg border border-border rounded-lg p-4 font-mono text-sm text-text-primary mb-2">
              ./xaisec.py scan ./src --offline
            </div>
            <p className="text-sm text-text-muted mb-2">Runs the scan entirely locally without uploading the results to MongoDB. Useful for air-gapped environments or quick local checks.</p>
          </div>
        </motion.section>

        {/* Section: What to expect */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-surface border border-border rounded-xl overflow-hidden"
        >
          <div className="border-b border-border p-5 bg-surface2/30">
            <h2 className="text-lg font-semibold text-text-primary">3. What to Expect</h2>
          </div>
          <div className="p-6">
            <ul className="space-y-4 text-text-muted">
              <li className="flex items-start gap-3">
                <span className="text-accent-blue text-xl leading-none">⚙️</span>
                <div>
                  <strong className="text-text-primary block mb-1">Animated Progress</strong>
                  The CLI uses <code className="bg-surface2 px-1 rounded">rich</code> spinners to show you exactly which stage of the pipeline is running (Semgrep extraction, CodeLlama AI analysis, or XAI factor generation).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-blue text-xl leading-none">📊</span>
                <div>
                  <strong className="text-text-primary block mb-1">Tabular Results</strong>
                  Vulnerabilities are printed in a clean, color-coded terminal table sorted by AI Risk Score, showing exactly where the vulnerability is located in your codebase.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-accent-blue text-xl leading-none">🔗</span>
                <div>
                  <strong className="text-text-primary block mb-1">Dashboard Integration</strong>
                  At the end of the scan, the CLI provides a direct clickable link to the Web Dashboard so you can view the full Explanability breakdown and remediation advice!
                </div>
              </li>
            </ul>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
