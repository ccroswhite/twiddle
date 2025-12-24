/**
 * Node Configuration
 * 
 * Shared configuration for workflow nodes including icons, colors, and type classifications.
 * This module centralizes node visual configuration to ensure consistency across the editor.
 */

import {
    Globe,
    Code,
    GitBranch,
    Terminal,
    Database,
    Search,
    Server,
    Key,
    Send,
    Webhook,
    FileCode,
    Mail,
    MessageSquare,
    Layers,
} from 'lucide-react';

// =============================================================================
// Node Type Classifications
// =============================================================================

/**
 * Trigger nodes are not activities - they start workflows.
 * Used to differentiate UI display (e.g., "Activity" vs "Trigger" badge)
 */
export const TRIGGER_NODE_TYPES = new Set([
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

// =============================================================================
// Node Icons
// =============================================================================

/**
 * Maps node types to their corresponding Lucide icon components.
 */
export const nodeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    // Core nodes
    'twiddle.httpRequest': Globe,
    'twiddle.code': Code,
    'twiddle.if': GitBranch,
    'twiddle.respondToWebhook': Send,
    'twiddle.report': Mail,
    'twiddle.slack': MessageSquare,
    'twiddle.webhook': Webhook,
    'twiddle.htmlExtract': FileCode,
    'twiddle.winrm': Terminal,
    'twiddle.ssh': Server,
    'twiddle.embeddedWorkflow': Layers,

    // Database nodes
    'twiddle.mssql': Database,
    'twiddle.postgresql': Database,
    'twiddle.mysql': Database,
    'twiddle.cassandra': Database,
    'twiddle.redis': Database,
    'twiddle.valkey': Database,
    'twiddle.opensearch': Search,
    'twiddle.elasticsearch': Search,
    'twiddle.snowflake': Database,
    'twiddle.prestodb': Database,
};

/**
 * Default icon for unknown node types
 */
export const DEFAULT_NODE_ICON = Code;

/**
 * Icon for credential nodes
 */
export const CREDENTIAL_NODE_ICON = Key;

/**
 * Get the icon component for a node type
 */
export function getNodeIcon(nodeType: string, isCredential: boolean = false): React.ComponentType<{ className?: string }> {
    if (isCredential) return CREDENTIAL_NODE_ICON;
    return nodeIconMap[nodeType] || DEFAULT_NODE_ICON;
}

// =============================================================================
// Node Colors
// =============================================================================

/**
 * Maps node types to their Tailwind CSS background color classes.
 */
export const nodeColorMap: Record<string, string> = {
    // Core nodes
    'twiddle.httpRequest': 'bg-blue-500',
    'twiddle.code': 'bg-orange-500',
    'twiddle.if': 'bg-yellow-500',
    'twiddle.respondToWebhook': 'bg-emerald-500',
    'twiddle.report': 'bg-emerald-500',
    'twiddle.slack': 'bg-purple-700',
    'twiddle.webhook': 'bg-indigo-500',
    'twiddle.htmlExtract': 'bg-pink-500',
    'twiddle.winrm': 'bg-sky-600',
    'twiddle.ssh': 'bg-green-600',
    'twiddle.embeddedWorkflow': 'bg-violet-600',

    // Database nodes
    'twiddle.mssql': 'bg-red-600',
    'twiddle.postgresql': 'bg-blue-700',
    'twiddle.mysql': 'bg-blue-500',
    'twiddle.cassandra': 'bg-cyan-600',
    'twiddle.redis': 'bg-red-500',
    'twiddle.valkey': 'bg-indigo-500',
    'twiddle.opensearch': 'bg-blue-600',
    'twiddle.elasticsearch': 'bg-yellow-500',
    'twiddle.snowflake': 'bg-cyan-400',
    'twiddle.prestodb': 'bg-blue-400',
};

/**
 * Default color for unknown node types
 */
export const DEFAULT_NODE_COLOR = 'bg-slate-500';

/**
 * Color for credential nodes
 */
export const CREDENTIAL_NODE_COLOR = 'bg-amber-500';

/**
 * Get the color class for a node type
 */
export function getNodeColor(nodeType: string, isCredential: boolean = false): string {
    if (isCredential) return CREDENTIAL_NODE_COLOR;
    return nodeColorMap[nodeType] || DEFAULT_NODE_COLOR;
}
