/**
 * Constants used throughout the workflow editor
 */

// History management
export const MAX_HISTORY = 30;

// Default workflow schedule configuration
export const DEFAULT_SCHEDULE = {
    enabled: false,
    mode: 'simple' as const,
    simple: {
        frequency: 'daily' as const,
        time: '09:00',
        timezone: 'UTC',
    },
};

// Lock check interval (milliseconds)
export const LOCK_CHECK_INTERVAL = 10000;

// Workflow environments
export const ENVIRONMENTS = ['DV', 'UT', 'LT', 'PD'] as const;

// Default viewport for ReactFlow
export const DEFAULT_VIEWPORT = {
    zoom: 1,
    x: 0,
    y: 0,
};
