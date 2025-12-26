"""
Twiddle SDK - Code Generator

Generates Temporal Python applications from Twiddle DSL code.
Produces the same output structure as the existing python-export.ts.
"""

from pathlib import Path
from typing import Any, Dict, List


def generate_workflow_file(workflow_meta: Dict[str, Any]) -> str:
    """Generate workflow.py content."""
    name = workflow_meta.get("name", "Workflow")
    description = workflow_meta.get("description", "Generated from Twiddle")
    class_name = workflow_meta.get("class_name", "TwiddleWorkflow")
    task_queue = workflow_meta.get("task_queue", "twiddle")

    return f'''"""
{name}
{description}

Auto-generated Temporal workflow with durable activity execution.
"""
import os
from datetime import timedelta
from dataclasses import dataclass
from typing import Any, Dict, Optional

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from activities import ActivityInput


@workflow.defn
class {class_name}:
    """
    {description}
    
    This is a Temporal workflow that orchestrates a series of activities.
    Each activity is durable - if the worker crashes, Temporal will resume
    execution from the last completed activity.
    
    Task Queue: {task_queue}
    """
    
    @workflow.run
    async def run(self, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute the workflow.
        
        Args:
            input_data: Optional input data to pass to the first activity
            
        Returns:
            The result from the final activity
        """
        result = input_data or {{}}
        
        workflow.logger.info(f"Starting workflow with input: {{result}}")
        
        # TODO: Add activity orchestration here
        # Example:
        # result = await workflow.execute_activity(
        #     my_activity,
        #     ActivityInput(...),
        #     start_to_close_timeout=timedelta(seconds=300),
        # )
        
        workflow.logger.info(f"Workflow completed with result: {{result}}")
        return result
'''


def generate_activities_file(activities_meta: List[Dict[str, Any]]) -> str:
    """Generate activities.py content."""

    # Generate activity function stubs
    activity_functions = []
    activity_imports = []

    for activity in activities_meta:
        func_name = activity.get("function_name", "unknown_activity")
        name = activity.get("name", func_name)
        description = activity.get("description", "")

        activity_code = f'''
@activity.defn(name="{func_name}")
@with_execution_logging
async def {func_name}(input: ActivityInput) -> Dict[str, Any]:
    """
    {name}
    
    {description}
    """
    params = input.parameters
    
    # TODO: Implement activity logic here
    activity.logger.info(f"[{{input.node_name}}] Executing {name}")
    
    return input.input_data
'''
        activity_functions.append(activity_code)
        activity_imports.append(func_name)

    activities_str = "\n".join(activity_functions)
    
    return f'''"""
Activity implementations for the workflow.

Each activity is:
- Idempotent: Safe to retry without side effects
- Durable: State is persisted by Temporal
- Configurable: Retry policies and timeouts are set by the workflow

Execution Logging:
- All activities emit structured JSON execution events
- Events: ACTIVITY_STARTED, ACTIVITY_COMPLETED, ACTIVITY_FAILED, ACTIVITY_RETRY
"""
import os
from typing import Any, Dict

from temporalio import activity

# Import Twiddle DSL components for consistent execution logging
from twiddle_dsl import ActivityInput, ExecutionLogger, with_execution_logging


def get_env(key: str, default: str = "") -> str:
    """Get environment variable with optional default."""
    return os.environ.get(key, default)


# =============================================================================
# Activity Implementations
# =============================================================================
{activities_str}
'''


def generate_worker_file(workflow_meta: Dict[str, Any], activities_meta: List[Dict[str, Any]]) -> str:
    """Generate worker.py content."""
    class_name = workflow_meta.get("class_name", "TwiddleWorkflow")
    task_queue = workflow_meta.get("task_queue", "twiddle")

    activity_imports = [a.get("function_name", "unknown") for a in activities_meta]
    activity_imports_str = ",\n    ".join(activity_imports) if activity_imports else ""
    activity_list_str = ",\n            ".join(activity_imports) if activity_imports else ""

    return f'''"""
Worker for the Twiddle workflow.

This script starts a Temporal Worker that listens to the task queue
and executes workflows and activities.
"""
import asyncio
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor

from temporalio.client import Client
from temporalio.worker import Worker

from workflow import {class_name}
from activities import (
    {activity_imports_str}
)

# Configure logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO').upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("worker")

# Configuration
TEMPORAL_HOST = os.environ.get('TEMPORAL_HOST', 'localhost:7233')
TEMPORAL_NAMESPACE = os.environ.get('TEMPORAL_NAMESPACE', 'default')
TASK_QUEUE = "{task_queue}"


async def main():
    logger.info(f"Starting worker for task queue: {{TASK_QUEUE}}")
    logger.info(f"Connecting to Temporal server at {{TEMPORAL_HOST}}...")

    try:
        client = await Client.connect(
            TEMPORAL_HOST,
            namespace=TEMPORAL_NAMESPACE,
        )
        logger.info("Connected to Temporal server")
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {{e}}")
        logger.error("Ensure Temporal server is running and reachable")
        sys.exit(1)

    # Create worker
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[{class_name}],
        activities=[
            {activity_list_str}
        ],
        activity_executor=ThreadPoolExecutor(max_workers=10),
    )

    logger.info("Worker started, waiting for tasks...")
    try:
        await worker.run()
    except asyncio.CancelledError:
        logger.info("Worker stopped")
    except Exception as e:
        logger.error(f"Worker failed: {{e}}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupt received, shutting down")
'''


def generate_starter_file(workflow_meta: Dict[str, Any]) -> str:
    """Generate starter.py content."""
    name = workflow_meta.get("name", "Workflow")
    class_name = workflow_meta.get("class_name", "TwiddleWorkflow")
    task_queue = workflow_meta.get("task_queue", "twiddle")

    return f'''"""
Start the {name} workflow.

This script connects to Temporal and starts a workflow execution.
"""
import argparse
import asyncio
import json
import logging
import os
import sys
import uuid

from dotenv import load_dotenv
from temporalio.client import Client

from workflow import {class_name}

# Load environment variables
load_dotenv()

# Configuration
WORKFLOW_NAME = "{task_queue}"
TASK_QUEUE = WORKFLOW_NAME

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(WORKFLOW_NAME)


def get_temporal_host() -> str:
    return os.environ.get('TEMPORAL_HOST', 'localhost:7233')


def get_temporal_namespace() -> str:
    return os.environ.get('TEMPORAL_NAMESPACE', 'default')


async def start_workflow(input_data: dict = None, wait_for_result: bool = True, workflow_id: str = None) -> dict:
    """Start a workflow execution."""
    temporal_host = get_temporal_host()
    namespace = get_temporal_namespace()

    logger.info(f"=== Starting {name} ===")
    logger.info(f"Temporal Server: {{temporal_host}}")
    logger.info(f"Namespace: {{namespace}}")
    logger.info(f"Task Queue: {{TASK_QUEUE}}")

    try:
        client = await Client.connect(temporal_host, namespace=namespace)
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {{e}}")
        sys.exit(1)
    
    if not workflow_id:
        workflow_id = f"{{WORKFLOW_NAME}}-{{uuid.uuid4().hex[:8]}}"

    logger.info(f"Workflow ID: {{workflow_id}}")
    logger.info(f"Input data: {{json.dumps(input_data, default=str)}}")
    
    handle = await client.start_workflow(
        {class_name}.run,
        id=workflow_id,
        task_queue=TASK_QUEUE,
        arg=input_data or {{}},
    )

    logger.info("Workflow started successfully!")
    logger.info(f"View in Temporal UI: http://localhost:8080/namespaces/{{namespace}}/workflows/{{workflow_id}}")

    if wait_for_result:
        logger.info("Waiting for workflow to complete...")
        try:
            result = await handle.result()
            logger.info("Workflow completed!")
            logger.info(f"Result: {{json.dumps(result, indent=2, default=str)}}")
            return result
        except Exception as e:
            logger.error(f"Workflow failed: {{e}}")
            raise
    else:
        return {{"workflow_id": workflow_id, "status": "started"}}


async def main():
    parser = argparse.ArgumentParser(description='Start the {name} workflow')
    parser.add_argument('--input', '-i', type=str, help='JSON input data', default='{{}}')
    parser.add_argument('--id', type=str, help='Custom workflow ID', default=None)
    parser.add_argument('--no-wait', action='store_true', help='Start without waiting')
    
    args = parser.parse_args()

    try:
        input_data = json.loads(args.input)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON input: {{e}}")
        sys.exit(1)

    await start_workflow(
        input_data=input_data,
        wait_for_result=not args.no_wait,
        workflow_id=args.id
    )


if __name__ == "__main__":
    asyncio.run(main())
'''


def generate_requirements(activities_meta: List[Dict[str, Any]]) -> str:
    """Generate requirements.txt content."""
    return '''# Twiddle DSL
twiddle-dsl>=1.0.0

# Temporal SDK
temporalio>=1.4.0

# HTTP requests
aiohttp>=3.9.0

# Utilities
python-dotenv>=1.0.0
'''


def generate_dockerfile(workflow_meta: Dict[str, Any]) -> str:
    """Generate Dockerfile content."""
    name = workflow_meta.get("name", "Workflow")
    return f'''# Dockerfile for {name}
# Generated by Twiddle SDK

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc libffi-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV TEMPORAL_HOST=temporal:7233
ENV TEMPORAL_NAMESPACE=default

CMD ["python", "worker.py"]
'''


def generate_docker_compose(workflow_meta: Dict[str, Any]) -> str:
    """Generate docker-compose.yml content."""
    name = workflow_meta.get("name", "Workflow")
    return f'''# Docker Compose for {name}
# Generated by Twiddle SDK

version: '3.8'

services:
  worker:
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
      - TEMPORAL_HOST=${{TEMPORAL_HOST:-localhost:7233}}
      - TEMPORAL_NAMESPACE=${{TEMPORAL_NAMESPACE:-default}}
'''


def generate_env_example(workflow_meta: Dict[str, Any]) -> str:
    """Generate .env.example content."""
    name = workflow_meta.get("name", "Workflow")
    task_queue = workflow_meta.get("task_queue", "twiddle")
    return f'''# {name} Configuration
# Generated by Twiddle SDK

# Temporal Configuration
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default

# Task queue
# TASK_QUEUE={task_queue}
'''


def generate_readme(workflow_meta: Dict[str, Any]) -> str:
    """Generate README.md content."""
    name = workflow_meta.get("name", "Workflow")
    task_queue = workflow_meta.get("task_queue", "twiddle")
    description = workflow_meta.get("description", "A Temporal workflow generated by Twiddle SDK.")

    return f'''# {name}

{description}

## Quick Start

```bash
# Configure environment
cp .env.example .env

# Install dependencies
pip install -r requirements.txt

# Start Temporal (if not running)
temporal server start-dev

# Start the worker
python worker.py

# In another terminal, start a workflow
python starter.py
```

## Files

| File | Description |
|------|-------------|
| `workflow.py` | Main workflow definition |
| `activities.py` | Activity implementations |
| `worker.py` | Worker that executes workflows |
| `starter.py` | Script to start workflow executions |
| `requirements.txt` | Python dependencies |

## Task Queue

This workflow uses task queue: `{task_queue}`

## Temporal UI

Access at: http://localhost:8080
'''


def generate_all_files(
    workflow_meta: Dict[str, Any],
    activities_meta: List[Dict[str, Any]],
) -> Dict[str, str]:
    """
    Generate all files for a Temporal application.

    Args:
        workflow_meta: Workflow metadata
        activities_meta: List of activity metadata

    Returns:
        Dict mapping filename to content
    """
    return {
        "workflow.py": generate_workflow_file(workflow_meta),
        "activities.py": generate_activities_file(activities_meta),
        "worker.py": generate_worker_file(workflow_meta, activities_meta),
        "starter.py": generate_starter_file(workflow_meta),
        "requirements.txt": generate_requirements(activities_meta),
        "Dockerfile": generate_dockerfile(workflow_meta),
        "docker-compose.yml": generate_docker_compose(workflow_meta),
        ".env.example": generate_env_example(workflow_meta),
        "README.md": generate_readme(workflow_meta),
    }
