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

    // Generate the activity call
    const parametersDict = toPythonValue(node.parameters || {});

    let activityCall = `
        # Activity ${index + 1}: ${nodeName}
        try:
            ${nodeVarName} = await workflow.execute_activity(
                ${funcName},
                ActivityInput(
                    node_id="${node.id}",
                    node_name="${nodeName}",
                    node_type="${node.type}",
                    parameters=${parametersDict},
                    input_data=result,
                ),${timeoutCode}${retryPolicyCode}
            )
            result = ${nodeVarName}`;

    if (continueOnFail) {
        activityCall += `
        except Exception as e:
            workflow.logger.warning(f"Activity '${nodeName}' failed but continuing: {e}")
            # Continue with previous result`;
    } else {
        activityCall += `
        except Exception as e:
            workflow.logger.error(f"Activity '${nodeName}' failed: {e}")
            raise`;
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
    
    @workflow.run
    async def run(self, input_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute the workflow.
        
        Args:
            input_data: Optional input data to pass to the first activity
            
        Returns:
            The result from the final activity
        """
        result = input_data or {}
        
        workflow.logger.info(f"Starting workflow with input: {result}")
${nodeExecutions || '        # No activities to execute\n        pass'}
        
        workflow.logger.info(f"Workflow completed with result: {result}")
        return result
`;
}
