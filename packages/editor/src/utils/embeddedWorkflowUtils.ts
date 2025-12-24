/**
 * Embedded Workflow Utilities
 * 
 * Helper functions for managing embedded workflow nodes, including:
 * - Edge remapping when collapsing/expanding embedded workflows
 * - Handle calculation from embedded workflow DAG structure
 */

import type { Edge } from '@xyflow/react';

// =============================================================================
// Types
// =============================================================================

export interface HandleInfo {
    handle: string;
    label: string;
    sourceNodeId: string;
    sourceHandle: string;
}

export interface WorkflowNode {
    id: string;
    name?: string;
    [key: string]: unknown;
}

export interface WorkflowConnection {
    sourceNodeId: string;
    targetNodeId: string;
    sourceOutput?: string;
    targetInput?: string;
}

// =============================================================================
// Edge Remapping
// =============================================================================

/**
 * Remap edges when collapsing an embedded workflow.
 * 
 * When an embedded workflow is collapsed, edges that connect to internal nodes
 * need to be remapped to connect to the container node's handles instead.
 * 
 * @param edges - Current edge array
 * @param nodeId - The embedded workflow container node ID
 * @param inputHandles - The container's input handles
 * @param outputHandles - The container's output handles
 * @returns Updated edge array with remapped connections
 */
export function remapEdgesForCollapsedNode(
    edges: Edge[],
    nodeId: string,
    inputHandles: HandleInfo[],
    outputHandles: HandleInfo[]
): Edge[] {
    // Create mapping: embedded node ID -> parent handle ID
    const inputMap = new Map<string, string>();  // embedded node ID -> parent input handle
    const outputMap = new Map<string, string>(); // embedded node ID -> parent output handle

    inputHandles.forEach((h) => {
        inputMap.set(`${nodeId}_embedded_${h.sourceNodeId}`, h.handle);
    });
    outputHandles.forEach((h) => {
        outputMap.set(`${nodeId}_embedded_${h.sourceNodeId}`, h.handle);
    });

    return edges.map((e: Edge) => {
        // Check if edge connects to an embedded node
        const isSourceEmbedded = e.source.startsWith(`${nodeId}_embedded_`);
        const isTargetEmbedded = e.target.startsWith(`${nodeId}_embedded_`);
        const isInternalEdge = e.id.startsWith(`${nodeId}_embedded_`);

        // Remove internal edges
        if (isInternalEdge) return null;

        // Remap source if it's an embedded node (output from embedded)
        let newSource = e.source;
        let newSourceHandle = e.sourceHandle;
        if (isSourceEmbedded && outputMap.has(e.source)) {
            newSource = nodeId;
            newSourceHandle = outputMap.get(e.source) || e.sourceHandle;
        }

        // Remap target if it's an embedded node (input to embedded)
        let newTarget = e.target;
        let newTargetHandle = e.targetHandle;
        if (isTargetEmbedded && inputMap.has(e.target)) {
            newTarget = nodeId;
            newTargetHandle = inputMap.get(e.target) || e.targetHandle;
        }

        // Return remapped edge or original
        if (isSourceEmbedded || isTargetEmbedded) {
            return {
                ...e,
                source: newSource,
                sourceHandle: newSourceHandle,
                target: newTarget,
                targetHandle: newTargetHandle,
            };
        }

        return e;
    }).filter((e): e is Edge => e !== null);
}

// =============================================================================
// Handle Calculation
// =============================================================================

/**
 * Calculate input and output handles from an embedded workflow's DAG structure.
 * 
 * Edge nodes (nodes with unconnected handles) become the handles for the
 * embedded workflow container node:
 * - Nodes with no incoming connections become input handles
 * - Nodes with no outgoing connections become output handles
 * 
 * @param nodes - The embedded workflow's nodes
 * @param connections - The embedded workflow's connections
 * @returns Object containing inputHandles and outputHandles arrays
 */
export function calculateEdgeHandles(
    nodes: WorkflowNode[],
    connections: WorkflowConnection[]
): { inputHandles: HandleInfo[]; outputHandles: HandleInfo[] } {
    const inputHandles: HandleInfo[] = [];
    const outputHandles: HandleInfo[] = [];

    // Build a map of node IDs to their connections
    const nodeInputs = new Map<string, Set<string>>();
    const nodeOutputs = new Map<string, Set<string>>();

    nodes.forEach(node => {
        nodeInputs.set(node.id, new Set());
        nodeOutputs.set(node.id, new Set());
    });

    connections.forEach(conn => {
        nodeOutputs.get(conn.sourceNodeId)?.add(conn.sourceOutput || 'main');
        nodeInputs.get(conn.targetNodeId)?.add(conn.targetInput || 'main');
    });

    // Find edge nodes (nodes with unconnected handles)
    nodes.forEach(node => {
        // Check for unconnected input handles (potential input edges)
        // For simplicity, we'll expose the first input if it has no incoming connections
        const hasIncomingConnections = connections.some(c => c.targetNodeId === node.id);
        if (!hasIncomingConnections) {
            inputHandles.push({
                handle: `${node.id}_main`,
                label: node.name || 'Input',
                sourceNodeId: node.id,
                sourceHandle: 'main',
            });
        }

        // Check for unconnected output handles (potential output edges)
        const hasOutgoingConnections = connections.some(c => c.sourceNodeId === node.id);
        if (!hasOutgoingConnections) {
            outputHandles.push({
                handle: `${node.id}_main`,
                label: node.name || 'Output',
                sourceNodeId: node.id,
                sourceHandle: 'main',
            });
        }
    });

    return { inputHandles, outputHandles };
}
