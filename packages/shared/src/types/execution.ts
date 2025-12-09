/**
 * Workflow execution types for Twiddle
 */

export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting';

export interface NodeExecutionResult {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  data?: unknown;
  error?: ExecutionError;
  retryCount?: number;
}

export interface ExecutionError {
  message: string;
  stack?: string;
  code?: string;
  nodeId?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  temporalWorkflowId: string;
  temporalRunId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: Date;
  finishedAt?: Date;
  nodeResults: NodeExecutionResult[];
  inputData?: unknown;
  outputData?: unknown;
  error?: ExecutionError;
  retryOf?: string;
  retriedBy?: string[];
}

export type ExecutionMode = 'manual' | 'trigger' | 'webhook' | 'retry' | 'scheduled';

export interface ExecutionStartInput {
  workflowId: string;
  mode: ExecutionMode;
  inputData?: unknown;
  startNodes?: string[];
}

export interface ExecutionListFilter {
  workflowId?: string;
  status?: ExecutionStatus[];
  mode?: ExecutionMode[];
  startedAfter?: Date;
  startedBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface ExecutionListResult {
  executions: WorkflowExecution[];
  total: number;
  hasMore: boolean;
}
