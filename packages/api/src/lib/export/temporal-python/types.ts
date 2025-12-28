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

export interface WorkflowData {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
}

/**
 * Generated Python code for database storage
 */
export interface GeneratedPythonCode {
    pythonWorkflow: string;
    pythonActivities: string;
    pythonRequirements: string;
}
