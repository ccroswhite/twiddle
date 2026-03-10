/**
 * Workflow file generator for Temporal Python export.
 */

import type { WorkflowNode, WorkflowData } from './types.js';
import { isActivityNode } from './types.js';
import { toPythonIdentifier, nodeTypeToFunctionName, toPythonValue } from './utils.js';

/**
 * Generate activity execution code for a node with proper options.
 */
export function generateActivityExecution(node: WorkflowNode, index: number): string {
    const funcName = nodeTypeToFunctionName(node.type);
    const nodeVarName = `node_${index}_result`;
    const nodeName = node.name || node.type.split('.').pop() || 'unknown';

    // Get activity options with defaults
    const startToCloseTimeout = node.startToCloseTimeout || 300;
    const scheduleToCloseTimeout = node.scheduleToCloseTimeout || 0;
    const retryOnFail = node.retryOnFail !== false; // Default true
    const maxRetries = node.maxRetries || 3;
    const retryInterval = node.retryInterval || 1;
    const backoffCoefficient = node.backoffCoefficient || 2.0;
    const continueOnFail = node.continueOnFail || false;

    // Build retry policy if retries are enabled
    let retryPolicyCode = '';
    if (retryOnFail) {
        retryPolicyCode = `
        retry_policy=RetryPolicy(
            initial_interval=timedelta(seconds=${retryInterval}),
            backoff_coefficient=${backoffCoefficient},
            maximum_attempts=${maxRetries},
        ),`;
    } else {
        retryPolicyCode = `
        retry_policy=RetryPolicy(maximum_attempts=1),`;
    }

    // Build timeout options
    let timeoutCode = `
        start_to_close_timeout=timedelta(seconds=${startToCloseTimeout}),`;

    if (scheduleToCloseTimeout > 0) {
        timeoutCode += `
        schedule_to_close_timeout=timedelta(seconds=${scheduleToCloseTimeout}),`;
    }

    const requiredEvents = (node.parameters?.requiredActivity as string[]) || [];
    const publishedEvents = (node.parameters?.publishedActivity as string[]) || [];

    // The function header
    let activityCall = `
        async def execute_activity_task_${index}():
            nonlocal result
            try:
                workflow.logger.info(f"ActivityStarted: workflow_name='{workflowName}' activity_name='{nodeName}'")`;

    // Wait condition logic
    if (requiredEvents.length > 0) {
        activityCall += `
                # Wait for required activities
                workflow.logger.info(f"ActivityWaiting: workflow_name='{workflowName}' activity_name='{nodeName}' waiting_for={${JSON.stringify(requiredEvents)}}")
                await workflow.wait_condition(
                    lambda: all(self._events.get(req, False) for req in ${JSON.stringify(requiredEvents)})
                )`;
    }

    // Generate the activity call
    const parametersDict = toPythonValue(node.parameters || {});

    activityCall += `
                # Execute Activity: ${nodeName}
                ${nodeVarName} = await workflow.execute_activity(
                    ${funcName},
                    ActivityInput(
                        node_id="${node.id}",
                        node_name="${nodeName}",
                        node_type="${node.type}",
                        parameters=${parametersDict},
                        input_data=result,
                    ),${timeoutCode}${retryPolicyCode}
                )`;

    // Update result thread-safely (in Temporal Python this is deterministic)
    if (continueOnFail) {
        activityCall += `
                result = ${nodeVarName}
                workflow.logger.info(f"ActivitySuccess: workflow_name='{workflowName}' activity_name='{nodeName}'")
            except Exception as e:
                workflow.logger.warning(f"ActivityFailed (Continuing): workflow_name='{workflowName}' activity_name='{nodeName}' error='{e}'")
                self._events["${nodeName}-FAIL"] = True
                # Continue with previous result`;
    } else {
        activityCall += `
                result = ${nodeVarName}
                workflow.logger.info(f"ActivitySuccess: workflow_name='{workflowName}' activity_name='{nodeName}'")
            except Exception as e:
                workflow.logger.error(f"ActivityFailed (Fatal): workflow_name='{workflowName}' activity_name='{nodeName}' error='{e}'")
                self._events["${nodeName}-FAIL"] = True
                raise`;
    }

    // Publish logic runs whether success or failure if continueOnFail = true, but let's do success only for now
    if (publishedEvents.length > 0) {
        activityCall += `
            finally:
                # Publish completion events if successful (or if continuing on fail, we still run finally block)
                # However, typically a true success publishes the OK state.
                # To perfectly mimic Control-M, we publish the explicitly requested states:
                ${publishedEvents.map(e => `
                self._events["${e}"] = True
                workflow.logger.info(f"SignalPublished: workflow_name='{workflowName}' activity_name='{nodeName}' signal_name='${e}'")`).join('')}`;
    }

    return activityCall;
}

/**
 * Generate the main workflow file.
 */
export function generateWorkflowFile(workflow: WorkflowData): string {
    const workflowName = toPythonIdentifier(workflow.name);
    const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';
    const nodes = workflow.nodes as WorkflowNode[];

    // Filter to only activity nodes (not triggers)
    const activityNodes = nodes.filter(n => isActivityNode(n.type));

    // Generate node execution calls with proper activity options
    const nodeExecutions = activityNodes
        .map((node, index) => generateActivityExecution(node, index))
        .join('\n');

    return `"""
${workflow.name}
${workflow.description || 'Generated from Twiddle workflow'}

Auto-generated Temporal workflow with durable activity execution.
Each activity is idempotent and has configurable retry and timeout policies.
"""
import os
from datetime import timedelta
from dataclasses import dataclass
from typing import Any, Dict, Optional

from temporalio import workflow
from temporalio.common import RetryPolicy

# Import Twiddle DSL types
from twiddle_dsl import ActivityInput

with workflow.unsafe.imports_passed_through():
    from activities import (
${activityNodes.map(n => `        ${nodeTypeToFunctionName(n.type)},`).join('\n')}
    )


@workflow.defn
class ${workflowClassName}:
    """
    ${workflow.description || workflow.name}
    
    This is a Temporal workflow that orchestrates a series of activities.
    Each activity is durable - if the worker crashes, Temporal will resume
    execution from the last completed activity.
    """
    
    def __init__(self) -> None:
        self._events: Dict[str, bool] = {}

    @workflow.signal
    def set_event(self, event_name: str) -> None:
        """Allow external workflows/users to trigger dependencies."""
        workflow.logger.info(f"SignalReceived: workflow_name='${workflowName}' signal_name='{event_name}'")
        self._events[event_name] = True

    @workflow.run
    async def run(self, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute the workflow DAG using asyncio.gather for parallel node execution
        while respecting wait_condition dependencies.
        """
        result = input_data or {}
        
        workflow.logger.info(f"WorkflowStarted: workflow_name='${workflowName}' input={result}")
        
        # Define execution wrappers for each node
${nodeExecutions || '        # No activities to execute'}

        # Launch all node tasks concurrently so wait_condition functions correctly
        import asyncio
        tasks = [
${activityNodes.map((_, idx) => `            asyncio.create_task(execute_activity_task_${idx}()),`).join('\n')}
        ]
        
        if tasks:
            await asyncio.gather(*tasks)
        
        workflow.logger.info(f"WorkflowCompleted: workflow_name='${workflowName}' result={result}")
        return result
`;
}
