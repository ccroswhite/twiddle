"""
Tests for Twiddle SDK introspection module.
"""

import pytest
import tempfile
from pathlib import Path


class TestDiscovery:
    """Tests for module discovery functionality."""

    def test_load_module_from_path(self):
        """Test loading a Python module from a file path."""
        from twiddle_sdk.introspection.discovery import load_module_from_path

        # Create a temporary Python file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("""
from twiddle_dsl import activity

@activity(name="Test Activity")
async def test_activity(input_data=None):
    return {}
""")
            f.flush()
            temp_path = Path(f.name)

        try:
            module = load_module_from_path(temp_path)
            assert hasattr(module, "test_activity")
        finally:
            temp_path.unlink()

    def test_load_module_file_not_found(self):
        """Test loading a non-existent module raises error."""
        from twiddle_sdk.introspection.discovery import load_module_from_path

        with pytest.raises(FileNotFoundError):
            load_module_from_path(Path("/nonexistent/path.py"))

    def test_load_module_not_python_file(self):
        """Test loading a non-Python file raises error."""
        from twiddle_sdk.introspection.discovery import load_module_from_path

        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("not python")
            temp_path = Path(f.name)

        try:
            with pytest.raises(ValueError, match="Not a Python file"):
                load_module_from_path(temp_path)
        finally:
            temp_path.unlink()

    def test_discover_activities(self):
        """Test discovering activities in a module."""
        from twiddle_sdk.introspection.discovery import (
            load_module_from_path,
            discover_activities,
        )

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("""
from twiddle_dsl import activity

@activity(name="Activity One")
async def activity_one(input_data=None):
    return {}

@activity(name="Activity Two")
async def activity_two(input_data=None):
    return {}

def not_an_activity():
    pass
""")
            f.flush()
            temp_path = Path(f.name)

        try:
            module = load_module_from_path(temp_path)
            activities = discover_activities(module)
            assert len(activities) == 2
            names = [a._twiddle_activity["name"] for a in activities]
            assert "Activity One" in names
            assert "Activity Two" in names
        finally:
            temp_path.unlink()

    def test_discover_workflows(self):
        """Test discovering workflows in a module."""
        from twiddle_sdk.introspection.discovery import (
            load_module_from_path,
            discover_workflows,
        )

        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write("""
from twiddle_dsl import workflow

@workflow(name="Test Workflow")
class TestWorkflow:
    async def run(self, input_data=None):
        return {}

class NotAWorkflow:
    pass
""")
            f.flush()
            temp_path = Path(f.name)

        try:
            module = load_module_from_path(temp_path)
            workflows = discover_workflows(module)
            assert len(workflows) == 1
            assert workflows[0]._twiddle_workflow["name"] == "Test Workflow"
        finally:
            temp_path.unlink()


class TestValidator:
    """Tests for validation functionality."""

    def test_validate_activity_valid(self):
        """Test validating a correctly defined activity."""
        from twiddle_dsl import activity
        from twiddle_sdk.introspection.validator import validate_activity

        @activity(name="Valid Activity")
        async def valid_activity(input_data=None) -> dict:
            return {}

        errors = validate_activity(valid_activity)
        # Should have no errors (might have warnings/info)
        error_errors = [e for e in errors if e.severity == "error"]
        assert len(error_errors) == 0

    def test_validate_activity_missing_async(self):
        """Test validation catches non-async activity."""
        from twiddle_dsl import activity
        from twiddle_sdk.introspection.validator import validate_activity

        @activity(name="Sync Activity")
        def sync_activity(input_data=None):
            return {}

        errors = validate_activity(sync_activity)
        assert any(e.rule_id == "TWD002" for e in errors)

    def test_validate_activity_missing_input_data(self):
        """Test validation warns about missing input_data parameter."""
        from twiddle_dsl import activity
        from twiddle_sdk.introspection.validator import validate_activity

        @activity(name="No Input")
        async def no_input_activity():
            return {}

        errors = validate_activity(no_input_activity)
        assert any(e.rule_id == "TWD003" for e in errors)

    def test_validate_activity_missing_decorator(self):
        """Test validation catches missing decorator."""
        from twiddle_sdk.introspection.validator import validate_activity

        async def not_decorated(input_data=None):
            return {}

        errors = validate_activity(not_decorated)
        assert any(e.rule_id == "TWD001" for e in errors)

    def test_validate_workflow_valid(self):
        """Test validating a correctly defined workflow."""
        from twiddle_dsl import workflow
        from twiddle_sdk.introspection.validator import validate_workflow

        @workflow(name="Valid Workflow")
        class ValidWorkflow:
            async def run(self, input_data=None):
                return {}

        errors = validate_workflow(ValidWorkflow)
        assert len(errors) == 0

    def test_validate_workflow_missing_run(self):
        """Test validation catches workflow without run method."""
        from twiddle_dsl import workflow
        from twiddle_sdk.introspection.validator import validate_workflow

        @workflow(name="No Run")
        class NoRunWorkflow:
            pass

        errors = validate_workflow(NoRunWorkflow)
        assert any(e.rule_id == "TWD006" for e in errors)

    def test_validate_workflow_missing_decorator(self):
        """Test validation catches missing workflow decorator."""
        from twiddle_sdk.introspection.validator import validate_workflow

        class NotDecorated:
            async def run(self, input_data=None):
                return {}

        errors = validate_workflow(NotDecorated)
        assert any(e.rule_id == "TWD005" for e in errors)


class TestReporter:
    """Tests for lint output formatting."""

    def test_format_lint_results_empty(self):
        """Test formatting with no errors."""
        from twiddle_sdk.introspection.reporter import format_lint_results

        result = format_lint_results([])
        assert "No issues found" in result

    def test_format_lint_results_with_errors(self):
        """Test formatting with errors."""
        from twiddle_sdk.introspection.reporter import format_lint_results
        from twiddle_sdk.introspection.validator import LintError

        errors = [
            LintError("TWD001", "error", "Missing decorator", "my_func"),
            LintError("TWD003", "warning", "Missing input_data", "my_func"),
        ]
        result = format_lint_results(errors, file_path="test.py")
        assert "TWD001" in result
        assert "TWD003" in result
        assert "test.py" in result


class TestVersion:
    """Tests for SDK version information."""

    def test_sdk_version(self):
        """Test SDK version is accessible."""
        from twiddle_sdk import __version__

        assert __version__ == "0.1.0"

    def test_all_exports(self):
        """Test expected items are exported from twiddle_sdk."""
        import twiddle_sdk

        expected_exports = [
            "discover_activities",
            "discover_workflows",
            "load_module_from_path",
            "validate_activity",
            "validate_workflow",
            "LintError",
            "__version__",
        ]
        for export in expected_exports:
            assert hasattr(twiddle_sdk, export), f"Missing export: {export}"
