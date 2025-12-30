/**
 * Activities file generator for Temporal Python export.
 */

import type { WorkflowNode, WorkflowData } from './types.js';
import { isActivityNode } from './types.js';
import { nodeTypeToFunctionName } from './utils.js';
import { generateActivityCode } from './activity-code/index.js';

/**
 * Generate the activities file with enhanced execution logging.
 */
export function generateActivitiesFile(workflow: WorkflowData): string {
    const nodes = workflow.nodes as WorkflowNode[];
    const nodeTypes = [...new Set(nodes.filter(n => isActivityNode(n.type)).map(n => n.type))];

    const activities = nodeTypes
        .map(nodeType => {
            const activityCode = generateActivityCode(nodeType);
            const funcName = nodeTypeToFunctionName(nodeType);

            // Stack decorators: activity.defn for Temporal, with_execution_logging for structured events
            return `
@activity.defn(name="${funcName}")
@with_execution_logging
${activityCode}`;
        })
        .join('\n');

    return `"""
Activity implementations for the workflow.

Each activity is:
- Idempotent: Safe to retry without side effects
- Durable: State is persisted by Temporal
- Configurable: Retry policies and timeouts are set by the workflow

Execution Logging:
- All activities emit structured JSON execution events
- Events: ACTIVITY_STARTED, ACTIVITY_COMPLETED, ACTIVITY_FAILED, ACTIVITY_RETRY
- Use these events to build waterfall visualizations
"""
import os
from typing import Any, Dict

from temporalio import activity

# Import Twiddle DSL components for consistent execution logging
from twiddle_dsl import ActivityInput, ExecutionLogger, with_execution_logging


def get_env(key: str, default: str = "") -> str:
    """Get environment variable with optional default."""
    return os.environ.get(key, default)

${activities}
`;
}
