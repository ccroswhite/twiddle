/**
 * Validation utility functions
 */

/**
 * Validates a workflow name
 * @param name Workflow name to validate
 * @returns Error message if invalid, null if valid
 */
export function validateWorkflowName(name: string): string | null {
    if (!name || name.trim().length === 0) {
        return 'Workflow name is required';
    }
    if (name.length > 100) {
        return 'Workflow name must be less than 100 characters';
    }
    return null;
}

/**
 * Validates a folder name
 * @param name Folder name to validate
 * @returns Error message if invalid, null if valid
 */
export function validateFolderName(name: string): string | null {
    if (!name || name.trim().length === 0) {
        return 'Folder name is required';
    }
    if (name.length > 100) {
        return 'Folder name must be less than 100 characters';
    }
    return null;
}

/**
 * Validates a property key
 * @param key Property key to validate
 * @returns Error message if invalid, null if valid
 */
export function validatePropertyKey(key: string): string | null {
    if (!key || key.trim().length === 0) {
        return 'Property key is required';
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        return 'Property key must be a valid identifier (letters, numbers, underscores, starting with letter or underscore)';
    }
    return null;
}

/**
 * Validates a property value based on its type
 * @param type Property type
 * @param value Property value
 * @returns Error message if invalid, null if valid
 */
export function validatePropertyValue(
    type: 'number' | 'boolean' | 'string' | 'array',
    value: string
): string | null {
    if (!value) return null; // Empty is allowed

    switch (type) {
        case 'number':
            if (!/^-?\d+\.?\d*$/.test(value)) {
                return 'Must be a valid number';
            }
            return null;

        case 'array':
            if (!/^\[.*\]$/.test(value.trim())) {
                return 'Must be a valid Python array like [1, 2, 3]';
            }
            return null;

        case 'boolean':
        case 'string':
            return null;

        default:
            return null;
    }
}

/**
 * Validates a cron expression (basic validation)
 * @param cron Cron expression
 * @returns Error message if invalid, null if valid
 */
export function validateCronExpression(cron: string): string | null {
    if (!cron || cron.trim().length === 0) {
        return 'Cron expression is required';
    }

    const parts = cron.trim().split(/\s+/);
    if (parts.length < 5 || parts.length > 7) {
        return 'Cron expression must have 5-7 parts';
    }

    return null;
}
