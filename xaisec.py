#!/usr/bin/env python3
import os
import sys
import uuid
import argparse
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Try to import rich for terminal styling
try:
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.markdown import Markdown
    from rich import box
except ImportError:
    print("Error: 'rich' library is required for the CLI. Run: pip install rich")
    sys.exit(1)

from scanner.semgrep_runner import SemgrepRunner, default_custom_rules_path
from ai_engine.risk_scorer import RiskScorer
from explainability.explanation_generator import generate_explanation
from explainability.risk_factors import compute_risk_breakdown, get_risk_level
from explainability.recommendation_engine import get_recommendation
from database import MongoDB
from config import settings

# Reconfigure stdout/stderr for UTF-8 on Windows to prevent UnicodeEncodeError with emojis
if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

console = Console(legacy_windows=False)

def severity_from_score(score: float) -> str:
    if score >= 9: return "critical"
    if score >= 7: return "high"
    if score >= 4: return "medium"
    return "low"

def risk_emoji(score: float) -> str:
    if score >= 8.0: return "🔴"
    if score >= 6.0: return "🟠"
    if score >= 4.0: return "🟡"
    return "🟢"

def _display_path(file_path: str, target: Path) -> str:
    try:
        return str(Path(file_path).resolve().relative_to(target if target.is_dir() else target.parent))
    except Exception:
        return file_path


async def scan_command(target_path: str, offline: bool = False, use_auto: bool = False, heuristic: bool = False):
    clean_path = target_path.strip().strip('"').strip("'")
    target = Path(clean_path).resolve()
    if not target.exists():
        project_root = Path(__file__).resolve().parent
        if (project_root / clean_path).exists():
            target = (project_root / clean_path).resolve()
        else:
            console.print(f"[bold red]Error:[/] The path '{clean_path}' does not exist.")
            sys.exit(1)
    
    scan_id = str(uuid.uuid4())
    console.print(f"\n[bold blue]🚀 XAI-SecOps CLI Scanner[/]")
    console.print(f"Target: [bold]{target}[/]\n")

    db = None
    if not offline:
        try:
            await MongoDB.connect()
            db = MongoDB.get_db()
            await db.scans.insert_one({
                "scan_id": scan_id,
                "target": str(target),
                "status": "running",
                "total_findings": 0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "avg_risk_score": 0.0,
                "created_at": datetime.now(timezone.utc),
                "completed_at": None,
                "error": None,
            })
            console.print("[green]✔ Database connected & scan registered[/]")
        except Exception as e:
            console.print(f"[yellow]⚠ Failed to connect to DB: {e}. Running in offline mode.[/]")
            db = None

    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as progress:
        # 1. Semgrep Scan
        task1 = progress.add_task("[cyan]Running Semgrep...", total=None)
        rules_path = default_custom_rules_path()
        if use_auto:
            scanner = SemgrepRunner(custom_rules_path=rules_path)
            findings = scanner.scan(str(target), config="auto")
        else:
            scanner = SemgrepRunner()
            findings = scanner.scan(str(target), config=rules_path)
        progress.update(task1, completed=True)

        if not findings:
            console.print(Panel("[bold green]✅ No vulnerabilities found![/] Your code is clean.", border_style="green"))
            if db is not None:
                await db.scans.update_one(
                    {"scan_id": scan_id},
                    {"$set": {"status": "completed", "completed_at": datetime.now(timezone.utc)}}
                )
                await MongoDB.close()
            return

        # 2. Risk Scoring & AI Analysis
        desc = "[cyan]Scoring findings with instant heuristics..." if heuristic else f"[magenta]Scoring {len(findings)} findings with CodeLlama AI..."
        progress.add_task(desc, total=None)
        scorer = RiskScorer(force_heuristic=heuristic)
        scored_findings = await scorer.score_findings(findings)

    # Output Results
    console.print(f"\n[bold]Found {len(scored_findings)} issues.[/]\n")

    table = Table(box=box.SIMPLE, show_header=True, header_style="bold magenta")
    table.add_column("Score")
    table.add_column("Level")
    table.add_column("Rule ID")
    table.add_column("File:Line")
    
    for sf in scored_findings:
        score = sf.get("risk_score", 0.0)
        level = get_risk_level(score)
        emoji = risk_emoji(score)
        color = "red" if score >= 8 else "yellow" if score >= 6 else "yellow" if score >= 4 else "green"
        file_path = _display_path(sf["file"], target)
        
        table.add_row(
            f"[{color}]{score:.1f}[/]",
            f"{emoji} {level.upper()}",
            sf["rule_id"],
            f"{file_path}:{sf.get('line_start', '?')}"
        )
        
    console.print(table)
    
    # Generate explanations & save
    finding_docs = []
    with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}"), transient=True) as progress:
        progress.add_task("[cyan]Generating XAI Explanations & saving results...", total=None)
        for sf in scored_findings:
            explanation = generate_explanation(
                sf["rule_id"], sf["message"], sf["risk_score"], sf["risk_factors"],
                ai_analysis=sf.get("ai_analysis")
            )
            sf["explanation"] = explanation
            
            risk_score = sf.get("risk_score", 0)
            rec = get_recommendation(sf["rule_id"], sf.get("cwe"), sf["code_snippet"], sf.get("recommendation"))
            
            finding_docs.append({
                "scan_id": scan_id,
                "rule_id": sf["rule_id"],
                "severity": sf.get("severity") or severity_from_score(risk_score),
                "file": sf["file"],
                "line_start": sf.get("line_start", 1),
                "line_end": sf.get("line_end", sf.get("line_start", 1)),
                "code_snippet": sf["code_snippet"],
                "message": sf["message"],
                "risk_score": risk_score,
                "risk_level": get_risk_level(risk_score),
                "risk_factors": sf.get("risk_factors", {}),
                "explanation": explanation,
                "recommendation": rec,
                "cwe": sf.get("cwe"),
                "owasp": sf.get("owasp"),
                "ai_analysis": sf.get("ai_analysis"),
                "created_at": datetime.now(timezone.utc),
            })
            
        if db is not None and finding_docs:
            await db.findings.insert_many(finding_docs)
            scores = [f["risk_score"] for f in scored_findings]
            avg = sum(scores) / len(scores) if scores else 0.0
            await db.scans.update_one({"scan_id": scan_id}, {"$set": {
                "status": "completed",
                "total_findings": len(finding_docs),
                "critical_count": sum(1 for s in scores if s >= 8.0),
                "high_count": sum(1 for s in scores if 6.0 <= s < 8.0),
                "medium_count": sum(1 for s in scores if 4.0 <= s < 6.0),
                "low_count": sum(1 for s in scores if s < 4.0),
                "avg_risk_score": round(avg, 1),
                "completed_at": datetime.now(timezone.utc),
            }})
            await MongoDB.close()

    if db is not None and not offline:
        console.print(f"\n[bold green]✅ Scan results saved to Cloud MongoDB![/]")
        console.print(f"View report at: [bold blue]http://localhost:5173/scans/{scan_id}[/]\n")

    console.print("\n[bold]Detailed Findings Report:[/]\n")
    for finding in finding_docs:
        score = finding["risk_score"]
        emoji = risk_emoji(score)
        color = "red" if score >= 8 else "yellow" if score >= 6 else "yellow" if score >= 4 else "green"
        file_path = finding["file"]
        
        # Header for the finding
        console.print(f"[{color}][bold]{emoji} {finding['rule_id']}[/][/] (Score: {score:.1f})")
        console.print(f"[dim]Location: {file_path}:{finding['line_start']}[/]")
        
        # Code Snippet
        console.print("\n[bold]Vulnerable Code:[/]")
        console.print(Panel(finding['code_snippet'], border_style="dim", title="Snippet", title_align="left"))
        
        # Explanation
        console.print("\n[bold]XAI Explanation:[/]")
        console.print(Markdown(finding['explanation']))
        
        # Recommendation
        rec = finding.get('recommendation', {})
        if isinstance(rec, str):
            rec = {"title": "Security Issue", "description": rec, "fix": rec}
        elif not isinstance(rec, dict):
            rec = {"title": "Security Issue", "description": "Review code", "fix": "Review code"}
        title = rec.get("title", "Security Issue Detected")
        desc = rec.get("description", "")
        fix_code = rec.get("fix", "Review the flagged code and apply appropriate security controls.")
        console.print(f"\n[bold green]🔧 Recommended Fix: {title}[/]")
        if desc:
            console.print(Markdown(desc))
        console.print(Panel(fix_code, border_style="green", title="Fix Code", title_align="left"))
        console.print("─" * 80 + "\n")

    # If critical findings, exit 1
    has_critical = any(f["risk_score"] >= 8.0 for f in scored_findings)
    if has_critical:
        console.print("[bold red]❌ Critical vulnerabilities found.[/]")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="XAI-SecOps CLI Scanner")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    scan_parser = subparsers.add_parser("scan", help="Scan a directory or file")
    scan_parser.add_argument("target", help="Path to the code to scan")
    scan_parser.add_argument("--offline", action="store_true", help="Run without connecting to MongoDB")
    scan_parser.add_argument(
        "--auto",
        action="store_true",
        help="Also run Semgrep auto rules (slower, needs network)",
    )
    scan_parser.add_argument(
        "--heuristic",
        action="store_true",
        help="Run fast heuristic risk scoring without local LLM latency",
    )
    
    # Auto-insert 'scan' command if target path is provided directly
    if len(sys.argv) > 1 and sys.argv[1] not in ("scan", "-h", "--help"):
        sys.argv.insert(1, "scan")

    args = parser.parse_args()
    
    if args.command == "scan":
        asyncio.run(scan_command(args.target, args.offline, args.auto, getattr(args, "heuristic", False)))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
