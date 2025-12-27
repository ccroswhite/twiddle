/**
 * Twiddle IR Module
 * 
 * Exports all IR types, validation, and utilities.
 */

// Types - use `export type` for types with isolatedModules
export type {
    Position,
    RetryPolicy,
    ActivityOptions,
    NodeHints,
    TwiddleNode,
    TwiddleConnection,
    WorkflowMetadata,
    WorkflowInput,
    TwiddleWorkflowIR,
} from './types.js';

// Type constants and functions (these are values, not just types)
export {
    NODE_TYPES,
    TRIGGER_NODE_TYPES,
    isActivityNode,
    IR_VERSION,
} from './types.js';

// Validation - types
export type {
    ValidationResult,
    ValidationError,
} from './validator.js';

// Validation - functions
export {
    validateIR,
    validateSemantics,
    validateFull,
    assertValidIR,
    isTwiddleWorkflowIR,
} from './validator.js';

// Serialization - types
export type {
    WorkflowDBModel,
} from './serializer.js';

// Serialization - functions
export {
    workflowToIR,
    irToWorkflow,
    createMinimalIR,
} from './serializer.js';
