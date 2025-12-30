/**
 * Worker file generator for Temporal Python export.
 */

import type { WorkflowNode, WorkflowData } from './types.js';
import { isActivityNode } from './types.js';
import { toPythonIdentifier, nodeTypeToFunctionName } from './utils.js';

/**
 * Generate the worker file that runs the workflow and activities.
 */
export function generateWorkerFile(workflow: WorkflowData): string {
    const workflowName = toPythonIdentifier(workflow.name);
    const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';

    // Get all activity function names
    const nodes = workflow.nodes as WorkflowNode[];
    const activityNodes = nodes.filter(n => isActivityNode(n.type));
    // Deduplicate node types
    const nodeTypes = [...new Set(activityNodes.map(n => n.type))];
    const activityFunctions = nodeTypes.map(t => nodeTypeToFunctionName(t));

    const activityImports = activityFunctions.length > 0
        ? `
from activities import (
${activityFunctions.map(f => `    ${f},`).join('\n')}
)`
        : '';

    return `"""
Worker for ${workflow.name}

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

from workflow import ${workflowClassName}
${activityImports}

# Configure logging
logging.basicConfig(
    level=os.environ.get('LOG_LEVEL', 'INFO').upper(),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("worker")

# Configuration
TEMPORAL_HOST = os.environ.get('TEMPORAL_HOST', 'localhost:7233')
TEMPORAL_NAMESPACE = os.environ.get('TEMPORAL_NAMESPACE', 'default')
TASK_QUEUE = "${workflowName}"


async def main():
    logger.info(f"Starting worker for task queue: {TASK_QUEUE}")
    logger.info(f"Connecting to Temporal server at {TEMPORAL_HOST}...")

    try:
        client = await Client.connect(
            TEMPORAL_HOST,
            namespace=TEMPORAL_NAMESPACE,
        )
        logger.info("Connected to Temporal server")
    except Exception as e:
        logger.error(f"Failed to connect to Temporal server: {e}")
        logger.error("Ensure Temporal server is running and reachable")
        sys.exit(1)

    # Create worker
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[${workflowClassName}],
        activities=[
${activityFunctions.map(f => `            ${f},`).join('\n')}
        ],
        # Thread pool for synchronous activities if needed
        activity_executor=ThreadPoolExecutor(max_workers=10),
    )

    logger.info("Worker started, waiting for tasks...")
    try:
        await worker.run()
    except asyncio.CancelledError:
        logger.info("Worker stopped")
    except Exception as e:
        logger.error(f"Worker failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Interrupt received, shutting down")
`;
}
