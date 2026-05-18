"""Tests for the XAI-SecOps PR Agent."""

import os
import json
import pytest
from unittest.mock import patch, AsyncMock
from pr_agent import run_pr_agent, _format_full_comment, _risk_emoji


@pytest.fixture
def mock_env(tmp_path):
    event_path = tmp_path / "event.json"
    event_path.write_text(json.dumps({"pull_request": {"number": 42}}))

    with patch.dict(os.environ, {
        "GITHUB_EVENT_PATH": str(event_path),
        "GITHUB_TOKEN": "fake_token",
        "GITHUB_REPOSITORY": "Altaria-hackathon-teams/cybersecurity-system-binary",
        # No MONGODB_URI — keeps DB path out of unit tests
    }):
        yield str(event_path)


# ── Unit tests for helpers ──

def test_risk_emoji():
    assert _risk_emoji(9.0) == "🔴"
    assert _risk_emoji(7.0) == "🟠"
    assert _risk_emoji(5.0) == "🟡"
    assert _risk_emoji(2.0) == "🟢"


def test_format_full_comment_clean():
    comment = _format_full_comment([])
    assert "XAI-SecOps" in comment


def test_format_full_comment_with_findings():
    findings = [
        {
            "rule_id": "python.lang.security.audit.dangerous-subprocess-use",
            "message": "subprocess call with shell=True",
            "risk_score": 7.5,
            "risk_factors": {
                "severity_weight": 0.8,
                "exploitability": 0.7,
                "data_sensitivity": 0.5,
                "exposure": 0.6,
                "fix_complexity": 0.3,
            },
            "file": "app.py",
            "line_start": 10,
            "code_snippet": "subprocess.run(cmd, shell=True)",
            "cwe": "CWE-78",
        },
    ]
    comment = _format_full_comment(findings)
    assert "Total Findings" in comment
    assert "app.py" in comment
    assert "7.5" in comment
    assert "Risk Factor Breakdown" in comment
    assert "Recommendation" in comment


# ── Integration tests ──

@pytest.mark.asyncio
@patch("pr_agent.post_comment")
@patch("pr_agent.RiskScorer")
@patch("pr_agent.SemgrepRunner")
async def test_pr_agent_no_findings(mock_runner_cls, mock_scorer_cls, mock_post, mock_env):
    mock_runner_cls.return_value.scan.return_value = []

    await run_pr_agent()

    mock_post.assert_called_once()
    args, _ = mock_post.call_args
    assert "No security vulnerabilities found" in args[3]


@pytest.mark.asyncio
@patch("pr_agent.post_comment")
@patch("pr_agent.RiskScorer")
@patch("pr_agent.SemgrepRunner")
async def test_pr_agent_with_findings(mock_runner_cls, mock_scorer_cls, mock_post, mock_env):
    mock_runner_cls.return_value.scan.return_value = [{"some": "finding"}]

    mock_scorer_cls.return_value.score_findings = AsyncMock(return_value=[
        {
            "rule_id": "test-rule",
            "message": "Bad SQL",
            "risk_score": 6.5,
            "risk_factors": {
                "severity_weight": 0.7,
                "exploitability": 0.6,
                "data_sensitivity": 0.5,
                "exposure": 0.5,
                "fix_complexity": 0.4,
            },
            "severity": "WARNING",
            "file": "app.py",
            "line_start": 10,
            "line_end": 10,
            "code_snippet": "SELECT * FROM users",
            "cwe": "CWE-89",
        },
    ])

    await run_pr_agent()

    mock_post.assert_called_once()
    args, _ = mock_post.call_args
    body = args[3]
    assert "XAI-SecOps Security Scan Report" in body
    assert "app.py:10" in body
    assert "Risk Factor Breakdown" in body
    assert "Recommendation" in body
    assert "Total Findings" in body
