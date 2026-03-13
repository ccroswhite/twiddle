import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { workflowsApi, nodesApi, type Workflow } from '@/lib/api';
import { MonitorTableView } from '@/components/MonitorTableView';
import type { Node } from '@xyflow/react';

export function WorkflowMonitor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const wf = await workflowsApi.get(id) as Workflow;
            setWorkflow(wf);

            // Parse the workflow's nodes json
            let parsedNodes = [];
            if (wf.nodes) {
                parsedNodes = typeof wf.nodes === 'string' ? JSON.parse(wf.nodes) : wf.nodes;
            }

            // We need to fetch the node metadata for the MonitorTableView UI
            if (parsedNodes.length > 0) {
                const dbNodes = await nodesApi.getAll() as Array<{ type: string; iconName?: string; bgColor?: string; }>;
                const nodeRecord: Record<string, any> = dbNodes.reduce((acc: Record<string, any>, n: any) => ({ ...acc, [n.type]: n }), {});

                parsedNodes = parsedNodes.map((pn: any) => ({
                    ...pn,
                    data: {
                        ...pn.data,
                        iconName: nodeRecord[pn.data.nodeType as string]?.iconName,
                        bgColor: nodeRecord[pn.data.nodeType as string]?.bgColor,
                    }
                }));
            }

            setNodes(parsedNodes);
        } catch (err) {
            console.error('Failed to load workflow data for monitor', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
        // In the future, this is where we'd set up a Temporal API polling interval
        // to strictly pull execution statuses for the table.
    }, [loadData]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-slate-500 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading Execution Data...
                </div>
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-slate-500">Workflow not found</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/workflows/${id}`)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        title="Back to Editor"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div>
                        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            {workflow.name}
                            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                Execution View
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{workflow.id}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden p-6">
                <div className="h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <MonitorTableView nodes={nodes} />
                </div>
            </div>
        </div>
    );
}
