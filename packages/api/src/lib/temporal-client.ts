/**
 * Temporal Client Wrapper
 * 
 * Provides a simplified interface to Temporal's APIs for:
 * - Listing workflow executions
 * - Fetching workflow history and events
 * - Getting execution status
 */

import { Client, Connection } from '@temporalio/client';

// Configuration from environment
const TEMPORAL_HOST = process.env.TEMPORAL_HOST || 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'default';

// Singleton connection
let temporalClient: Client | null = null;
let connectionError: Error | null = null;

/**
 * Get or create the Temporal client connection
 */
export async function getTemporalClient(): Promise<Client> {
    if (connectionError) {
        throw connectionError;
    }

    if (temporalClient) {
        return temporalClient;
    }

    try {
        const connection = await Connection.connect({
            address: TEMPORAL_HOST,
        });

        temporalClient = new Client({
            connection,
            namespace: TEMPORAL_NAMESPACE,
        });

        console.log(`Connected to Temporal at ${TEMPORAL_HOST}, namespace: ${TEMPORAL_NAMESPACE}`);
        return temporalClient;
    } catch (error) {
        connectionError = error as Error;
        console.error('Failed to connect to Temporal:', error);
        throw error;
    }
}

/**
 * Check if Temporal is available
 */
export async function isTemporalAvailable(): Promise<boolean> {
    try {
        await getTemporalClient();
        return true;
    } catch {
        return false;
    }
}

// =============================================================================
// Types for Twiddle's execution view
// =============================================================================

export type ExecutionStatus =
    | 'RUNNING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELED'
    | 'TERMINATED'
    | 'CONTINUED_AS_NEW'
    | 'TIMED_OUT'
    | 'UNKNOWN';

export interface WorkflowExecutionInfo {
    workflowId: string;
    runId: string;
    workflowType: string;
    status: ExecutionStatus;
    startTime: Date;
    closeTime?: Date;
    executionTime?: Date;
    taskQueue: string;
    historyLength: number;
    memo?: Record<string, unknown>;
    searchAttributes?: Record<string, unknown>;
}

export interface ActivityEvent {
    eventId: number;
    eventType: string;
    timestamp: Date;
    activityId?: string;
    activityType?: string;
    taskQueue?: string;
    attempt?: number;
    scheduledTime?: Date;
    startedTime?: Date;
    completedTime?: Date;
    failedTime?: Date;
    timedOutTime?: Date;
    durationMs?: number;
    input?: unknown;
    result?: unknown;
    failure?: {
        message: string;
        type: string;
        stackTrace?: string;
    };
}

export interface TimelineEvent {
    id: string;
    type: 'workflow' | 'activity' | 'timer' | 'signal' | 'marker';
    name: string;
    status: 'scheduled' | 'started' | 'completed' | 'failed' | 'canceled' | 'timedOut';
    startTime: Date;
    endTime?: Date;
    durationMs?: number;
    attempt?: number;
    details?: Record<string, unknown>;
    error?: {
        message: string;
        type: string;
    };
}

export interface WorkflowTimeline {
    workflowId: string;
    runId: string;
    status: ExecutionStatus;
    startTime: Date;
    closeTime?: Date;
    totalDurationMs?: number;
    events: TimelineEvent[];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * List workflow executions
 */
export async function listWorkflowExecutions(
    query?: string,
    pageSize = 20,
): Promise<WorkflowExecutionInfo[]> {
    const client = await getTemporalClient();

    const executions: WorkflowExecutionInfo[] = [];

    // Use the workflow service to list executions
    const iterator = client.workflow.list({
        query: query || undefined,
        pageSize,
    });

    for await (const execution of iterator) {
        executions.push({
            workflowId: execution.workflowId,
            runId: execution.runId,
            workflowType: execution.type,
            status: mapWorkflowStatus(execution.status.name),
            startTime: execution.startTime,
            closeTime: execution.closeTime || undefined,
            executionTime: execution.executionTime || undefined,
            taskQueue: execution.taskQueue,
            historyLength: execution.historyLength,
            memo: execution.memo || undefined,
            searchAttributes: execution.searchAttributes || undefined,
        });

        // Limit results
        if (executions.length >= pageSize) {
            break;
        }
    }

    return executions;
}

/**
 * List executions for a specific workflow (by task queue)
 */
export async function listExecutionsForWorkflow(
    taskQueue: string,
    pageSize = 20,
): Promise<WorkflowExecutionInfo[]> {
    return listWorkflowExecutions(`TaskQueue = "${taskQueue}"`, pageSize);
}

/**
 * Get detailed execution info
 */
export async function describeWorkflowExecution(
    workflowId: string,
    runId?: string,
): Promise<WorkflowExecutionInfo | null> {
    const client = await getTemporalClient();

    try {
        const handle = client.workflow.getHandle(workflowId, runId);
        const description = await handle.describe();

        return {
            workflowId: description.workflowId,
            runId: description.runId,
            workflowType: description.type,
            status: mapWorkflowStatus(description.status.name),
            startTime: description.startTime,
            closeTime: description.closeTime || undefined,
            executionTime: description.executionTime || undefined,
            taskQueue: description.taskQueue,
            historyLength: description.historyLength,
            memo: description.memo || undefined,
            searchAttributes: description.searchAttributes || undefined,
        };
    } catch (error) {
        console.error(`Failed to describe workflow ${workflowId}:`, error);
        return null;
    }
}

/**
 * Get workflow history as a timeline for visualization
 */
export async function getWorkflowTimeline(
    workflowId: string,
    runId?: string,
): Promise<WorkflowTimeline | null> {
    const client = await getTemporalClient();

    try {
        const handle = client.workflow.getHandle(workflowId, runId);
        const description = await handle.describe();

        const events: TimelineEvent[] = [];
        const activityMap = new Map<string, TimelineEvent>();

        // Fetch history - use the history() method which returns an iterable
        const history = await handle.fetchHistory();
        const historyEvents = history?.events || [];

        for (const event of historyEvents) {
            const timestamp = event.eventTime ? new Date(Number(event.eventTime.seconds) * 1000) : new Date();

            // Process different event types
            if (event.workflowExecutionStartedEventAttributes) {
                events.push({
                    id: `workflow-start-${event.eventId}`,
                    type: 'workflow',
                    name: 'Workflow Started',
                    status: 'started',
                    startTime: timestamp,
                });
            }

            if (event.workflowExecutionCompletedEventAttributes) {
                events.push({
                    id: `workflow-complete-${event.eventId}`,
                    type: 'workflow',
                    name: 'Workflow Completed',
                    status: 'completed',
                    startTime: timestamp,
                });
            }

            if (event.workflowExecutionFailedEventAttributes) {
                const attrs = event.workflowExecutionFailedEventAttributes;
                events.push({
                    id: `workflow-failed-${event.eventId}`,
                    type: 'workflow',
                    name: 'Workflow Failed',
                    status: 'failed',
                    startTime: timestamp,
                    error: attrs.failure ? {
                        message: attrs.failure.message || 'Unknown error',
                        type: attrs.failure.cause?.message || 'Unknown',
                    } : undefined,
                });
            }

            // Activity events - track lifecycle
            if (event.activityTaskScheduledEventAttributes) {
                const attrs = event.activityTaskScheduledEventAttributes;
                const activityId = attrs.activityId || `activity-${event.eventId}`;

                const activityEvent: TimelineEvent = {
                    id: activityId,
                    type: 'activity',
                    name: attrs.activityType?.name || 'Unknown Activity',
                    status: 'scheduled',
                    startTime: timestamp,
                    details: {
                        taskQueue: attrs.taskQueue?.name,
                        input: attrs.input,
                    },
                };
                activityMap.set(activityId, activityEvent);
            }

            if (event.activityTaskStartedEventAttributes) {
                const attrs = event.activityTaskStartedEventAttributes;

                // Find the corresponding scheduled event and update it
                for (const activity of activityMap.values()) {
                    if (activity.status === 'scheduled') {
                        activity.status = 'started';
                        activity.attempt = attrs.attempt ?? undefined;
                        break;
                    }
                }
            }

            if (event.activityTaskCompletedEventAttributes) {
                const attrs = event.activityTaskCompletedEventAttributes;

                // Find the activity and mark as completed
                for (const [id, activity] of activityMap) {
                    if (activity.status === 'started') {
                        activity.status = 'completed';
                        activity.endTime = timestamp;
                        activity.durationMs = timestamp.getTime() - activity.startTime.getTime();
                        activity.details = {
                            ...activity.details,
                            result: attrs.result,
                        };
                        events.push({ ...activity });
                        activityMap.delete(id);
                        break;
                    }
                }
            }

            if (event.activityTaskFailedEventAttributes) {
                const attrs = event.activityTaskFailedEventAttributes;

                // Find the activity and mark as failed
                for (const [id, activity] of activityMap) {
                    if (activity.status === 'started' || activity.status === 'scheduled') {
                        activity.status = 'failed';
                        activity.endTime = timestamp;
                        activity.durationMs = timestamp.getTime() - activity.startTime.getTime();
                        activity.error = attrs.failure ? {
                            message: attrs.failure.message || 'Activity failed',
                            type: attrs.failure.cause?.message || 'Unknown',
                        } : undefined;
                        events.push({ ...activity });
                        activityMap.delete(id);
                        break;
                    }
                }
            }

            if (event.activityTaskTimedOutEventAttributes) {
                // Find the activity and mark as timed out
                for (const [id, activity] of activityMap) {
                    if (activity.status === 'started' || activity.status === 'scheduled') {
                        activity.status = 'timedOut';
                        activity.endTime = timestamp;
                        activity.durationMs = timestamp.getTime() - activity.startTime.getTime();
                        events.push({ ...activity });
                        activityMap.delete(id);
                        break;
                    }
                }
            }

            // Timer events
            if (event.timerStartedEventAttributes) {
                const attrs = event.timerStartedEventAttributes;
                events.push({
                    id: `timer-${attrs.timerId}`,
                    type: 'timer',
                    name: `Timer ${attrs.timerId}`,
                    status: 'started',
                    startTime: timestamp,
                });
            }

            if (event.timerFiredEventAttributes) {
                const attrs = event.timerFiredEventAttributes;
                events.push({
                    id: `timer-fired-${attrs.timerId}`,
                    type: 'timer',
                    name: `Timer ${attrs.timerId} Fired`,
                    status: 'completed',
                    startTime: timestamp,
                });
            }
        }

        // Add any remaining in-progress activities
        for (const activity of activityMap.values()) {
            events.push(activity);
        }

        // Sort events by start time
        events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        return {
            workflowId: description.workflowId,
            runId: description.runId,
            status: mapWorkflowStatus(description.status.name),
            startTime: description.startTime,
            closeTime: description.closeTime || undefined,
            totalDurationMs: description.closeTime
                ? description.closeTime.getTime() - description.startTime.getTime()
                : undefined,
            events,
        };
    } catch (error) {
        console.error(`Failed to get workflow timeline for ${workflowId}:`, error);
        return null;
    }
}

// =============================================================================
// Helpers
// =============================================================================

function mapWorkflowStatus(status: string): ExecutionStatus {
    switch (status) {
        case 'RUNNING':
            return 'RUNNING';
        case 'COMPLETED':
            return 'COMPLETED';
        case 'FAILED':
            return 'FAILED';
        case 'CANCELED':
            return 'CANCELED';
        case 'TERMINATED':
            return 'TERMINATED';
        case 'CONTINUED_AS_NEW':
            return 'CONTINUED_AS_NEW';
        case 'TIMED_OUT':
            return 'TIMED_OUT';
        default:
            return 'UNKNOWN';
    }
}

/**
 * Get a friendly status label and color
 */
export function getStatusDisplay(status: ExecutionStatus): { label: string; color: string } {
    switch (status) {
        case 'RUNNING':
            return { label: 'Running', color: 'blue' };
        case 'COMPLETED':
            return { label: 'Completed', color: 'green' };
        case 'FAILED':
            return { label: 'Failed', color: 'red' };
        case 'CANCELED':
            return { label: 'Canceled', color: 'gray' };
        case 'TERMINATED':
            return { label: 'Terminated', color: 'orange' };
        case 'CONTINUED_AS_NEW':
            return { label: 'Continued', color: 'purple' };
        case 'TIMED_OUT':
            return { label: 'Timed Out', color: 'red' };
        default:
            return { label: 'Unknown', color: 'gray' };
    }
}

// =============================================================================
// Schedule Management
// =============================================================================

export interface ScheduleSpec {
    /** Cron expression (e.g., "0 9 * * 1-5" for 9 AM weekdays) */
    cron?: string;
    /** Interval in seconds */
    intervalSeconds?: number;
}

export interface ScheduleInfo {
    scheduleId: string;
    workflowType: string;
    taskQueue: string;
    spec: ScheduleSpec;
    isPaused: boolean;
    nextRunTime?: Date;
    lastRunTime?: Date;
    memo?: Record<string, unknown>;
}

/**
 * Generate schedule ID from workflow ID
 */
export function getScheduleId(workflowId: string): string {
    return `twiddle-${workflowId}`;
}

/**
 * Create a Temporal Schedule for a workflow
 */
export async function createSchedule(
    workflowId: string,
    workflowType: string,
    taskQueue: string,
    spec: ScheduleSpec,
    workflowArgs?: unknown[],
    memo?: Record<string, unknown>,
): Promise<void> {
    const client = await getTemporalClient();
    const scheduleId = getScheduleId(workflowId);

    // Build schedule spec
    const scheduleSpec: { intervals?: { every: number }[]; cronExpressions?: string[] } = {};

    if (spec.cron) {
        scheduleSpec.cronExpressions = [spec.cron];
    } else if (spec.intervalSeconds) {
        scheduleSpec.intervals = [{ every: spec.intervalSeconds * 1000 }]; // milliseconds
    }

    try {
        await client.schedule.create({
            scheduleId,
            spec: scheduleSpec,
            action: {
                type: 'startWorkflow',
                workflowType,
                taskQueue,
                args: workflowArgs || [{}],
            },
            memo,
        });
        console.log(`Created schedule ${scheduleId} for workflow type ${workflowType}`);
    } catch (error) {
        // Check if schedule already exists
        if ((error as Error).message?.includes('already exists')) {
            console.log(`Schedule ${scheduleId} already exists, updating instead`);
            await updateSchedule(workflowId, spec);
        } else {
            throw error;
        }
    }
}

/**
 * Update an existing Temporal Schedule
 */
export async function updateSchedule(
    workflowId: string,
    spec: ScheduleSpec,
): Promise<void> {
    const client = await getTemporalClient();
    const scheduleId = getScheduleId(workflowId);

    try {
        const handle = client.schedule.getHandle(scheduleId);

        await handle.update((previous) => {
            // Build new spec based on schedule type
            const newSpec: Record<string, unknown> = { ...previous.spec };

            if (spec.cron) {
                // Use cronExpressions for cron-based schedules
                newSpec.cronExpressions = [spec.cron];
                newSpec.intervals = undefined;
            } else if (spec.intervalSeconds) {
                // Use intervals for interval-based schedules
                newSpec.intervals = [{ every: spec.intervalSeconds * 1000, offset: 0 }];
                newSpec.cronExpressions = undefined;
            }

            return {
                ...previous,
                spec: newSpec,
            };
        });

        console.log(`Updated schedule ${scheduleId}`);
    } catch (error) {
        console.error(`Failed to update schedule ${scheduleId}:`, error);
        throw error;
    }
}

/**
 * Delete a Temporal Schedule
 */
export async function deleteSchedule(workflowId: string): Promise<void> {
    const client = await getTemporalClient();
    const scheduleId = getScheduleId(workflowId);

    try {
        const handle = client.schedule.getHandle(scheduleId);
        await handle.delete();
        console.log(`Deleted schedule ${scheduleId}`);
    } catch (error) {
        // Ignore if schedule doesn't exist
        if ((error as Error).message?.includes('not found')) {
            console.log(`Schedule ${scheduleId} not found, nothing to delete`);
        } else {
            console.error(`Failed to delete schedule ${scheduleId}:`, error);
            throw error;
        }
    }
}

/**
 * Pause a Temporal Schedule
 */
export async function pauseSchedule(workflowId: string): Promise<void> {
    const client = await getTemporalClient();
    const scheduleId = getScheduleId(workflowId);

    try {
        const handle = client.schedule.getHandle(scheduleId);
        await handle.pause('Paused by Twiddle');
        console.log(`Paused schedule ${scheduleId}`);
    } catch (error) {
        console.error(`Failed to pause schedule ${scheduleId}:`, error);
        throw error;
    }
}

/**
 * Resume a Temporal Schedule
 */
export async function resumeSchedule(workflowId: string): Promise<void> {
    const client = await getTemporalClient();
    const scheduleId = getScheduleId(workflowId);

    try {
        const handle = client.schedule.getHandle(scheduleId);
        await handle.unpause();
        console.log(`Resumed schedule ${scheduleId}`);
    } catch (error) {
        console.error(`Failed to resume schedule ${scheduleId}:`, error);
        throw error;
    }
}

/**
 * Get information about a specific schedule
 */
export async function getSchedule(workflowId: string): Promise<ScheduleInfo | null> {
    const client = await getTemporalClient();
    const scheduleId = getScheduleId(workflowId);

    try {
        const handle = client.schedule.getHandle(scheduleId);
        const description = await handle.describe();

        const spec: ScheduleSpec = {};
        // Access spec at top level, use intervals array
        if (description.spec.intervals?.length) {
            spec.intervalSeconds = Math.floor(description.spec.intervals[0].every / 1000);
        }
        // Calendars represent cron-like schedules in description form

        return {
            scheduleId,
            workflowType: description.action.workflowType || 'Unknown',
            taskQueue: description.action.taskQueue || 'Unknown',
            spec,
            isPaused: description.state.paused,
            nextRunTime: description.info.nextActionTimes?.[0],
            lastRunTime: description.info.recentActions?.[0]?.takenAt,
            memo: description.memo,
        };
    } catch (error) {
        if ((error as Error).message?.includes('not found')) {
            return null;
        }
        throw error;
    }
}

/**
 * List all Twiddle schedules
 */
export async function listSchedules(): Promise<ScheduleInfo[]> {
    const client = await getTemporalClient();
    const schedules: ScheduleInfo[] = [];

    try {
        for await (const schedule of client.schedule.list()) {
            // Only include Twiddle schedules
            if (!schedule.scheduleId.startsWith('twiddle-')) {
                continue;
            }

            const spec: ScheduleSpec = {};
            // ScheduleSummary uses intervals, not cronExpressions
            if (schedule.spec?.intervals?.length) {
                spec.intervalSeconds = Math.floor(schedule.spec.intervals[0].every / 1000);
            }

            schedules.push({
                scheduleId: schedule.scheduleId,
                workflowType: schedule.action?.workflowType || 'Unknown',
                taskQueue: 'Unknown', // taskQueue not available in ScheduleSummary
                spec,
                isPaused: schedule.state?.paused || false,
                nextRunTime: schedule.info?.nextActionTimes?.[0],
                lastRunTime: schedule.info?.recentActions?.[0]?.takenAt,
                memo: schedule.memo,
            });
        }

        return schedules;
    } catch (error) {
        console.error('Failed to list schedules:', error);
        throw error;
    }
}

/**
 * Check if a schedule exists for a workflow
 */
export async function scheduleExists(workflowId: string): Promise<boolean> {
    const schedule = await getSchedule(workflowId);
    return schedule !== null;
}
