/**
 * Utility functions for Python code generation
 */

// Trigger nodes are not activities - they start workflows
const TRIGGER_NODE_TYPES = new Set([
    'twiddle.manualTrigger',
    'twiddle.webhook',
    'twiddle.interval',
]);

/**
 * Check if a node type is an activity (not a trigger)
 */
export function isActivityNode(nodeType: string): boolean {
    return !TRIGGER_NODE_TYPES.has(nodeType);
}

/**
 * Convert workflow name to valid Python identifier
 */
export function toPythonIdentifier(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/^(\d)/, '_$1') || 'workflow';
}

/**
 * Convert node type to Python function name
 */
export function nodeTypeToFunctionName(nodeType: string): string {
    const parts = nodeType.split('.');
    const name = parts[parts.length - 1];
    return `execute_${name.toLowerCase()}`;
}

/**
 * Convert a JavaScript value to a Python literal string
 */
export function toPythonValue(value: unknown): string {
    if (value === null || value === undefined) {
        return 'None';
    }
    if (typeof value === 'boolean') {
        return value ? 'True' : 'False';
    }
    if (typeof value === 'number') {
        return String(value);
    }
    if (typeof value === 'string') {
        // Handle multi-line strings and escape characters
        if (value.includes('\n') || value.includes("'") && value.includes('"')) {
            // Use triple quotes for complex strings
            const escaped = value.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
            return `"""${escaped}"""`;
        }
        // Use single quotes with proper escaping
        const escaped = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        return `'${escaped}'`;
    }
    if (Array.isArray(value)) {
        const items = value.map(item => toPythonValue(item)).join(', ');
        return `[${items}]`;
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .map(([k, v]) => `'${k}': ${toPythonValue(v)}`)
            .join(', ');
        return `{${entries}}`;
    }
    return String(value);
}
