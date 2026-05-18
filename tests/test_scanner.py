"""
Tests for the Semgrep scanner module.
"""

import pytest
from pathlib import Path
from scanner.semgrep_runner import SemgrepRunner, SemgrepFinding


class TestSemgrepRunner:
    """Test the Semgrep scanner wrapper."""

    def test_scan_nonexistent_path(self):
        """Should raise FileNotFoundError for missing target."""
        runner = SemgrepRunner()
        with pytest.raises(FileNotFoundError):
            runner.scan("/nonexistent/path")

    def test_get_file_context(self):
        """Should extract code context around a line."""
        # Use this test file itself
        test_file = str(Path(__file__).resolve())
        context = SemgrepRunner.get_file_context(test_file, 5, context_lines=2)

        assert context != ""
        assert ">>>" in context  # The target line marker

    def test_get_file_context_missing_file(self):
        """Should return empty string for missing file."""
        context = SemgrepRunner.get_file_context("/nonexistent.py", 1)
        assert context == ""

    def test_finding_to_dict(self):
        """SemgrepFinding.to_dict() should return a proper dict."""
        finding = SemgrepFinding(
            rule_id="test-rule",
            severity="ERROR",
            file="test.py",
            line_start=10,
            line_end=10,
            code_snippet="x = eval(input())",
            message="Dangerous eval usage",
            cwe="CWE-95",
        )
        d = finding.to_dict()

        assert d["rule_id"] == "test-rule"
        assert d["severity"] == "ERROR"
        assert d["cwe"] == "CWE-95"
        assert isinstance(d, dict)

    @pytest.mark.skipif(
        not Path("/usr/local/bin/semgrep").exists() and not Path("/opt/homebrew/bin/semgrep").exists(),
        reason="Semgrep not installed"
    )
    def test_scan_sample_vulnerable_app(self):
        """Integration test: scan the sample vulnerable app."""
        sample = Path(__file__).parent / "sample_vulnerable_app.py"
        if not sample.exists():
            pytest.skip("Sample app not found")

        runner = SemgrepRunner()
        findings = runner.scan(str(sample), config="auto")

        # The sample app has intentional vulnerabilities
        assert len(findings) > 0
        assert all(isinstance(f, SemgrepFinding) for f in findings)
