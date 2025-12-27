/**
 * Temporal Adapter
 * 
 * Converts Twiddle IR to Temporal-specific data model for code generation.
 */

import type {
    TwiddleWorkflowIR,
    TwiddleNode,
    TwiddleConnection,
    ActivityOptions,
} from '../ir/index.js';

/**
 * Temporal-specific activity representation
 */
export interface TemporalActivity {
    /** Activity function name */
    functionName: string;
    /** Original node ID */
    nodeId: string;
    /** Display name */
    name: string;
    /** Node type */
    nodeType: string;
    /** Parameters for the activity */
    parameters: Record<string, unknown>;
    /** Credentials if any */
    credentials?: Record<string, unknown>;
    /** Temporal activity options */
    options: {
        startToCloseTimeout: number;
        scheduleToCloseTimeout?: number;
        heartbeatTimeout?: number;
        retryPolicy?: {
            maximumAttempts?: number;
            initialInterval?: number;
            backoffCoefficient?: number;
            maximumInterval?: number;
        };
    };
    /** Continue on fail */
    continueOnFail: boolean;
}

/**
 * Temporal workflow model for code generation
 */
export interface TemporalWorkflow {
    /** Workflow class name */
    className: string;
    /** Workflow function name */
    functionName: string;
    /** Task queue name */
    taskQueue: string;
    /** Workflow description */
    description?: string;
    /** Workflow timeout in seconds */
    timeoutSeconds?: number;
    /** Activities in execution order */
    activities: TemporalActivity[];
    /** Execution DAG */
    executionOrder: ExecutionStep[];
}

/**
 * A step in the execution order
 */
export interface ExecutionStep {
    /** Activity to execute */
    activityId: string;
    /** Dependencies (must complete before this step) */
    dependsOn: string[];
    /** Condition for conditional execution */
    condition?: string;
}

/**
 * Trigger node types that are not activities
 */
const TRIGGER_TYPES = new Set([
    'twiddle.manualTrigger',
    'twiddle.webhook',
    'twiddle.interval',
]);

/**
 * Convert workflow name to Python class name
 */
function toClassName(name: string): string {
    return name
        .split(/[^a-zA-Z0-9]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('') + 'Workflow';
}

/**
 * Convert workflow name to function name
 */
function toFunctionName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/^(\d)/, '_$1') || 'workflow';
}

/**
 * Convert node type to activity function name
 */
function nodeTypeToFunctionName(nodeType: string): string {
    const parts = nodeType.split('.');
    const name = parts[parts.length - 1];
    return `execute_${name.toLowerCase()}`;
}

/**
 * Parse ISO 8601 duration to seconds
 */
function durationToSeconds(duration?: string): number | undefined {
    if (!duration) return undefined;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return undefined;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Convert IR activity options to Temporal options
 */
function convertActivityOptions(options?: ActivityOptions): TemporalActivity['options'] {
    return {
        startToCloseTimeout: options?.startToCloseTimeout || 300, // Default 5 minutes
        scheduleToCloseTimeout: options?.scheduleToCloseTimeout,
        heartbeatTimeout: options?.heartbeatTimeout,
        retryPolicy: options?.retryPolicy ? {
            maximumAttempts: options.retryPolicy.maxAttempts,
            initialInterval: durationToSeconds(options.retryPolicy.initialInterval),
            backoffCoefficient: options.retryPolicy.backoffCoefficient,
            maximumInterval: durationToSeconds(options.retryPolicy.maxInterval),
        } : undefined,
    };
}

/**
 * Convert IR node to Temporal activity
 */
function nodeToActivity(node: TwiddleNode): TemporalActivity {
    return {
        functionName: nodeTypeToFunctionName(node.type),
        nodeId: node.id,
        name: node.name,
        nodeType: node.type,
        parameters: node.parameters || {},
        credentials: node.credentials,
        options: convertActivityOptions(node.activityOptions),
        continueOnFail: node.activityOptions?.continueOnFail || false,
    };
}

/**
 * Build execution order from connections using topological sort
 */
function buildExecutionOrder(
    nodes: TwiddleNode[],
    connections: TwiddleConnection[]
): ExecutionStep[] {
    // Build dependency graph
    const dependencies = new Map<string, string[]>();
    const conditions = new Map<string, string>();

    // Initialize all activity nodes
    for (const node of nodes) {
        if (!TRIGGER_TYPES.has(node.type)) {
            dependencies.set(node.id, []);
        }
    }

    // Add dependencies from connections
    for (const conn of connections) {
        // Skip connections from triggers
        const sourceNode = nodes.find(n => n.id === conn.source);
        if (sourceNode && TRIGGER_TYPES.has(sourceNode.type)) {
            continue;
        }

        // Add dependency
        const deps = dependencies.get(conn.target);
        if (deps && !deps.includes(conn.source)) {
            deps.push(conn.source);
        }

        // Store condition if present
        if (conn.condition) {
            conditions.set(conn.target, conn.condition);
        }
    }

    // Topological sort
    const result: ExecutionStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    function visit(nodeId: string): void {
        if (visited.has(nodeId)) return;
        if (visiting.has(nodeId)) {
            throw new Error(`Circular dependency detected at node ${nodeId}`);
        }

        visiting.add(nodeId);

        const deps = dependencies.get(nodeId) || [];
        for (const dep of deps) {
            visit(dep);
        }

        visiting.delete(nodeId);
        visited.add(nodeId);

        result.push({
            activityId: nodeId,
            dependsOn: deps,
            condition: conditions.get(nodeId),
        });
    }

    for (const nodeId of dependencies.keys()) {
        visit(nodeId);
    }

    return result;
}

/**
 * Convert Twiddle IR to Temporal workflow model
 * 
 * @param ir - Twiddle Workflow IR
 * @returns Temporal workflow model
 */
export function irToTemporal(ir: TwiddleWorkflowIR): TemporalWorkflow {
    // Filter out trigger nodes
    const activityNodes = ir.nodes.filter(n => !TRIGGER_TYPES.has(n.type));

    // Convert nodes to activities
    const activities = activityNodes.map(nodeToActivity);

    // Build execution order
    const executionOrder = buildExecutionOrder(ir.nodes, ir.connections);

    // Generate task queue from workflow name if not specified
    const taskQueue = ir.workflow.taskQueue ||
        ir.workflow.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    return {
        className: toClassName(ir.workflow.name),
        functionName: toFunctionName(ir.workflow.name),
        taskQueue,
        description: ir.workflow.description,
        timeoutSeconds: durationToSeconds(ir.workflow.timeout),
        activities,
        executionOrder,
    };
}
