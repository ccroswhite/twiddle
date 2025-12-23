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
  // Temporal Activity Options
  startToCloseTimeout?: number;      // Maximum time for a single activity execution attempt (seconds)
  scheduleToCloseTimeout?: number;   // Total time including retries (seconds, 0 = unlimited)
  retryOnFail?: boolean;             // Whether to retry on failure (default: true)
  maxRetries?: number;               // Maximum number of retry attempts
  retryInterval?: number;            // Initial retry interval (seconds)
  backoffCoefficient?: number;       // Multiplier for retry interval between attempts
  continueOnFail?: boolean;          // Continue workflow even if activity fails after all retries
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
  properties?: Array<{
    id: string;
    key: string;
    type: 'number' | 'boolean' | 'string' | 'array';
    value: string;
  }>;
  schedule?: {
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
  };
}

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: WorkflowSettings;
  tags?: string[];
  properties?: Array<{
    id: string;
    key: string;
    type: 'number' | 'boolean' | 'string' | 'array';
    value: string;
  }>;
  schedule?: {
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
  };
}

export interface WorkflowUpdateInput {
  name?: string;
  description?: string;
  nodes?: WorkflowNode[];
  connections?: WorkflowConnection[];
  settings?: WorkflowSettings;
  active?: boolean;
  tags?: string[];
  properties?: Array<{
    id: string;
    key: string;
    type: 'number' | 'boolean' | 'string' | 'array';
    value: string;
  }>;
  schedule?: {
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
  };
}
