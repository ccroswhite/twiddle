import { Trash2, Plus } from 'lucide-react';

interface NodeRequiredActivityTabProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
    availableActivities: string[];
}

import { useMemo } from 'react';

export function NodeRequiredActivityTab({
    parameters,
    updateParameter,
    availableActivities,
}: NodeRequiredActivityTabProps) {
    const baseActivities = useMemo(() => {
        const bases = new Set<string>();
        availableActivities.forEach(act => {
            if (act.endsWith('-OK')) bases.add(act.slice(0, -3));
            else if (act.endsWith('-FAIL')) bases.add(act.slice(0, -5));
            else bases.add(act);
        });
        return Array.from(bases).sort();
    }, [availableActivities]);
    return (
        <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Required Activity</h3>
                <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                    Define strictly required activity completions. This node will not execute until all required activities have been published as complete successfully.
                </p>

                <div className="space-y-2">
                    {((parameters.requiredActivity as string[]) || []).map((req, idx) => {
                        const isOk = req?.endsWith('-OK');
                        const isFail = req?.endsWith('-FAIL');
                        const base = isOk ? req.slice(0, -3) : isFail ? req.slice(0, -5) : req || '';
                        const conditionState = isOk ? 'OK' : isFail ? 'FAIL' : 'CUSTOM';

                        return (
                            <div key={idx} className="flex items-center gap-2">
                                <select
                                    value={base}
                                    onChange={(e) => {
                                        const newBase = e.target.value;
                                        if (!newBase) {
                                            const newReqs = [...((parameters.requiredActivity as string[]) || [])];
                                            newReqs[idx] = '';
                                            updateParameter('requiredActivity', newReqs.filter(Boolean));
                                            return;
                                        }

                                        // Default to -OK if they pick a new base that exists as an implicit node
                                        const isImplicitNodeBase = availableActivities.includes(`${newBase}-OK`);
                                        const newVal = isImplicitNodeBase ? `${newBase}-OK` : newBase;

                                        const newReqs = [...((parameters.requiredActivity as string[]) || [])];
                                        newReqs[idx] = newVal;
                                        updateParameter('requiredActivity', newReqs.filter(Boolean));
                                    }}
                                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-mono bg-slate-50"
                                >
                                    <option value="">Select activity...</option>
                                    {baseActivities.map(activity => (
                                        <option key={activity} value={activity}>{activity}</option>
                                    ))}
                                </select>

                                {base && (
                                    <select
                                        value={conditionState}
                                        onChange={(e) => {
                                            const newState = e.target.value;
                                            let newVal = base;
                                            if (newState === 'OK') newVal = `${base}-OK`;
                                            if (newState === 'FAIL') newVal = `${base}-FAIL`;

                                            const newReqs = [...((parameters.requiredActivity as string[]) || [])];
                                            newReqs[idx] = newVal;
                                            updateParameter('requiredActivity', newReqs.filter(Boolean));
                                        }}
                                        className="w-32 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-[11px] font-bold tracking-wide"
                                    >
                                        <option value="CUSTOM">Custom</option>
                                        <option value="OK">Ends OK</option>
                                        <option value="FAIL">Ends Not OK</option>
                                    </select>
                                )}

                                <button
                                    onClick={() => {
                                        const newReqs = [...((parameters.requiredActivity as string[]) || [])];
                                        newReqs.splice(idx, 1);
                                        updateParameter('requiredActivity', newReqs);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        );
                    })}

                    <button
                        onClick={() => {
                            const newReqs = [...((parameters.requiredActivity as string[]) || []), ''];
                            updateParameter('requiredActivity', newReqs);
                        }}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Add Required Activity
                    </button>
                </div>
            </div>
        </div>
    );
}
