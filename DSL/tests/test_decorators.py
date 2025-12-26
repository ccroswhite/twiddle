"""
Tests for Twiddle DSL decorators and types.
"""

import pytest
from typing import Dict, Any


class TestActivityDecorator:
    """Tests for the @activity decorator."""

    def test_activity_decorator_basic(self):
        """Test basic activity decorator functionality."""
        from twiddle_dsl import activity

        @activity(name="Test Activity")
        async def my_activity(input_data=None) -> Dict[str, Any]:
            return {"result": "success"}

        # Check metadata is attached
        assert hasattr(my_activity, "_twiddle_activity")
        assert my_activity._twiddle_activity["name"] == "Test Activity"
        assert my_activity._twiddle_activity["function_name"] == "my_activity"

    def test_activity_decorator_full_options(self):
        """Test activity decorator with all options."""
        from twiddle_dsl import activity

        @activity(
            name="Full Test",
            description="A test activity",
            category="Testing",
            icon="test-icon",
            tags=["tag1", "tag2"],
        )
        async def full_activity(input_data=None) -> Dict[str, Any]:
            return {}

        meta = full_activity._twiddle_activity
        assert meta["name"] == "Full Test"
        assert meta["description"] == "A test activity"
        assert meta["category"] == "Testing"
        assert meta["icon"] == "test-icon"
        assert meta["tags"] == ["tag1", "tag2"]

    def test_activity_decorator_defaults(self):
        """Test activity decorator default values."""
        from twiddle_dsl import activity

        @activity(name="Default Test")
        async def default_activity(input_data=None) -> Dict[str, Any]:
            return {}

        meta = default_activity._twiddle_activity
        assert meta["description"] == ""
        assert meta["category"] == "Custom"
        assert meta["icon"] == "code"
        assert meta["tags"] == []


class TestWorkflowDecorator:
    """Tests for the @workflow decorator."""

    def test_workflow_decorator_basic(self):
        """Test basic workflow decorator functionality."""
        from twiddle_dsl import workflow

        @workflow(name="Test Workflow")
        class MyWorkflow:
            async def run(self, input_data=None):
                return {}

        assert hasattr(MyWorkflow, "_twiddle_workflow")
        assert MyWorkflow._twiddle_workflow["name"] == "Test Workflow"
        assert MyWorkflow._twiddle_workflow["class_name"] == "MyWorkflow"

    def test_workflow_decorator_full_options(self):
        """Test workflow decorator with all options."""
        from twiddle_dsl import workflow

        @workflow(
            name="Full Workflow",
            description="A full test workflow",
            version="2.0.0",
            task_queue="custom_queue",
        )
        class FullWorkflow:
            async def run(self, input_data=None):
                return {}

        meta = FullWorkflow._twiddle_workflow
        assert meta["name"] == "Full Workflow"
        assert meta["description"] == "A full test workflow"
        assert meta["version"] == "2.0.0"
        assert meta["task_queue"] == "custom_queue"

    def test_workflow_auto_task_queue(self):
        """Test automatic task queue generation from name."""
        from twiddle_dsl import workflow

        @workflow(name="Customer Onboarding Flow")
        class CustomerWorkflow:
            async def run(self, input_data=None):
                return {}

        # Should convert spaces and dashes to underscores, lowercase
        assert CustomerWorkflow._twiddle_workflow["task_queue"] == "customer_onboarding_flow"


class TestParameter:
    """Tests for the Parameter class."""

    def test_parameter_basic(self):
        """Test basic Parameter creation."""
        from twiddle_dsl import Parameter

        param = Parameter(label="Test Label")
        assert param.label == "Test Label"
        assert param.description == ""
        assert param.required is False
        assert param.default is None

    def test_parameter_full_options(self):
        """Test Parameter with all options."""
        from twiddle_dsl import Parameter

        param = Parameter(
            label="Email",
            description="Email address",
            required=True,
            default="test@example.com",
            template=True,
            secret=False,
            options=["a", "b", "c"],
            validation=r"^[\w\.-]+@[\w\.-]+\.\w+$",
        )
        assert param.label == "Email"
        assert param.description == "Email address"
        assert param.required is True
        assert param.default == "test@example.com"
        assert param.template is True
        assert param.secret is False
        assert param.options == ["a", "b", "c"]
        assert param.validation == r"^[\w\.-]+@[\w\.-]+\.\w+$"

    def test_parameter_repr(self):
        """Test Parameter string representation."""
        from twiddle_dsl import Parameter

        param = Parameter(label="Test", required=True, default="value")
        repr_str = repr(param)
        assert "Test" in repr_str
        assert "required=True" in repr_str
        assert "value" in repr_str


class TestTypes:
    """Tests for DSL types."""

    def test_activity_input(self):
        """Test ActivityInput dataclass."""
        from twiddle_dsl import ActivityInput

        input_data = ActivityInput(
            node_id="node-123",
            node_name="Test Node",
            node_type="twiddle.test",
            parameters={"key": "value"},
            input_data={"prev": "data"},
        )
        assert input_data.node_id == "node-123"
        assert input_data.node_name == "Test Node"
        assert input_data.node_type == "twiddle.test"
        assert input_data.parameters == {"key": "value"}
        assert input_data.input_data == {"prev": "data"}

    def test_workflow_input(self):
        """Test WorkflowInput dataclass."""
        from twiddle_dsl import WorkflowInput

        input_data = WorkflowInput(
            workflow_id="wf-123",
            workflow_name="Test Workflow",
            input_data={"initial": "data"},
        )
        assert input_data.workflow_id == "wf-123"
        assert input_data.workflow_name == "Test Workflow"
        assert input_data.input_data == {"initial": "data"}


class TestExecutionLogger:
    """Tests for ExecutionLogger."""

    def test_execution_logger_creation(self):
        """Test ExecutionLogger creation."""
        from twiddle_dsl import ExecutionLogger

        logger = ExecutionLogger(
            node_id="node-123",
            node_name="Test Node",
            node_type="twiddle.test",
        )
        assert logger.node_id == "node-123"
        assert logger.node_name == "Test Node"
        assert logger.node_type == "twiddle.test"
        assert logger.attempt_number == 1


class TestVersion:
    """Tests for version information."""

    def test_dsl_version(self):
        """Test DSL version is accessible."""
        from twiddle_dsl import __version__

        assert __version__ == "1.0.0"

    def test_all_exports(self):
        """Test all expected items are exported from twiddle_dsl."""
        import twiddle_dsl

        expected_exports = [
            "workflow",
            "activity",
            "Parameter",
            "ActivityInput",
            "WorkflowInput",
            "ExecutionLogger",
            "with_execution_logging",
            "__version__",
        ]
        for export in expected_exports:
            assert hasattr(twiddle_dsl, export), f"Missing export: {export}"
