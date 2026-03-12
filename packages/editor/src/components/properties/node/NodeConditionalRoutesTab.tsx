import { Trash2, Plus } from 'lucide-react';

interface CustomRoute {
    condition: string;
    emitEvent: string;
}

interface NodeConditionalRoutesTabProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
}

export function NodeConditionalRoutesTab({
    parameters,
    updateParameter,
}: NodeConditionalRoutesTabProps) {
    const customRoutes = (parameters.customRoutes as CustomRoute[]) || [];
    const emitFailRoute = parameters.emitFailRoute as boolean | undefined;

    return (
        <div className="space-y-4">
            {/* Standard Output Setting */}
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Standard Routes</h3>
                <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                    By default, activities emit an On Success port. Enable an On Failure port to allow custom graph routing when this activity throws an error.
                </p>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={!!emitFailRoute}
                        onChange={(e) => updateParameter('emitFailRoute', e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">Enable 'On Failure' Output Port</span>
                </label>
            </div>

            {/* Custom Routes */}
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Conditional Routes</h3>
                <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                    Define custom Python conditions. For each condition, a new named Output Port will appear on the node canvas for visual routing. (e.g. <code>result.get('count') &gt; 100</code> -&gt; <code>HighVolume</code>)
                </p>

                <div className="space-y-3">
                    {customRoutes.map((route, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded relative">
                            <div className="flex flex-col gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Condition (Python)</label>
                                    <input
                                        type="text"
                                        value={route.condition}
                                        onChange={(e) => {
                                            const newRoutes = [...customRoutes];
                                            newRoutes[idx].condition = e.target.value;
                                            updateParameter('customRoutes', newRoutes);
                                        }}
                                        className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs font-mono"
                                        placeholder="result.get('status') == 500"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase shrink-0">Emit Port Name:</label>
                                    <input
                                        type="text"
                                        value={route.emitEvent}
                                        onChange={(e) => {
                                            const newRoutes = [...customRoutes];
                                            // enforce valid identifier rules for temporal states:
                                            newRoutes[idx].emitEvent = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                                            updateParameter('customRoutes', newRoutes);
                                        }}
                                        className="flex-1 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs font-mono"
                                        placeholder="WaitAndRetry"
                                    />
                                    <button
                                        onClick={() => {
                                            const newRoutes = [...customRoutes];
                                            newRoutes.splice(idx, 1);
                                            updateParameter('customRoutes', newRoutes);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-200 rounded transition-colors"
                                        title="Remove Route"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => {
                            const newRoutes = [...customRoutes, { condition: '', emitEvent: '' }];
                            updateParameter('customRoutes', newRoutes);
                        }}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add Conditional Route
                    </button>
                </div>
            </div>
        </div>
    );
}
