"""
Tests for Twiddle SDK converter module.
"""

import pytest
from typing import Dict, Any


class TestExtractor:
    """Tests for metadata extraction."""

    def test_extract_activity_metadata_basic(self):
        """Test extracting metadata from a basic activity."""
        from twiddle_dsl import activity
        from twiddle_sdk.converter.extractor import extract_activity_metadata

        @activity(name="Test Activity", description="A test")
        async def test_activity(input_data=None) -> Dict[str, Any]:
            return {}

        meta = extract_activity_metadata(test_activity)
        assert meta["name"] == "Test Activity"
        assert meta["description"] == "A test"
        assert meta["is_async"] is True

    def test_extract_activity_with_parameters(self):
        """Test extracting activity with Parameter definitions."""
        from twiddle_dsl import activity, Parameter
        from twiddle_sdk.converter.extractor import extract_activity_metadata

        @activity(name="Parameterized")
        async def param_activity(
            name: Parameter[str] = Parameter(
                label="Name",
                description="User name",
                required=True,
            ),
            count: Parameter[int] = Parameter(
                label="Count",
                default=5,
            ),
            input_data=None,
        ) -> Dict[str, Any]:
            return {}

        meta = extract_activity_metadata(param_activity)
        assert "parameters" in meta
        assert len(meta["parameters"]) == 2

        # Find name parameter
        name_param = next(p for p in meta["parameters"] if p["name"] == "name")
        assert name_param["label"] == "Name"
        assert name_param["required"] is True

        # Find count parameter
        count_param = next(p for p in meta["parameters"] if p["name"] == "count")
        assert count_param["label"] == "Count"
        assert count_param["default"] == 5

    def test_extract_workflow_metadata(self):
        """Test extracting metadata from a workflow."""
        from twiddle_dsl import workflow
        from twiddle_sdk.converter.extractor import extract_workflow_metadata

        @workflow(
            name="Test Workflow",
            description="A test workflow",
            version="2.0.0",
        )
        class TestWorkflow:
            """Workflow docstring."""

            async def run(self, input_data=None):
                """Run docstring."""
                return {}

        meta = extract_workflow_metadata(TestWorkflow)
        assert meta["name"] == "Test Workflow"
        assert meta["description"] == "A test workflow"
        assert meta["version"] == "2.0.0"
        assert meta["class_name"] == "TestWorkflow"
        assert "run_signature" in meta

    def test_extract_activity_without_decorator_fails(self):
        """Test extraction fails without decorator."""
        from twiddle_sdk.converter.extractor import extract_activity_metadata

        async def not_decorated(input_data=None):
            return {}

        with pytest.raises(ValueError, match="not decorated"):
            extract_activity_metadata(not_decorated)


class TestGenerator:
    """Tests for code generation."""

    def test_generate_workflow_file(self):
        """Test generating workflow.py content."""
        from twiddle_sdk.converter.generator import generate_workflow_file

        meta = {
            "name": "Test Workflow",
            "description": "A test workflow",
            "class_name": "TestWorkflow",
            "task_queue": "test_queue",
        }

        content = generate_workflow_file(meta)
        assert "class TestWorkflow" in content
        assert "Test Workflow" in content
        assert "@workflow.defn" in content
        assert "async def run" in content

    def test_generate_activities_file(self):
        """Test generating activities.py content."""
        from twiddle_sdk.converter.generator import generate_activities_file

        activities_meta = [
            {
                "name": "Activity One",
                "function_name": "activity_one",
                "description": "First activity",
            },
        ]

        content = generate_activities_file(activities_meta)
        assert "from twiddle_dsl import" in content
        assert "ActivityInput" in content
        assert "with_execution_logging" in content
        assert "@activity.defn" in content

    def test_generate_worker_file(self):
        """Test generating worker.py content."""
        from twiddle_sdk.converter.generator import generate_worker_file

        workflow_meta = {
            "name": "Test",
            "class_name": "TestWorkflow",
            "task_queue": "test_queue",
        }
        activities_meta = [
            {"function_name": "activity_one"},
            {"function_name": "activity_two"},
        ]

        content = generate_worker_file(workflow_meta, activities_meta)
        assert "TestWorkflow" in content
        assert "activity_one" in content
        assert "activity_two" in content
        assert "Worker" in content

    def test_generate_starter_file(self):
        """Test generating starter.py content."""
        from twiddle_sdk.converter.generator import generate_starter_file

        meta = {
            "name": "Test Workflow",
            "class_name": "TestWorkflow",
            "task_queue": "test_queue",
        }

        content = generate_starter_file(meta)
        assert "TestWorkflow" in content
        assert "start_workflow" in content
        assert "test_queue" in content

    def test_generate_requirements(self):
        """Test generating requirements.txt content."""
        from twiddle_sdk.converter.generator import generate_requirements

        content = generate_requirements([])
        assert "temporalio" in content
        assert "aiohttp" in content
        assert "python-dotenv" in content

    def test_generate_dockerfile(self):
        """Test generating Dockerfile content."""
        from twiddle_sdk.converter.generator import generate_dockerfile

        meta = {"name": "Test Workflow"}
        content = generate_dockerfile(meta)
        assert "FROM python" in content
        assert "worker.py" in content

    def test_generate_all_files(self):
        """Test generating all files at once."""
        from twiddle_sdk.converter.generator import generate_all_files

        workflow_meta = {
            "name": "Test Workflow",
            "description": "Test",
            "class_name": "TestWorkflow",
            "task_queue": "test_queue",
        }
        activities_meta = [
            {
                "name": "Activity One",
                "function_name": "activity_one",
                "description": "First",
            },
        ]

        files = generate_all_files(workflow_meta, activities_meta)
        
        assert "workflow.py" in files
        assert "activities.py" in files
        assert "worker.py" in files
        assert "starter.py" in files
        assert "requirements.txt" in files
        assert "Dockerfile" in files
        assert "docker-compose.yml" in files
        assert ".env.example" in files
        assert "README.md" in files
