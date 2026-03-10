import { Node } from '@xyflow/react';
import { isActivityNode } from '@/utils/nodeConfig';
import { Clock } from 'lucide-react';

interface MonitorTableViewProps {
    nodes: Node[];
}

// Simulating a Control-M style view with dense formatting
export function MonitorTableView({ nodes }: MonitorTableViewProps) {
    if (nodes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No jobs defined in the current workspace.
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-300 flex items-center justify-between">
                <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                    Viewpoint List
                </div>
                <div className="text-[11px] font-medium text-slate-500">
                    {nodes.length} Jobs
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-[12px] border-collapse whitespace-nowrap">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-3 py-1.5 font-semibold text-slate-600 border-b border-r border-slate-200 w-10">Status</th>
                            <th className="px-3 py-1.5 font-semibold text-slate-600 border-b border-r border-slate-200">Job Name</th>
                            <th className="px-3 py-1.5 font-semibold text-slate-600 border-b border-r border-slate-200">Node ID</th>
                            <th className="px-3 py-1.5 font-semibold text-slate-600 border-b border-r border-slate-200">Type</th>
                            <th className="px-3 py-1.5 font-semibold text-slate-600 border-b border-r border-slate-200">Next/Start Time</th>
                            <th className="px-3 py-1.5 font-semibold text-slate-600 border-b border-slate-200">End Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                        {nodes.map(node => {
                            const nodeType = node.data.nodeType as string;
                            const isActivity = isActivityNode(nodeType);
                            const isTrigger = !isActivity && !nodeType.startsWith('credential.');

                            // Mocking statuses for now since we are in editor mode mostly
                            // In a real execution view, this would map to actual run states
                            let statusIcon = <Clock className="w-3.5 h-3.5 text-slate-400" />;
                            let statusText = "Wait Condition";

                            return (
                                <tr key={node.id} className="hover:bg-blue-50/50 cursor-default">
                                    <td className="px-3 py-1 border-r border-slate-100" title={statusText}>
                                        <div className="flex justify-center">
                                            {statusIcon}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1 border-r border-slate-100 font-bold text-slate-700 truncate max-w-[200px]" title={node.data.label as string}>
                                        {node.data.label as string}
                                    </td>
                                    <td className="px-3 py-1 border-r border-slate-100 text-slate-500">
                                        {node.id}
                                    </td>
                                    <td className="px-3 py-1 border-r border-slate-100 text-slate-600">
                                        {isActivity ? 'ACTIVITY' : isTrigger ? 'TRIGGER' : 'CREDENTIAL'}
                                    </td>
                                    <td className="px-3 py-1 border-r border-slate-100 text-slate-400">
                                        --
                                    </td>
                                    <td className="px-3 py-1 text-slate-400">
                                        --
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
