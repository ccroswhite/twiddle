"""
Tests for Twiddle SDK CLI commands.
"""

import pytest
import tempfile
import os
from pathlib import Path
from click.testing import CliRunner


class TestVersionCommand:
    """Tests for the version command."""

    def test_version_command(self):
        """Test twiddle version command."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        result = runner.invoke(cli, ["version"])
        assert result.exit_code == 0
        assert "Twiddle SDK:" in result.output
        assert "Twiddle DSL:" in result.output
        assert "0.1.0" in result.output
        assert "1.0.0" in result.output

    def test_version_option(self):
        """Test --version flag."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        result = runner.invoke(cli, ["--version"])
        assert result.exit_code == 0
        assert "0.1.0" in result.output


class TestInitCommand:
    """Tests for the init command."""

    def test_init_creates_project(self):
        """Test init command creates project structure."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            result = runner.invoke(cli, ["init", "testproj", "-o", tmpdir])
            assert result.exit_code == 0
            assert "Project created successfully" in result.output

            # Check structure was created
            project_dir = Path(tmpdir) / "testproj"
            assert project_dir.exists()
            assert (project_dir / "src" / "activities").exists()
            assert (project_dir / "src" / "workflows").exists()
            assert (project_dir / "pyproject.toml").exists()
            assert (project_dir / "README.md").exists()

    def test_init_creates_example_files(self):
        """Test init creates example activity and workflow."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            result = runner.invoke(cli, ["init", "testproj", "-o", tmpdir])
            assert result.exit_code == 0

            # Check example files
            project_dir = Path(tmpdir) / "testproj"
            assert (project_dir / "src" / "activities" / "greet.py").exists()
            assert (project_dir / "src" / "workflows" / "hello_world.py").exists()

            # Verify content contains decorators
            greet_content = (project_dir / "src" / "activities" / "greet.py").read_text()
            assert "@activity" in greet_content
            assert "twiddle_dsl" in greet_content

    def test_init_fails_if_exists(self):
        """Test init fails if directory already exists."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create the project first
            runner.invoke(cli, ["init", "testproj", "-o", tmpdir])
            # Try to create again
            result = runner.invoke(cli, ["init", "testproj", "-o", tmpdir])
            assert result.exit_code == 1
            assert "already exists" in result.output


class TestLintCommand:
    """Tests for the lint command."""

    def test_lint_valid_code(self):
        """Test linting valid Twiddle code."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a valid file
            test_file = Path(tmpdir) / "valid.py"
            test_file.write_text('''
from twiddle_dsl import activity, workflow

@activity(name="Test Activity")
async def test_activity(input_data=None) -> dict:
    return {}

@workflow(name="Test Workflow")
class TestWorkflow:
    async def run(self, input_data=None):
        return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file)])
            assert result.exit_code == 0
            assert "All checks passed" in result.output

    def test_lint_invalid_code(self):
        """Test linting code with errors."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create file with errors (non-async activity)
            test_file = Path(tmpdir) / "invalid.py"
            test_file.write_text('''
from twiddle_dsl import activity

@activity(name="Sync Activity")
def sync_activity():  # Not async, no input_data
    return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file)])
            assert result.exit_code == 1  # Should fail due to errors
            assert "TWD002" in result.output  # Not async

    def test_lint_json_output(self):
        """Test lint command with JSON output format."""
        from twiddle_sdk.cli.main import cli
        import json

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "test.py"
            test_file.write_text('''
from twiddle_dsl import activity

@activity(name="Test")
async def test_activity(input_data=None) -> dict:
    return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file), "-f", "json"])
            assert result.exit_code == 0

            # Should be valid JSON
            output = json.loads(result.output)
            assert "results" in output
            assert "summary" in output

    def test_lint_directory(self):
        """Test linting a directory."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create multiple files
            (Path(tmpdir) / "activity1.py").write_text('''
from twiddle_dsl import activity

@activity(name="Activity 1")
async def activity_one(input_data=None) -> dict:
    return {}
''')
            (Path(tmpdir) / "activity2.py").write_text('''
from twiddle_dsl import activity

@activity(name="Activity 2")
async def activity_two(input_data=None) -> dict:
    return {}
''')

            result = runner.invoke(cli, ["lint", tmpdir])
            assert result.exit_code == 0
            assert "2 activity(ies)" in result.output


class TestConvertCommand:
    """Tests for the convert command."""

    def test_convert_basic(self):
        """Test converting basic Twiddle code."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = Path(tmpdir) / "src"
            src_dir.mkdir()
            out_dir = Path(tmpdir) / "output"

            # Create source files
            (src_dir / "activities.py").write_text('''
from twiddle_dsl import activity

@activity(name="My Activity")
async def my_activity(input_data=None) -> dict:
    return {}
''')
            (src_dir / "workflow.py").write_text('''
from twiddle_dsl import workflow

@workflow(name="My Workflow")
class MyWorkflow:
    async def run(self, input_data=None):
        return {}
''')

            result = runner.invoke(cli, ["convert", str(src_dir), "-o", str(out_dir)])
            assert result.exit_code == 0
            assert "Conversion complete" in result.output

            # Check generated files
            assert (out_dir / "workflow.py").exists()
            assert (out_dir / "activities.py").exists()
            assert (out_dir / "worker.py").exists()
            assert (out_dir / "starter.py").exists()
            assert (out_dir / "requirements.txt").exists()
            assert (out_dir / "Dockerfile").exists()

    def test_convert_uses_twiddle_dsl(self):
        """Test that converted code imports from twiddle_dsl."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = Path(tmpdir) / "src"
            src_dir.mkdir()
            out_dir = Path(tmpdir) / "output"

            (src_dir / "activity.py").write_text('''
from twiddle_dsl import activity

@activity(name="Test")
async def test_activity(input_data=None) -> dict:
    return {}
''')
            (src_dir / "workflow.py").write_text('''
from twiddle_dsl import workflow

@workflow(name="Test Workflow")
class TestWorkflow:
    async def run(self, input_data=None):
        return {}
''')

            runner.invoke(cli, ["convert", str(src_dir), "-o", str(out_dir)])

            # Check activities.py imports from twiddle_dsl
            activities_content = (out_dir / "activities.py").read_text()
            assert "from twiddle_dsl import" in activities_content

            # Check requirements.txt includes twiddle-dsl
            requirements = (out_dir / "requirements.txt").read_text()
            assert "twiddle-dsl" in requirements

    def test_convert_no_workflows_fails(self):
        """Test convert fails without workflows."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = Path(tmpdir) / "src"
            src_dir.mkdir()
            out_dir = Path(tmpdir) / "output"

            # Only activities, no workflow
            (src_dir / "activity.py").write_text('''
from twiddle_dsl import activity

@activity(name="Test")
async def test_activity(input_data=None):
    return {}
''')

            result = runner.invoke(cli, ["convert", str(src_dir), "-o", str(out_dir)])
            assert result.exit_code == 1
            assert "No workflows found" in result.output
