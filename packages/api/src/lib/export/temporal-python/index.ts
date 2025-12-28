/**
 * Python/Temporal Export Generator
 * 
 * Generates standalone Python Temporal applications from Twiddle workflows.
 * This module is organized into focused sub-modules for maintainability.
 * 
 * Directory structure:
 * - types.ts: Type definitions
 * - utils.ts: Utility functions
 * - activity-code/: Activity code generators by node type
 */

// Re-export types
export type { WorkflowNode, WorkflowConnection, WorkflowData, GeneratedPythonCode } from './types.js';

// Re-export utilities
export { isActivityNode, toPythonIdentifier, nodeTypeToFunctionName, toPythonValue } from './utils.js';

// Re-export activity code generator
export { generateActivityCode } from './activity-code/index.js';

// The generator functions remain in the original python-export.ts for now
// They can be further modularized in a future refactoring pass
