"""
Tests for Airflow export functionality in Twiddle SDK.
"""

import pytest
import tempfile
import json
from pathlib import Path
from click.testing import CliRunner


class TestAirflowGenerator:
    """Tests for Airflow DAG generation."""

    def test_generate_dag_file(self):
        """Test generating dag.py content."""
        from twiddle_sdk.converter.airflow_generator import generate_dag_file

        workflow_meta = {
            "name": "Test Workflow",
            "description": "A test workflow",
            "dag_id": "test_workflow",
        }
        activities_meta = [
            {
                "name": "Activity One",
                "function_name": "activity_one",
                "description": "First activity",
            },
            {
                "name": "Activity Two",
                "function_name": "activity_two",
                "description": "Second activity",
            },
        ]

        content = generate_dag_file(workflow_meta, activities_meta)
        
        assert "from airflow import DAG" in content
        assert "PythonOperator" in content
        assert 'dag_id="test_workflow"' in content
        assert "activity_one" in content
        assert "activity_two" in content
        assert "from tasks.activity_one import activity_one" in content
        assert "from tasks.activity_two import activity_two" in content

    def test_generate_task_file(self):
        """Test generating a task implementation file."""
        from twiddle_sdk.converter.airflow_generator import generate_task_file

        activity_meta = {
            "name": "Send Email",
            "function_name": "send_email",
            "description": "Sends an email",
            "parameters": [
                {"name": "recipient", "description": "Email address"},
            ],
        }

        content = generate_task_file(activity_meta)
        
        assert "def send_email(" in content
        assert "input_data" in content
        assert "**kwargs" in content
        assert "Send Email" in content
        assert "xcom_pull" in content

    def test_generate_airflow_requirements(self):
        """Test generating requirements.txt for Airflow."""
        from twiddle_sdk.converter.airflow_generator import generate_requirements

        content = generate_requirements()
        
        assert "apache-airflow" in content
        assert "twiddle-dsl" in content
        assert "python-dotenv" in content

    def test_generate_all_airflow_files(self):
        """Test generating all Airflow files at once."""
        from twiddle_sdk.converter.airflow_generator import generate_all_airflow_files

        workflow_meta = {
            "name": "Test Workflow",
            "description": "Test",
            "dag_id": "test_workflow",
        }
        activities_meta = [
            {
                "name": "Activity One",
                "function_name": "activity_one",
                "description": "First",
            },
            {
                "name": "Activity Two",
                "function_name": "activity_two",
                "description": "Second",
            },
        ]

        files = generate_all_airflow_files(workflow_meta, activities_meta)
        
        # Check required files exist
        assert "dag.py" in files
        assert "requirements.txt" in files
        assert "README.md" in files
        assert "tasks/__init__.py" in files
        assert "tasks/activity_one.py" in files
        assert "tasks/activity_two.py" in files

    def test_generate_airflow_readme(self):
        """Test generating README for Airflow project."""
        from twiddle_sdk.converter.airflow_generator import generate_readme

        workflow_meta = {
            "name": "Customer Pipeline",
            "dag_id": "customer_pipeline",
            "description": "Processes customer data",
        }

        content = generate_readme(workflow_meta)
        
        assert "Customer Pipeline" in content
        assert "customer_pipeline" in content
        assert "Airflow" in content or "airflow" in content
        assert "http://localhost:8080" in content


class TestAirflowLinting:
    """Tests for Airflow-specific linting rules."""

    def test_lint_sync_activity_for_airflow_passes(self):
        """Test that sync activities pass Airflow linting."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a sync activity (preferred for Airflow)
            test_file = Path(tmpdir) / "sync_activity.py"
            test_file.write_text('''
from twiddle_dsl import activity

@activity(name="Sync Activity")
def sync_activity(input_data=None, **kwargs) -> dict:
    return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file), "--target", "airflow"])
            # Should pass - sync is preferred for Airflow
            assert result.exit_code == 0

    def test_lint_async_activity_for_airflow_warns(self):
        """Test that async activities get warnings for Airflow."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create an async activity
            test_file = Path(tmpdir) / "async_activity.py"
            test_file.write_text('''
from twiddle_dsl import activity

@activity(name="Async Activity")
async def async_activity(input_data=None) -> dict:
    return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file), "--target", "airflow"])
            # Should warn about async (TWD010)
            assert "TWD010" in result.output

    def test_lint_missing_kwargs_for_airflow(self):
        """Test that missing **kwargs gets info message for Airflow."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "no_kwargs.py"
            test_file.write_text('''
from twiddle_dsl import activity

@activity(name="No Kwargs")
def no_kwargs_activity(input_data=None) -> dict:
    return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file), "--target", "airflow", "-f", "json"])
            output = json.loads(result.output)
            
            # Check for TWD011 info message
            errors = output["results"][0]["errors"]
            rule_ids = [e["rule_id"] for e in errors]
            assert "TWD011" in rule_ids

    def test_lint_temporal_requires_async(self):
        """Test that Temporal target still requires async."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "sync_activity.py"
            test_file.write_text('''
from twiddle_dsl import activity

@activity(name="Sync Activity")
def sync_activity(input_data=None) -> dict:
    return {}
''')

            result = runner.invoke(cli, ["lint", str(test_file), "--target", "temporal"])
            # Should fail - Temporal requires async
            assert result.exit_code == 1
            assert "TWD002" in result.output


class TestAirflowConvert:
    """Tests for Airflow convert command."""

    def test_convert_to_airflow(self):
        """Test converting to Airflow DAG."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = Path(tmpdir) / "src"
            src_dir.mkdir()
            out_dir = Path(tmpdir) / "output"

            # Create source files
            (src_dir / "activities.py").write_text('''
from twiddle_dsl import activity

@activity(name="Process Data")
async def process_data(input_data=None) -> dict:
    return {}
''')
            (src_dir / "workflow.py").write_text('''
from twiddle_dsl import workflow

@workflow(name="Data Pipeline", dag_id="data_pipeline")
class DataPipeline:
    async def run(self, input_data=None):
        return {}
''')

            result = runner.invoke(
                cli, 
                ["convert", str(src_dir), "-o", str(out_dir), "--target", "airflow"]
            )
            assert result.exit_code == 0
            assert "Airflow DAG" in result.output
            assert "Conversion complete" in result.output

            # Check generated files
            assert (out_dir / "dag.py").exists()
            assert (out_dir / "requirements.txt").exists()
            assert (out_dir / "README.md").exists()
            assert (out_dir / "tasks").is_dir()
            assert (out_dir / "tasks" / "process_data.py").exists()

    def test_convert_airflow_dag_content(self):
        """Test that generated Airflow DAG has correct content."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = Path(tmpdir) / "src"
            src_dir.mkdir()
            out_dir = Path(tmpdir) / "output"

            (src_dir / "activity.py").write_text('''
from twiddle_dsl import activity

@activity(name="My Task")
async def my_task(input_data=None) -> dict:
    return {}
''')
            (src_dir / "workflow.py").write_text('''
from twiddle_dsl import workflow

@workflow(name="My DAG")
class MyDag:
    async def run(self, input_data=None):
        return {}
''')

            runner.invoke(
                cli,
                ["convert", str(src_dir), "-o", str(out_dir), "--target", "airflow"]
            )

            # Check DAG content
            dag_content = (out_dir / "dag.py").read_text()
            assert "from airflow import DAG" in dag_content
            assert "PythonOperator" in dag_content

            # Check task content
            task_content = (out_dir / "tasks" / "my_task.py").read_text()
            assert "def my_task(" in task_content
            assert "xcom" in task_content.lower()

            # Check requirements
            requirements = (out_dir / "requirements.txt").read_text()
            assert "apache-airflow" in requirements

    def test_default_output_dir_for_airflow(self):
        """Test that default output is ./airflow_output for Airflow target."""
        from twiddle_sdk.cli.main import cli

        runner = CliRunner()
        with tempfile.TemporaryDirectory() as tmpdir:
            src_dir = Path(tmpdir) / "src"
            src_dir.mkdir()

            (src_dir / "workflow.py").write_text('''
from twiddle_dsl import workflow, activity

@activity(name="Task")
async def task(input_data=None) -> dict:
    return {}

@workflow(name="Test")
class Test:
    async def run(self, input_data=None):
        return {}
''')

            # Run convert without specifying output
            result = runner.invoke(
                cli,
                ["convert", str(src_dir), "--target", "airflow"],
                catch_exceptions=False
            )
            
            # Check output mentions airflow_output
            assert "airflow_output" in result.output
