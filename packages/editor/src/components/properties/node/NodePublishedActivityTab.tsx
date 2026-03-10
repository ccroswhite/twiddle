import { Trash2, Plus } from 'lucide-react';

interface NodePublishedActivityTabProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
    nodeId: string;
}

export function NodePublishedActivityTab({
    parameters,
    updateParameter,
    nodeId,
}: NodePublishedActivityTabProps) {
    return (
        <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Published Activity</h3>
                <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                    Define activity states to publish upon successful completion. These can be required by other activities down the graph.
                </p>

                <div className="space-y-2">
                    {((parameters.publishedActivity as string[]) || []).map((pub, idx) => (
                        <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={pub}
                                    onChange={(e) => {
                                        const newPubs = [...((parameters.publishedActivity as string[]) || [])];
                                        newPubs[idx] = e.target.value;
                                        updateParameter('publishedActivity', newPubs.filter(Boolean));
                                    }}
                                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-mono bg-slate-50"
                                    placeholder={`e.g. ${nodeId || 'NodeID'}-OK`}
                                />
                                <button
                                    onClick={() => {
                                        const newPubs = [...((parameters.publishedActivity as string[]) || [])];
                                        newPubs.splice(idx, 1);
                                        updateParameter('publishedActivity', newPubs);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded"
                                    title="Delete Published Activity"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            {/* Helper to set default event name if empty */}
                            {!pub && (
                                <button
                                    onClick={() => {
                                        const newPubs = [...((parameters.publishedActivity as string[]) || [])];
                                        newPubs[idx] = `${nodeId}-OK`;
                                        updateParameter('publishedActivity', newPubs);
                                    }}
                                    className="text-[10px] text-left text-primary-600 hover:text-primary-700 font-medium"
                                >
                                    Use default: {nodeId}-OK
                                </button>
                            )}
                        </div>
                    ))}

                    <button
                        onClick={() => {
                            const newPubs = [...((parameters.publishedActivity as string[]) || []), ''];
                            updateParameter('publishedActivity', newPubs);
                        }}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add Published Activity
                    </button>
                </div>
            </div>
        </div>
    );
}
