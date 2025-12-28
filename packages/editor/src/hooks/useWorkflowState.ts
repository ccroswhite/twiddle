import { useState, useCallback } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { workflowsApi } from '@/lib/api';
import type { WorkflowProperty, WorkflowSchedule } from '@twiddle/shared';
import type { Environment } from '@/components/EnvironmentBadge';
import { DEFAULT_SCHEDULE } from '@/utils/constants';

/**
 * Return type for the useWorkflowState hook
 */
export interface UseWorkflowStateReturn {
    // Node/Edge state from ReactFlow
    nodes: Node[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    onNodesChange: (changes: any) => void;
    edges: Edge[];
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    onEdgesChange: (changes: any) => void;

    // Workflow metadata
    workflowName: string;
    setWorkflowName: (name: string) => void;
    workflowVersion: number;
    setWorkflowVersion: (version: number) => void;
    workflowDescription: string;
    setWorkflowDescription: (description: string) => void;
    workflowProperties: WorkflowProperty[];
    setWorkflowProperties: React.Dispatch<React.SetStateAction<WorkflowProperty[]>>;
    workflowSchedule: WorkflowSchedule;
    setWorkflowSchedule: React.Dispatch<React.SetStateAction<WorkflowSchedule>>;
    environment: Environment;
    setEnvironment: (env: Environment) => void;

    // Save state
    saving: boolean;
    handleSave: () => Promise<void>;

    // For new workflows - folder ID from navigation state
    newWorkflowFolderId: string | null;
    setNewWorkflowFolderId: (folderId: string | null) => void;
}

/**
 * Custom hook for managing workflow state.
 * 
 * Handles:
 * - Workflow metadata (name, description, version, environment)
 * - Node and edge state (via ReactFlow hooks)
 * - Workflow properties and schedule
 * - Save functionality (create/update)
 * 
 * @param workflowId - Current workflow ID (null/undefined for new workflows)
 * @param isNew - Whether this is a new (unsaved) workflow
 * @returns Workflow state and control functions
 */
export function useWorkflowState(
    workflowId: string | undefined,
    isNew: boolean
): UseWorkflowStateReturn {
    const navigate = useNavigate();

    // ReactFlow state
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Workflow metadata
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [workflowVersion, setWorkflowVersion] = useState<number>(1);
    const [workflowDescription, setWorkflowDescription] = useState('');
    const [workflowProperties, setWorkflowProperties] = useState<WorkflowProperty[]>([]);
    const [workflowSchedule, setWorkflowSchedule] = useState<WorkflowSchedule>(DEFAULT_SCHEDULE);
    const [environment, setEnvironment] = useState<Environment>('DV');

    // Save state
    const [saving, setSaving] = useState(false);

    // For new workflows - track folder ID from navigation
    const [newWorkflowFolderId, setNewWorkflowFolderId] = useState<string | null>(null);

    /**
     * Save workflow (create or update)
     */
    const handleSave = useCallback(async () => {
        try {
            setSaving(true);

            // Convert React Flow nodes back to workflow format
            // Filter out embedded child nodes - they should not be saved
            const workflowNodes = nodes
                .filter((node: Node) => !(node as any).parentId)
                .map((node: Node) => ({
                    id: node.id,
                    name: node.data.label,
                    type: node.data.nodeType,
                    position: node.position,
                    parameters: node.data.parameters || {},
                }));

            // Get IDs of all saved nodes for filtering edges
            const savedNodeIds = new Set(workflowNodes.map((n: any) => n.id));

            // Build handle mappings for all expanded embedded workflows
            const embeddedNodeHandleMaps: Record<string, { inputMap: Map<string, string>, outputMap: Map<string, string> }> = {};

            for (const n of workflowNodes) {
                if (n.type === 'twiddle.embeddedWorkflow' && n.parameters) {
                    const params = n.parameters as Record<string, unknown>;
                    try {
                        const inputHandles = params.inputHandles ? JSON.parse(params.inputHandles as string) : [];
                        const outputHandles = params.outputHandles ? JSON.parse(params.outputHandles as string) : [];

                        const inputMap = new Map<string, string>();
                        const outputMap = new Map<string, string>();

                        inputHandles.forEach((h: any) => {
                            inputMap.set(`${n.id}_embedded_${h.sourceNodeId}`, h.handle);
                        });
                        outputHandles.forEach((h: any) => {
                            outputMap.set(`${n.id}_embedded_${h.sourceNodeId}`, h.handle);
                        });

                        embeddedNodeHandleMaps[n.id] = { inputMap, outputMap };
                    } catch (e) {
                        console.warn('Failed to parse handles for save remapping', e);
                    }
                }
            }

            // Remap edges that connect to embedded nodes, then filter
            const remappedEdges = edges.map((edge: Edge) => {
                let newSource = edge.source;
                let newSourceHandle = edge.sourceHandle;
                let newTarget = edge.target;
                let newTargetHandle = edge.targetHandle;

                if (edge.source.includes('_embedded_')) {
                    const parentId = edge.source.split('_embedded_')[0];
                    const maps = embeddedNodeHandleMaps[parentId];
                    if (maps && maps.outputMap.has(edge.source)) {
                        newSource = parentId;
                        newSourceHandle = maps.outputMap.get(edge.source) || edge.sourceHandle;
                    }
                }

                if (edge.target.includes('_embedded_')) {
                    const parentId = edge.target.split('_embedded_')[0];
                    const maps = embeddedNodeHandleMaps[parentId];
                    if (maps && maps.inputMap.has(edge.target)) {
                        newTarget = parentId;
                        newTargetHandle = maps.inputMap.get(edge.target) || edge.targetHandle;
                    }
                }

                return {
                    ...edge,
                    source: newSource,
                    sourceHandle: newSourceHandle,
                    target: newTarget,
                    targetHandle: newTargetHandle,
                };
            });

            // Convert React Flow edges back to workflow connections
            const workflowConnections = remappedEdges
                .filter((edge: Edge) => {
                    return savedNodeIds.has(edge.source) && savedNodeIds.has(edge.target);
                })
                .map((edge: Edge) => ({
                    sourceNodeId: edge.source,
                    sourceOutput: edge.sourceHandle,
                    targetNodeId: edge.target,
                    targetInput: edge.targetHandle,
                }));

            if (isNew) {
                const created = await workflowsApi.create({
                    name: workflowName,
                    description: workflowDescription,
                    nodes: workflowNodes as any,
                    connections: workflowConnections as any,
                    properties: workflowProperties,
                    schedule: workflowSchedule,
                    folderId: newWorkflowFolderId || undefined,
                });
                setNewWorkflowFolderId(null);
                navigate(`/workflows/${created.id}`, { replace: true });
            } else {
                const updated = await workflowsApi.update(workflowId!, {
                    name: workflowName,
                    description: workflowDescription,
                    nodes: workflowNodes as any,
                    connections: workflowConnections as any,
                    properties: workflowProperties,
                    schedule: workflowSchedule,
                });
                setWorkflowVersion(updated.version);
            }
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setSaving(false);
        }
    }, [
        nodes,
        edges,
        isNew,
        workflowId,
        workflowName,
        workflowDescription,
        workflowProperties,
        workflowSchedule,
        newWorkflowFolderId,
        navigate,
    ]);

    return {
        nodes,
        setNodes,
        onNodesChange,
        edges,
        setEdges,
        onEdgesChange,
        workflowName,
        setWorkflowName,
        workflowVersion,
        setWorkflowVersion,
        workflowDescription,
        setWorkflowDescription,
        workflowProperties,
        setWorkflowProperties,
        workflowSchedule,
        setWorkflowSchedule,
        environment,
        setEnvironment,
        saving,
        handleSave,
        newWorkflowFolderId,
        setNewWorkflowFolderId,
    };
}
