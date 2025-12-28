/**
 * Embedded Workflow Management Utilities
 * Handles version checking, upgrading, and handle repair for embedded workflows
 */
import { workflowsApi } from '@/lib/api';
import { calculateEdgeHandles } from '@/utils/embeddedWorkflowUtils';

/**
 * Node with embedded workflow parameters
 */
interface EmbeddedWorkflowNode {
    type: string;
    parameters?: {
        workflowId?: string;
        workflowVersion?: number;
        workflowName?: string;
        versionPolicy?: 'latest' | 'locked';
        embeddedNodes?: string;
        embeddedConnections?: string;
        inputHandles?: string;
        outputHandles?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

/**
 * Result type for upgrade/repair operations
 */
export interface EmbeddedWorkflowCheckResult {
    nodes: EmbeddedWorkflowNode[];
    hasChanges: boolean;
}

/**
 * Upgrade an embedded workflow node to a new version
 */
function upgradeEmbeddedNode(
    node: EmbeddedWorkflowNode,
    latestWorkflow: { name: string; nodes: unknown[]; connections: unknown[]; version: number },
    policy: 'latest' | 'locked'
): EmbeddedWorkflowNode {
    const { inputHandles, outputHandles } = calculateEdgeHandles(
        latestWorkflow.nodes as any[],
        latestWorkflow.connections as any[]
    );

    return {
        ...node,
        parameters: {
            ...node.parameters,
            workflowVersion: latestWorkflow.version,
            workflowName: latestWorkflow.name,
            embeddedNodes: JSON.stringify(latestWorkflow.nodes),
            embeddedConnections: JSON.stringify(latestWorkflow.connections),
            inputHandles: JSON.stringify(inputHandles),
            outputHandles: JSON.stringify(outputHandles),
            versionPolicy: policy,
        },
    };
}

/**
 * Repair missing handles for an embedded workflow node
 */
function repairEmbeddedNodeHandles(
    node: EmbeddedWorkflowNode,
    latestWorkflow: { nodes: unknown[]; connections: unknown[] }
): EmbeddedWorkflowNode {
    const params = node.parameters || {};
    const { inputHandles, outputHandles } = calculateEdgeHandles(
        latestWorkflow.nodes as any[],
        latestWorkflow.connections as any[]
    );

    return {
        ...node,
        parameters: {
            ...params,
            inputHandles: JSON.stringify(inputHandles),
            outputHandles: JSON.stringify(outputHandles),
            embeddedNodes: params.embeddedNodes || JSON.stringify(latestWorkflow.nodes),
            embeddedConnections: params.embeddedConnections || JSON.stringify(latestWorkflow.connections),
        },
    };
}

/**
 * Check for updates to embedded workflows based on version policy.
 * 
 * For each embedded workflow node:
 * - If policy is 'latest': auto-upgrade to newest version
 * - If policy is 'locked': prompt user for upgrade
 * - If handles are missing: repair them
 * 
 * @param nodes - Array of workflow nodes to check
 * @returns Updated nodes array and whether any changes were made
 */
export async function checkAndUpgradeEmbeddedWorkflows(
    nodes: unknown[]
): Promise<EmbeddedWorkflowCheckResult> {
    const updatedNodes = [...nodes] as EmbeddedWorkflowNode[];
    let hasChanges = false;

    for (let i = 0; i < updatedNodes.length; i++) {
        const node = updatedNodes[i];
        if (node.type !== 'twiddle.embeddedWorkflow') continue;

        const params = node.parameters || {};
        const workflowId = params.workflowId;
        const currentVersion = params.workflowVersion || 0;

        // Default to 'locked' for existing nodes without policy
        const effectivePolicy = params.versionPolicy || 'locked';

        if (!workflowId) continue;

        try {
            // Fetch workflow details (always gets latest)
            const latestWorkflow = await workflowsApi.get(workflowId) as any;

            if (!latestWorkflow) continue;

            const latestVersion = latestWorkflow.version || 1;

            if (latestVersion > currentVersion) {
                if (effectivePolicy === 'latest') {
                    // Auto-upgrade
                    console.log(`Auto-upgrading embedded workflow ${workflowId} from v${currentVersion} to v${latestVersion}`);
                    updatedNodes[i] = upgradeEmbeddedNode(node, latestWorkflow, 'latest');
                    hasChanges = true;
                } else {
                    // Policy is locked, but a newer version exists - prompt user
                    const shouldUpgrade = window.confirm(
                        `Embedded workflow "${params.workflowName}" has a newer version (v${latestVersion}). ` +
                        `Current is v${currentVersion}.\n\nDo you want to upgrade to the latest version?`
                    );

                    if (shouldUpgrade) {
                        updatedNodes[i] = upgradeEmbeddedNode(node, latestWorkflow, 'locked');
                        hasChanges = true;
                    }
                    // If user declined and handles are missing on older version, we can't safely repair
                    // without fetching the specific version they're locked to
                }
            } else if (!params.inputHandles || !params.outputHandles) {
                // No upgrade needed (already latest), but handles are missing - repair
                console.log(`Repairing missing handles for embedded workflow ${workflowId}`);
                updatedNodes[i] = repairEmbeddedNodeHandles(node, latestWorkflow);
                hasChanges = true;
            }
        } catch (e) {
            console.warn(`Failed to check for updates for embedded workflow ${workflowId}`, e);
        }
    }

    return { nodes: hasChanges ? updatedNodes : (nodes as EmbeddedWorkflowNode[]), hasChanges };
}
