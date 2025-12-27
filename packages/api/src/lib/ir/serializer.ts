/**
 * Twiddle IR Serializer
 * 
 * Converts workflows between database models and IR format.
 */

import type {
    TwiddleWorkflowIR,
    TwiddleNode,
    TwiddleConnection,
    WorkflowMetadata,
    ActivityOptions,
    RetryPolicy,
} from './types.js';
import { IR_VERSION } from './types.js';

/**
 * Database workflow model (from Prisma)
 */
export interface WorkflowDBModel {
    id: string;
    name: string;
    description?: string | null;
    nodes: unknown;
    connections: unknown;
    settings?: unknown;
    tags?: string[];
}

/**
 * Raw node from database
 */
interface RawNode {
    id: string;
    type: string;
    name?: string;
    position?: { x: number; y: number };
    data?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    // Activity options
    startToCloseTimeout?: number;
    scheduleToCloseTimeout?: number;
    heartbeatTimeout?: number;
    retryOnFail?: boolean;
    maxRetries?: number;
    retryInterval?: number;
    backoffCoefficient?: number;
    continueOnFail?: boolean;
}

/**
 * Raw connection from database
 */
interface RawConnection {
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    data?: {
        condition?: string;
    };
}

/**
 * Convert a raw node to IR format
 */
function convertNode(raw: RawNode): TwiddleNode {
    const node: TwiddleNode = {
        id: raw.id,
        type: raw.type,
        name: raw.name || raw.data?.name as string || raw.type,
        position: raw.position,
        parameters: raw.parameters || raw.data || {},
        credentials: raw.credentials,
    };

    // Convert activity options if present
    const hasActivityOptions =
        raw.startToCloseTimeout !== undefined ||
        raw.scheduleToCloseTimeout !== undefined ||
        raw.heartbeatTimeout !== undefined ||
        raw.retryOnFail !== undefined ||
        raw.maxRetries !== undefined ||
        raw.continueOnFail !== undefined;

    if (hasActivityOptions) {
        const retryPolicy: RetryPolicy | undefined = raw.maxRetries
            ? {
                maxAttempts: raw.maxRetries,
                backoffCoefficient: raw.backoffCoefficient,
                initialInterval: raw.retryInterval ? `PT${raw.retryInterval}S` : undefined,
            }
            : undefined;

        const activityOptions: ActivityOptions = {
            startToCloseTimeout: raw.startToCloseTimeout,
            scheduleToCloseTimeout: raw.scheduleToCloseTimeout,
            heartbeatTimeout: raw.heartbeatTimeout,
            continueOnFail: raw.continueOnFail,
            retryPolicy,
        };

        // Only add if has values
        if (Object.values(activityOptions).some((v) => v !== undefined)) {
            node.activityOptions = activityOptions;
        }
    }

    return node;
}

/**
 * Convert a raw connection to IR format
 */
function convertConnection(raw: RawConnection): TwiddleConnection {
    return {
        source: raw.source,
        target: raw.target,
        sourceHandle: raw.sourceHandle,
        targetHandle: raw.targetHandle,
        condition: raw.data?.condition,
    };
}

/**
 * Convert workflow settings to metadata
 */
function extractMetadata(
    workflow: WorkflowDBModel,
    settings?: Record<string, unknown>
): WorkflowMetadata {
    const metadata: WorkflowMetadata = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || undefined,
        tags: workflow.tags,
    };

    if (settings) {
        if (typeof settings.taskQueue === 'string') {
            metadata.taskQueue = settings.taskQueue;
        }
        if (typeof settings.timeout === 'string') {
            metadata.timeout = settings.timeout;
        }
        if (settings.retryPolicy && typeof settings.retryPolicy === 'object') {
            metadata.retryPolicy = settings.retryPolicy as RetryPolicy;
        }
    }

    return metadata;
}

/**
 * Convert a database workflow model to IR
 * 
 * @param workflow - Database workflow model
 * @returns Twiddle Workflow IR
 */
export function workflowToIR(workflow: WorkflowDBModel): TwiddleWorkflowIR {
    const rawNodes = (workflow.nodes as RawNode[]) || [];
    const rawConnections = (workflow.connections as RawConnection[]) || [];
    const settings = (workflow.settings || {}) as Record<string, unknown>;

    return {
        version: IR_VERSION,
        workflow: extractMetadata(workflow, settings),
        nodes: rawNodes.map(convertNode),
        connections: rawConnections.map(convertConnection),
    };
}

/**
 * Convert IR back to database format
 * 
 * @param ir - Twiddle Workflow IR
 * @returns Database-compatible format
 */
export function irToWorkflow(ir: TwiddleWorkflowIR): {
    name: string;
    description?: string;
    nodes: unknown[];
    connections: unknown[];
    settings: Record<string, unknown>;
    tags: string[];
} {
    // Convert IR nodes back to raw format
    const nodes = ir.nodes.map((node) => ({
        id: node.id,
        type: node.type,
        name: node.name,
        position: node.position || { x: 0, y: 0 },
        data: {
            name: node.name,
            ...node.parameters,
        },
        parameters: node.parameters,
        credentials: node.credentials,
        // Flatten activity options
        ...(node.activityOptions?.startToCloseTimeout && {
            startToCloseTimeout: node.activityOptions.startToCloseTimeout,
        }),
        ...(node.activityOptions?.scheduleToCloseTimeout && {
            scheduleToCloseTimeout: node.activityOptions.scheduleToCloseTimeout,
        }),
        ...(node.activityOptions?.continueOnFail && {
            continueOnFail: node.activityOptions.continueOnFail,
        }),
        ...(node.activityOptions?.retryPolicy?.maxAttempts && {
            maxRetries: node.activityOptions.retryPolicy.maxAttempts,
        }),
        ...(node.activityOptions?.retryPolicy?.backoffCoefficient && {
            backoffCoefficient: node.activityOptions.retryPolicy.backoffCoefficient,
        }),
    }));

    // Convert IR connections back to raw format
    const connections = ir.connections.map((conn) => ({
        source: conn.source,
        target: conn.target,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
        ...(conn.condition && { data: { condition: conn.condition } }),
    }));

    // Extract settings from workflow metadata
    const settings: Record<string, unknown> = {};
    if (ir.workflow.taskQueue) {
        settings.taskQueue = ir.workflow.taskQueue;
    }
    if (ir.workflow.timeout) {
        settings.timeout = ir.workflow.timeout;
    }
    if (ir.workflow.retryPolicy) {
        settings.retryPolicy = ir.workflow.retryPolicy;
    }

    return {
        name: ir.workflow.name,
        description: ir.workflow.description,
        nodes,
        connections,
        settings,
        tags: ir.workflow.tags || [],
    };
}

/**
 * Create a minimal IR from basic workflow data
 * (for use when only basic info is available)
 */
export function createMinimalIR(
    id: string,
    name: string,
    nodes: unknown[],
    connections: unknown[],
    description?: string
): TwiddleWorkflowIR {
    return workflowToIR({
        id,
        name,
        description,
        nodes,
        connections,
    });
}
