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

// =============================================================================
// Credential Type Labels
// =============================================================================

/**
 * Maps credential type identifiers to human-readable labels.
 */
export const credentialTypeLabels: Record<string, string> = {
    httpBasicAuth: 'HTTP Basic Auth',
    httpBearerToken: 'HTTP Bearer Token',
    apiKey: 'API Key',
    oauth2: 'OAuth2',
    githubDatasource: 'GitHub',
    sshDatasource: 'SSH',
    winrmDatasource: 'WinRM',
    postgresqlDatasource: 'PostgreSQL',
    mysqlDatasource: 'MySQL',
    mssqlDatasource: 'SQL Server',
    redisDatasource: 'Redis',
    valkeyDatasource: 'Valkey',
    cassandraDatasource: 'Cassandra',
    opensearchDatasource: 'OpenSearch',
    elasticsearchDatasource: 'Elasticsearch',
    snowflakeDatasource: 'Snowflake',
    prestodbDatasource: 'PrestoDB',
};

/**
 * Get a human-readable label for a credential type.
 * Falls back to the type identifier if no label is defined.
 */
export function getCredentialTypeLabel(type: string): string {
    return credentialTypeLabels[type] || type;
}

// =============================================================================
// Node Display Names
// =============================================================================

/**
 * Maps node types to human-readable display names for the UI.
 */
export const nodeDisplayNameMap: Record<string, string> = {
    // Triggers
    'twiddle.manualTrigger': 'Manual Trigger',
    'twiddle.webhook': 'Webhook Trigger',
    'twiddle.interval': 'Interval Trigger',

    // Core nodes
    'twiddle.httpRequest': 'HTTP Request',
    'twiddle.code': 'Code Node',
    'twiddle.if': 'If-Else Node',
    'twiddle.switch': 'Switch Node',
    'twiddle.setData': 'Set Data',
    'twiddle.respondToWebhook': 'Respond to Webhook',
    'twiddle.report': 'Report',
    'twiddle.slack': 'Slack',
    'twiddle.htmlExtract': 'HTML Extract',
    'twiddle.winrm': 'WinRM',
    'twiddle.ssh': 'SSH',
    'twiddle.embeddedWorkflow': 'Embedded Workflow',

    // Database nodes
    'twiddle.mssql': 'SQL Server',
    'twiddle.postgresql': 'PostgreSQL',
    'twiddle.mysql': 'MySQL',
    'twiddle.cassandra': 'Cassandra',
    'twiddle.redis': 'Redis',
    'twiddle.valkey': 'Valkey',
    'twiddle.opensearch': 'OpenSearch',
    'twiddle.elasticsearch': 'Elasticsearch',
    'twiddle.snowflake': 'Snowflake',
    'twiddle.prestodb': 'PrestoDB',
};

/**
 * Get a human-readable display name for a node type.
 * Falls back to a formatted version of the type if no name is defined.
 */
export function getNodeDisplayName(nodeType: string): string {
    // Check for direct mapping
    if (nodeDisplayNameMap[nodeType]) {
        return nodeDisplayNameMap[nodeType];
    }

    // Handle credential nodes
    if (nodeType.startsWith('credential.')) {
        const parts = nodeType.split('.');
        const credType = parts[1];
        const credLabel = getCredentialTypeLabel(credType);
        return `${credLabel} Connection`;
    }

    // Fallback: convert nodeType to readable format
    // e.g., "twiddle.customNode" -> "Custom Node"
    const baseName = nodeType.replace('twiddle.', '');
    return baseName
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}
