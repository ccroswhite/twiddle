/**
 * Core workflow types for Twiddle
 */

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  parameters: Record<string, unknown>;
  credentials?: Record<string, string>;
  disabled?: boolean;
  notes?: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  continueOnFail?: boolean;
}

export interface WorkflowConnection {
  sourceNodeId: string;
  sourceOutput: string;
  targetNodeId: string;
  targetInput: string;
}

export interface WorkflowSettings {
  executionTimeout?: number;
  saveExecutionProgress?: boolean;
  saveManualExecutions?: boolean;
  callerPolicy?: 'any' | 'none' | 'workflowsFromSameOwner';
  timezone?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: WorkflowSettings;
  active: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: WorkflowSettings;
  tags?: string[];
}

export interface WorkflowUpdateInput {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: WorkflowSettings;
  active?: boolean;
  tags?: string[];
}
