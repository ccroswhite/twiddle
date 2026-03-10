import { useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { workflowsApi } from '@/lib/api';
import type { WorkflowVersion } from '@/components/VersionHistoryModal';
import type { Workflow } from '@twiddle/shared';

export function useWorkflowVersions(
    currentId: string | undefined,
    navigate: (path: string) => void,
    loadWorkflow: (id: string) => void,
    setWorkflowName: (name: string) => void,
    setWorkflowDescription: (desc: string) => void,
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void,
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void,
    updateLockState: (state: { isReadOnly: boolean; lockedBy: any | null }) => void,
    handleOpenProperties: (nodeId: string) => void,
    closeWorkflowBrowser: () => void,
) {
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [versionHistoryWorkflow, setVersionHistoryWorkflow] = useState<Workflow | null>(null);
    const [versions, setVersions] = useState<WorkflowVersion[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    const loadVersions = async (workflowId: string) => {
        setLoadingVersions(true);
        try {
            const list = await workflowsApi.getVersions(workflowId) as any[];
            setVersions(list.map((v: any) => ({
                id: v.id,
                version: v.version,
                createdAt: v.createdAt,
                createdBy: v.createdBy
            })));
        } catch (err) {
            console.error('Failed to load version history:', err);
        } finally {
            setLoadingVersions(false);
        }
    };

    const openVersionHistory = async (workflow: Workflow) => {
        setVersionHistoryWorkflow(workflow);
        await loadVersions(workflow.id);
        setShowVersionHistory(true);
    };

    const handleOpenVersion = async (version: WorkflowVersion) => {
        if (!versionHistoryWorkflow) return;

        // Close modal
        setShowVersionHistory(false);
        closeWorkflowBrowser();

        // Fetch full version data
        const versionData = await workflowsApi.getVersion(versionHistoryWorkflow.id, version.id) as any;

        // Navigate if needed
        if (currentId !== versionHistoryWorkflow.id) {
            navigate(`/workflows/${versionHistoryWorkflow.id}`);
        }

        // Convert to React Flow nodes
        const flowNodes: Node[] = (versionData.nodes as any[]).map((node: any) => ({
            id: node.id,
            type: 'workflowNode',
            position: node.position,
            data: {
                label: node.name,
                nodeType: node.type,
                parameters: node.parameters,
                onOpenProperties: handleOpenProperties,
            },
        })).map(n => ({ ...n, draggable: false, selectable: true }));

        const flowEdges: Edge[] = (versionData.connections as any[]).map((conn: any, index: number) => ({
            id: `e${index}`,
            source: conn.sourceNodeId,
            target: conn.targetNodeId,
            sourceHandle: conn.sourceOutput === 'main' ? null : (conn.sourceOutput ?? null),
            targetHandle: conn.targetInput === 'main' ? null : (conn.targetInput ?? null),
            animated: false,
            deletable: false
        }));

        setNodes(flowNodes);
        setEdges(flowEdges);
        setWorkflowName(`${versionHistoryWorkflow.name} (v${version.version})`);
        setWorkflowDescription(versionHistoryWorkflow.description || '');
        updateLockState({ isReadOnly: true, lockedBy: null });
    };

    const handleRestoreVersion = async (version: WorkflowVersion) => {
        if (!versionHistoryWorkflow) return;

        if (!confirm(`Are you sure you want to restore Version ${version.version}? This will become the new HEAD.`)) return;

        // Fetch version
        const versionData = await workflowsApi.getVersion(versionHistoryWorkflow.id, version.id) as any;

        // Save as new update
        await workflowsApi.update(versionHistoryWorkflow.id, {
            name: versionHistoryWorkflow.name,
            description: versionHistoryWorkflow.description,
            nodes: versionData.nodes as any,
            connections: versionData.connections as any,
            settings: versionData.settings as any
        });

        alert(`Restored version ${version.version} successfully.`);
        setShowVersionHistory(false);

        if (currentId && currentId === versionHistoryWorkflow.id) {
            loadWorkflow(currentId);
        }
    };

    return {
        showVersionHistory,
        setShowVersionHistory,
        versionHistoryWorkflow,
        setVersionHistoryWorkflow,
        versions,
        loadingVersions,
        openVersionHistory,
        handleOpenVersion,
        handleRestoreVersion,
    };
}
