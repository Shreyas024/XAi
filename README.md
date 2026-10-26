# XAI-SecOps — Explainable AI DevSecOps Security Assistant

An AI-driven DevSecOps security assistant that integrates directly into CI/CD pipelines. It detects security threats using **Semgrep**, explains the reasoning behind detections using a **SHAP-like explainability layer**, scores risk with **CodeLlama**, and introduces an **Auto-Remediation** engine that automatically generates Pull Requests to fix high-risk vulnerabilities.

---

## Architecture

```
Code Commit → GitHub Actions → Semgrep Scanner → CodeLlama AI Engine
                                                      ↓
                                      Dashboard ← API ← risk_factors (XAI)
                                                      ↓
            GitHub PR ← Auto-Remediation Engine ← Fix Recommendations
```

### Pipeline Flow

1. **Semgrep** scans code for vulnerabilities across all languages
2. **CodeLlama** analyzes each finding with full code context and scores risk (0–10)
3. **risk_factors** breaks down the score into explainable components (SHAP-like)
4. **Recommendation Engine** maps findings to specific fix suggestions with OWASP references
5. **Auto-Remediation** automatically pushes code fixes to branches and generates PRs for High/Critical issues
6. **Dashboard** visualizes everything — alerts, scores, explanations, and scan history
7. **GitHub Actions** runs the pipeline on every push/PR

---

## Tech Stack

| Layer | Technology |
|---|---|
| Scanner | Semgrep (multi-language SAST) |
| AI Engine | CodeLlama (via Ollama) |
| XAI Layer | Custom `risk_factors` module |
| Auto-Remediation | Python + GitHub CLI (`gh`) |
| Backend | Python + FastAPI |
| Frontend | React + Vite + TailwindCSS |
| Database | MongoDB (Motor async driver) |
| CI/CD | GitHub Actions |

---

## Project Structure

```
System_Binary/
├── api/                    # FastAPI backend
├── dashboard/              # React frontend
├── scanner/                # Semgrep integration
├── ai_engine/              # CodeLlama integration
├── explainability/         # XAI layer + recommendations
├── database/               # MongoDB connection + schemas
├── tests/                  # Test suite + sample vulnerable app
├── xaisec.py               # Interactive Terminal CLI tool
├── pr_agent.py             # GitHub Actions entry point
├── auto_remediate.py       # Auto-Remediation PR generator
└── .github/workflows/      # CI/CD pipeline
```

---

## Quick Start

### Prerequisites

- Node.js & npm
- Python 3.12+
- MongoDB (local or cloud)
- Semgrep CLI (`pip install semgrep`)
- Ollama + CodeLlama (optional — heuristic fallback available)

### Setup & Installation

```bash
# Clone
git clone https://github.com/yourusername/System_Binary.git
cd System_Binary

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy env config
cp .env.example .env
```

### Running the App (3 Options)

**1. Run the Interactive CLI**
The CLI is the easiest way to test the scanner locally.
```bash
python xaisec.py scan tests/sample_vulnerable_app.py
```

**2. Run the FastAPI Backend**
```bash
python -m uvicorn api.main:app --reload --port 8000
```

**3. Run the React Dashboard**
Open a new terminal tab:
```bash
cd dashboard
npm install
npm run dev
```
*(Access the dashboard at `http://localhost:5173`)*

---

## Auto-Remediation

XAI-SecOps features a built-in Auto-Remediation engine that triggers during GitHub Actions. 
If a vulnerability receives a Risk Score of **6.0 or higher** (High/Critical), the bot will:
1. Generate an AI-recommended fix for the code.
2. Automatically create a new Git branch.
3. Inject the security fix directly into the codebase.
4. Use the GitHub CLI to open a **Pull Request** for developers to review and merge.

*Note: To allow the bot to create PRs, ensure your repository has "Allow GitHub Actions to create and approve pull requests" checked under Settings > Actions > General.*

---

## Risk Factors (XAI)

Each finding gets a breakdown of 5 explainable risk factors:

| Factor | Weight | Description |
|---|---|---|
| **Severity** | 30% | How severe is this vulnerability class? |
| **Exploitability** | 25% | How easy to exploit this specific instance? |
| **Data Sensitivity** | 20% | Does the code handle sensitive data? |
| **Exposure** | 15% | Is it in a public-facing endpoint? |
| **Fix Complexity** | 10% | How hard is it to fix? |

Final risk score = weighted sum × 10, giving a **0–10 scale**.
