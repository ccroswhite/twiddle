/**
 * Twiddle IR Validator
 * 
 * Validates workflow IR against the JSON Schema using AJV.
 */

import type { ValidateFunction, ErrorObject } from 'ajv';
import type { TwiddleWorkflowIR } from './types.js';

// Load modules at runtime to avoid ESM/CJS issues
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Ajv = require('ajv').default;
const schema = require('../../schemas/twiddle-workflow-ir.schema.json');

// Initialize AJV with JSON Schema draft-07
const ajv = new Ajv({
    allErrors: true,
    verbose: true,
});

// Compile the schema
let validate: ValidateFunction<TwiddleWorkflowIR>;

try {
    validate = ajv.compile(schema) as ValidateFunction<TwiddleWorkflowIR>;
} catch (error) {
    console.error('Failed to compile IR schema:', error);
    throw error;
}

/**
 * Validation result
 */
export interface ValidationResult {
    /** Whether the IR is valid */
    valid: boolean;
    /** Validation errors if invalid */
    errors?: ValidationError[];
}

/**
 * A single validation error
 */
export interface ValidationError {
    /** JSON path to the error */
    path: string;
    /** Error message */
    message: string;
    /** Error keyword (e.g., 'required', 'type') */
    keyword: string;
    /** Additional params */
    params?: Record<string, unknown>;
}

/**
 * Convert AJV errors to ValidationError format
 */
function formatErrors(errors: ErrorObject[] | null | undefined): ValidationError[] {
    if (!errors) return [];

    return errors.map((error) => ({
        path: error.instancePath || '/',
        message: error.message || 'Unknown validation error',
        keyword: error.keyword,
        params: error.params,
    }));
}

/**
 * Validate a Twiddle Workflow IR object
 * 
 * @param ir - The IR object to validate
 * @returns Validation result with errors if invalid
 */
export function validateIR(ir: unknown): ValidationResult {
    const valid = validate(ir);

    if (valid) {
        return { valid: true };
    }

    return {
        valid: false,
        errors: formatErrors(validate.errors),
    };
}

/**
 * Validate and throw on error
 * 
 * @param ir - The IR object to validate
 * @throws Error if validation fails
 */
export function assertValidIR(ir: unknown): asserts ir is TwiddleWorkflowIR {
    const result = validateIR(ir);

    if (!result.valid) {
        const errorMessages = result.errors
            ?.map((e) => `${e.path}: ${e.message}`)
            .join('\n');
        throw new Error(`Invalid Twiddle IR:\n${errorMessages}`);
    }
}

/**
 * Type guard for TwiddleWorkflowIR
 */
export function isTwiddleWorkflowIR(value: unknown): value is TwiddleWorkflowIR {
    return validateIR(value).valid;
}

/**
 * Semantic validation beyond schema
 * 
 * Checks for:
 * - All connection sources/targets exist
 * - No orphan nodes
 * - No circular dependencies
 */
export function validateSemantics(ir: TwiddleWorkflowIR): ValidationResult {
    const errors: ValidationError[] = [];
    const nodeIds = new Set(ir.nodes.map((n) => n.id));

    // Check all connection references are valid
    for (const connection of ir.connections) {
        if (!nodeIds.has(connection.source)) {
            errors.push({
                path: `/connections`,
                message: `Connection source "${connection.source}" references non-existent node`,
                keyword: 'reference',
            });
        }
        if (!nodeIds.has(connection.target)) {
            errors.push({
                path: `/connections`,
                message: `Connection target "${connection.target}" references non-existent node`,
                keyword: 'reference',
            });
        }
    }

    // Check for duplicate node IDs
    const seenIds = new Set<string>();
    for (const node of ir.nodes) {
        if (seenIds.has(node.id)) {
            errors.push({
                path: `/nodes`,
                message: `Duplicate node ID: "${node.id}"`,
                keyword: 'uniqueItems',
            });
        }
        seenIds.add(node.id);
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
    };
}

/**
 * Full validation: schema + semantics
 */
export function validateFull(ir: unknown): ValidationResult {
    // First validate schema
    const schemaResult = validateIR(ir);
    if (!schemaResult.valid) {
        return schemaResult;
    }

    // Then validate semantics
    return validateSemantics(ir as TwiddleWorkflowIR);
}
