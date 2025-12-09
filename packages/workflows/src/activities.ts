/**
 * Activity type definitions for Temporal workflows
 * Actual implementations are in the worker package
 */
import type { WorkflowNode } from '@twiddle/shared';

export interface ExecuteNodeInput {
  node: WorkflowNode;
  inputData: unknown;
  credentials?: Record<string, string>;
}

export interface ExecuteNodeOutput {
  data: unknown;
  binary?: Record<string, unknown>;
}

// Activity function signatures (implementations in worker)
export async function executeNode(_input: ExecuteNodeInput): Promise<unknown> {
  throw new Error('This is a type stub - actual implementation is in the worker');
}

export async function evaluateCondition(
  _conditions: unknown,
  _data: unknown,
): Promise<{ branch: 'true' | 'false' }> {
  throw new Error('This is a type stub - actual implementation is in the worker');
}
