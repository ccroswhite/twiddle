/**
 * Code execution activity implementation
 */
import type { WorkflowNode } from '@twiddle/shared';

interface CodeParams {
  mode?: 'runOnceForAllItems' | 'runOnceForEachItem';
  code?: string;
}

/**
 * Execute custom JavaScript code
 * Note: In production, this should use a sandboxed environment
 */
export async function executeCode(
  node: WorkflowNode,
  inputData: unknown,
): Promise<unknown> {
  const params = node.parameters as CodeParams;
  const code = params.code || 'return $input;';

  // Create a sandboxed execution context
  const context = {
    $input: {
      all: () => inputData,
      first: () => (Array.isArray(inputData) ? inputData[0] : inputData),
      last: () => (Array.isArray(inputData) ? inputData[inputData.length - 1] : inputData),
      item: inputData,
    },
    $json: inputData,
    console: {
      log: (...args: unknown[]) => console.log('[Code Node]', ...args),
      warn: (...args: unknown[]) => console.warn('[Code Node]', ...args),
      error: (...args: unknown[]) => console.error('[Code Node]', ...args),
    },
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    Promise,
  };

  try {
    // Create async function from code
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const fn = new AsyncFunction(
      ...Object.keys(context),
      `"use strict";\n${code}`,
    );

    // Execute the function
    const result = await fn(...Object.values(context));
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Code execution failed: ${message}`);
  }
}
