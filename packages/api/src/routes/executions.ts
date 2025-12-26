import type { FastifyPluginAsync } from 'fastify';
import {
    isTemporalAvailable,
    listWorkflowExecutions,
    listExecutionsForWorkflow,
    describeWorkflowExecution,
    getWorkflowTimeline,
    getStatusDisplay,
    type WorkflowExecutionInfo,
} from '../lib/temporal-client.js';

/**
 * Execution Routes
 * 
 * Provides endpoints for viewing Temporal workflow executions:
 * - List all executions or filter by workflow
 * - Get execution details and timeline
 * - Status information for visualization
 */

export const executionRoutes: FastifyPluginAsync = async (app) => {
    // ==========================================================================
    // Health Check for Temporal Connection
    // ==========================================================================

    /**
     * GET /api/executions/health
     * Check if Temporal is available
     */
    app.get('/health', async () => {
        const available = await isTemporalAvailable();
        return {
            temporal: available,
            message: available
                ? 'Connected to Temporal'
                : 'Temporal is not available',
        };
    });

    // ==========================================================================
    // List Executions
    // ==========================================================================

    /**
     * GET /api/executions
     * List workflow executions from Temporal
     */
    app.get<{
        Querystring: {
            query?: string;
            taskQueue?: string;
            limit?: number;
        };
    }>('/', async (request, reply) => {
        const { query, taskQueue, limit = 20 } = request.query;

        try {
            let executions: WorkflowExecutionInfo[];

            if (taskQueue) {
                executions = await listExecutionsForWorkflow(taskQueue, limit);
            } else {
                executions = await listWorkflowExecutions(query, limit);
            }

            // Add display info
            const executionsWithDisplay = executions.map(exec => ({
                ...exec,
                statusDisplay: getStatusDisplay(exec.status),
                durationMs: exec.closeTime
                    ? exec.closeTime.getTime() - exec.startTime.getTime()
                    : undefined,
            }));

            return {
                executions: executionsWithDisplay,
                total: executions.length,
                hasMore: executions.length >= limit,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';

            // If Temporal is unavailable, return empty list with error info
            return reply.status(503).send({
                error: 'Temporal unavailable',
                message,
                executions: [],
                total: 0,
                hasMore: false,
            });
        }
    });

    // ==========================================================================
    // Get Single Execution
    // ==========================================================================

    /**
     * GET /api/executions/:workflowId
     * Get execution details
     */
    app.get<{
        Params: { workflowId: string };
        Querystring: { runId?: string };
    }>('/:workflowId', async (request, reply) => {
        const { workflowId } = request.params;
        const { runId } = request.query;

        try {
            const execution = await describeWorkflowExecution(workflowId, runId);

            if (!execution) {
                return reply.status(404).send({ error: 'Execution not found' });
            }

            return {
                ...execution,
                statusDisplay: getStatusDisplay(execution.status),
                durationMs: execution.closeTime
                    ? execution.closeTime.getTime() - execution.startTime.getTime()
                    : undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(503).send({
                error: 'Failed to fetch execution',
                message,
            });
        }
    });

    // ==========================================================================
    // Get Execution Timeline (for waterfall visualization)
    // ==========================================================================

    /**
     * GET /api/executions/:workflowId/timeline
     * Get execution timeline for waterfall visualization
     */
    app.get<{
        Params: { workflowId: string };
        Querystring: { runId?: string };
    }>('/:workflowId/timeline', async (request, reply) => {
        const { workflowId } = request.params;
        const { runId } = request.query;

        try {
            const timeline = await getWorkflowTimeline(workflowId, runId);

            if (!timeline) {
                return reply.status(404).send({ error: 'Execution not found' });
            }

            // Enhance timeline events with display info
            const enhancedEvents = timeline.events.map(event => {
                let color = 'gray';
                switch (event.status) {
                    case 'completed':
                        color = 'green';
                        break;
                    case 'failed':
                        color = 'red';
                        break;
                    case 'started':
                        color = 'blue';
                        break;
                    case 'scheduled':
                        color = 'gray';
                        break;
                    case 'canceled':
                        color = 'orange';
                        break;
                    case 'timedOut':
                        color = 'red';
                        break;
                }

                return {
                    ...event,
                    color,
                    // Calculate relative offset from workflow start
                    offsetMs: event.startTime.getTime() - timeline.startTime.getTime(),
                    endOffsetMs: event.endTime
                        ? event.endTime.getTime() - timeline.startTime.getTime()
                        : undefined,
                };
            });

            return {
                ...timeline,
                statusDisplay: getStatusDisplay(timeline.status),
                events: enhancedEvents,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(503).send({
                error: 'Failed to fetch timeline',
                message,
            });
        }
    });

    // ==========================================================================
    // List Executions for a Twiddle Workflow
    // ==========================================================================

    /**
     * GET /api/executions/workflow/:workflowName
     * List executions for a specific Twiddle workflow by name
     * (Uses task queue naming convention: workflow name -> task queue)
     */
    app.get<{
        Params: { workflowName: string };
        Querystring: { limit?: number };
    }>('/workflow/:workflowName', async (request, reply) => {
        const { workflowName } = request.params;
        const { limit = 20 } = request.query;

        // Convert workflow name to task queue name (same convention as python-export.ts)
        const taskQueue = workflowName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/^(\d)/, '_$1') || 'workflow';

        try {
            const executions = await listExecutionsForWorkflow(taskQueue, limit);

            const executionsWithDisplay = executions.map(exec => ({
                ...exec,
                statusDisplay: getStatusDisplay(exec.status),
                durationMs: exec.closeTime
                    ? exec.closeTime.getTime() - exec.startTime.getTime()
                    : undefined,
            }));

            return {
                workflowName,
                taskQueue,
                executions: executionsWithDisplay,
                total: executions.length,
                hasMore: executions.length >= limit,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return reply.status(503).send({
                error: 'Temporal unavailable',
                message,
                executions: [],
                total: 0,
                hasMore: false,
            });
        }
    });
};
