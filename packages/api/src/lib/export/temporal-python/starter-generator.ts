/**
 * Starter/client file generator for Temporal Python export.
 */

import type { WorkflowData } from './types.js';
import { toPythonIdentifier } from './utils.js';

/**
 * Generate the starter/client file.
 */
export function generateStarterFile(workflow: WorkflowData): string {
    const workflowName = toPythonIdentifier(workflow.name);
    const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';

    return `"""
Start the ${workflow.name} workflow

This script connects to Temporal and starts a workflow execution.
Configure the Temporal server address via environment variables.

Task Queue: ${workflowName}
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

from workflow import ${workflowClassName}

# Load environment variables from .env file
load_dotenv()

# Workflow configuration
WORKFLOW_NAME = "${workflowName}"
TASK_QUEUE = WORKFLOW_NAME  # Task queue matches workflow name

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(WORKFLOW_NAME)


def get_temporal_host() -> str:
    """Get Temporal server address from environment."""
    return os.environ.get('TEMPORAL_HOST', 'localhost:7233')


def get_temporal_namespace() -> str:
    """Get Temporal namespace from environment."""
    return os.environ.get('TEMPORAL_NAMESPACE', 'default')


async def start_workflow(input_data: dict = None, wait_for_result: bool = True, workflow_id: str = None) -> dict:
    """
    Start a workflow execution.

    Args:
        input_data: Optional input data to pass to the workflow
        wait_for_result: If True, wait for the workflow to complete
        workflow_id: Optional custom workflow ID (auto-generated if not provided)

    Returns:
        The workflow result if wait_for_result is True, otherwise the workflow ID
    """
    temporal_host = get_temporal_host()
    namespace = get_temporal_namespace()

    logger.info(f"=== Starting ${workflow.name} ===")
    logger.info(f"Temporal Server: {temporal_host}")
    logger.info(f"Namespace: {namespace}")
    logger.info(f"Task Queue: {TASK_QUEUE}")

    try:
        client = await Client.connect(
            temporal_host,
            namespace=namespace,
        )
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {e}")
        logger.error("Make sure Temporal server is running and accessible")
        sys.exit(1)
    
    # Generate a unique workflow ID if not provided
    if not workflow_id:
        workflow_id = f"{WORKFLOW_NAME}-{uuid.uuid4().hex[:8]}"

    logger.info(f"Workflow ID: {workflow_id}")
    logger.info(f"Input data: {json.dumps(input_data, default=str)}")
    
    # Start the workflow
    handle = await client.start_workflow(
        ${workflowClassName}.run,
        id=workflow_id,
        task_queue=TASK_QUEUE,
        arg=input_data or {},
    )

    logger.info(f"Workflow started successfully!")
    logger.info(f"View in Temporal UI: http://localhost:8080/namespaces/{namespace}/workflows/{workflow_id}")

    if wait_for_result:
        logger.info("Waiting for workflow to complete...")
        try:
            result = await handle.result()
            logger.info(f"Workflow completed!")
            logger.info(f"Result: {json.dumps(result, indent=2, default=str)}")
            return result
        except Exception as e:
            logger.error(f"Workflow failed: {e}")
            raise
    else:
        return {"workflow_id": workflow_id, "status": "started"}


async def main():
    """Main entry point with CLI argument parsing."""
    parser = argparse.ArgumentParser(
        description='Start the ${workflow.name} workflow',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python starter.py
    python starter.py --input '{"key": "value"}'
    python starter.py --id my-custom-id --no-wait
        """
    )
    parser.add_argument(
        '--input', '-i',
        type=str,
        help='JSON input data for the workflow',
        default='{}'
    )
    parser.add_argument(
        '--id',
        type=str,
        help='Custom workflow ID (auto-generated if not provided)',
        default=None
    )
    parser.add_argument(
        '--no-wait',
        action='store_true',
        help='Start the workflow without waiting for the result'
    )

    args = parser.parse_args()

    try:
        input_data = json.loads(args.input)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON input: {e}")
        sys.exit(1)

    await start_workflow(
        input_data=input_data,
        wait_for_result=not args.no_wait,
        workflow_id=args.id
    )


if __name__ == "__main__":
    asyncio.run(main())
`;
}
