/**
 * Utility functions for workflow operations
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Formats a date string into a readable relative or absolute format
 * @param dateString ISO date string
 * @returns Formatted date string (e.g., "2m ago", "Dec 23, 2025")
 */
export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

/**
 * Generates a unique node ID
 * @returns Unique node ID string
 */
export function generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique property ID
 * @returns Unique property ID string
 */
export function generatePropertyId(): string {
    return `prop_${Date.now()}`;
}

/**
 * Calculates node position from screen coordinates
 * @param screenPos Screen position {x, y}
 * @param viewport ReactFlow viewport {x, y, zoom}
 * @returns Flow position {x, y}
 */
export function calculateNodePosition(
    screenPos: { x: number; y: number },
    viewport: { x: number; y: number; zoom: number }
): { x: number; y: number } {
    return {
        x: (screenPos.x - viewport.x) / viewport.zoom,
        y: (screenPos.y - viewport.y) / viewport.zoom,
    };
}

/**
 * Creates a deep copy of workflow state for history
 * @param nodes Current nodes array
 * @param edges Current edges array
 * @returns Deep copy of nodes and edges
 */
export function createHistorySnapshot(nodes: Node[], edges: Edge[]): {
    nodes: Node[];
    edges: Edge[];
} {
    return {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
    };
}

/**
 * Serializes workflow data for API
 * @param nodes Workflow nodes
 * @param edges Workflow edges
 * @returns Serialized workflow data
 */
export function serializeWorkflow(nodes: Node[], edges: Edge[]): {
    nodes: any[];
    connections: any[];
} {
    return {
        nodes: nodes.map((node) => ({
            id: node.id,
            type: node.data.nodeType,
            position: node.position,
            data: node.data,
        })),
        connections: edges.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
        })),
    };
}
