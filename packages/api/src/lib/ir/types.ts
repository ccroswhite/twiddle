/**
 * Twiddle Workflow IR Types
 * 
 * TypeScript interfaces for the Twiddle Intermediate Representation.
 * These types match the JSON Schema at schemas/twiddle-workflow-ir.schema.json
 */

/**
 * Position of a node in the visual editor
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Retry policy for activities and workflows
 */
export interface RetryPolicy {
    /** Maximum retry attempts */
    maxAttempts?: number;
    /** Initial retry interval (ISO 8601 duration, e.g., "PT1S") */
    initialInterval?: string;
    /** Backoff multiplier (must be >= 1) */
    backoffCoefficient?: number;
    /** Maximum retry interval (ISO 8601 duration) */
    maxInterval?: string;
}

/**
 * Activity-specific execution options
 */
export interface ActivityOptions {
    /** Activity timeout in seconds */
    startToCloseTimeout?: number;
    /** Total time from scheduling to completion in seconds */
    scheduleToCloseTimeout?: number;
    /** Heartbeat timeout in seconds */
    heartbeatTimeout?: number;
    /** Retry policy for this activity */
    retryPolicy?: RetryPolicy;
    /** Continue workflow on activity failure */
    continueOnFail?: boolean;
}

/**
 * UI display hints for a node
 */
export interface NodeHints {
    /** Icon name for UI display */
    icon?: string;
    /** Category for grouping in the activity palette */
    category?: string;
    /** Display color */
    color?: string;
}

/**
 * A node in the workflow graph
 */
export interface TwiddleNode {
    /** Unique node identifier */
    id: string;
    /** Node type (e.g., 'twiddle.httpRequest', 'twiddle.runScript') */
    type: string;
    /** Human-readable node name */
    name: string;
    /** Position in the visual editor */
    position?: Position;
    /** Node-specific parameters */
    parameters?: Record<string, unknown>;
    /** Credential references */
    credentials?: Record<string, unknown>;
    /** Activity execution options */
    activityOptions?: ActivityOptions;
    /** UI display hints */
    hints?: NodeHints;
}

/**
 * A connection between two nodes
 */
export interface TwiddleConnection {
    /** Source node ID */
    source: string;
    /** Target node ID */
    target: string;
    /** Output handle on source node */
    sourceHandle?: string;
    /** Input handle on target node */
    targetHandle?: string;
    /** Conditional expression for branching */
    condition?: string;
}

/**
 * Workflow-level metadata
 */
export interface WorkflowMetadata {
    /** Unique workflow identifier */
    id: string;
    /** Human-readable workflow name */
    name: string;
    /** Workflow description */
    description?: string;
    /** Task queue name (Temporal) or DAG ID prefix (Airflow) */
    taskQueue?: string;
    /** Workflow timeout (ISO 8601 duration, e.g., "PT1H") */
    timeout?: string;
    /** Default retry policy for activities */
    retryPolicy?: RetryPolicy;
    /** Tags for categorization */
    tags?: string[];
}

/**
 * Expected workflow input schema
 */
export interface WorkflowInput {
    /** JSON Schema for input validation */
    schema?: Record<string, unknown>;
}

/**
 * Twiddle Workflow Intermediate Representation
 * 
 * This is the orchestration-agnostic format used internally by Twiddle.
 * It can be exported to various targets:
 * - Temporal Python
 * - Temporal TypeScript
 * - Airflow DAG
 */
export interface TwiddleWorkflowIR {
    /** IR schema version (semver) */
    version: string;
    /** Workflow metadata */
    workflow: WorkflowMetadata;
    /** All nodes in the workflow */
    nodes: TwiddleNode[];
    /** Connections between nodes */
    connections: TwiddleConnection[];
    /** Expected workflow input */
    input?: WorkflowInput;
}

/**
 * Known node types in Twiddle
 */
export const NODE_TYPES = {
    // Triggers (not activities)
    MANUAL_TRIGGER: 'twiddle.manualTrigger',
    WEBHOOK: 'twiddle.webhook',
    INTERVAL: 'twiddle.interval',

    // Activities
    HTTP_REQUEST: 'twiddle.httpRequest',
    RUN_SCRIPT: 'twiddle.runScript',
    PYTHON_CODE: 'twiddle.pythonCode',
    SSH_COMMAND: 'twiddle.sshCommand',
    SEND_EMAIL: 'twiddle.sendEmail',
    SEND_SLACK: 'twiddle.sendSlackMessage',
    DATABASE_QUERY: 'twiddle.database',
    S3_OPERATION: 'twiddle.s3',
    LOG: 'twiddle.log',
    CONDITIONAL: 'twiddle.conditional',
    DELAY: 'twiddle.delay',
} as const;

/**
 * Trigger node types (not activities)
 */
export const TRIGGER_NODE_TYPES: Set<string> = new Set([
    NODE_TYPES.MANUAL_TRIGGER,
    NODE_TYPES.WEBHOOK,
    NODE_TYPES.INTERVAL,
]);

/**
 * Check if a node type is an activity (not a trigger)
 */
export function isActivityNode(nodeType: string): boolean {
    return !TRIGGER_NODE_TYPES.has(nodeType);
}

/**
 * Current IR version
 */
export const IR_VERSION = '1.0.0';
