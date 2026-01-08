/**
 * Types for Python/Temporal export generation
 */

export interface WorkflowNode {
    id: string;
    type: string;
    name: string;
    parameters: Record<string, unknown>;
    position: { x: number; y: number };
    credentials?: Record<string, unknown>;
    // Temporal Activity Options
    startToCloseTimeout?: number;
    scheduleToCloseTimeout?: number;
    retryOnFail?: boolean;
    maxRetries?: number;
    retryInterval?: number;
    backoffCoefficient?: number;
    continueOnFail?: boolean;
}

export interface WorkflowConnection {
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

/**
 * Workflow schedule configuration for Temporal Schedules.
 */
export interface WorkflowSchedule {
    enabled: boolean;
    mode: 'simple' | 'cron';
    simple?: {
        frequency: 'minutes' | 'hours' | 'daily' | 'weekly' | 'monthly';
        interval?: number;
        time?: string;
        daysOfWeek?: number[];
        dayOfMonth?: number;
        timezone?: string;
    };
    cron?: string;
}

export interface WorkflowData {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    schedule?: WorkflowSchedule;
}

/**
 * Generated Python code for database storage
 */
export interface GeneratedPythonCode {
    pythonWorkflow: string;
    pythonActivities: string;
    pythonRequirements: string;
}

/**
 * Trigger nodes are not activities - they start workflows.
 */
export const TRIGGER_NODE_TYPES = new Set([
    'twiddle.manualTrigger',
    'twiddle.webhook',
    'twiddle.interval',
]);

/**
 * Check if a node type is an activity (not a trigger).
 */
export function isActivityNode(nodeType: string): boolean {
    return !TRIGGER_NODE_TYPES.has(nodeType);
}
