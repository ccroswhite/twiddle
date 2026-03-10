import { ReactNode } from 'react';

interface NodeGeneralTabProps {
    label: string;
    setLabel: (label: string) => void;
    nodeType: string;
    renderParameterEditor: () => ReactNode;
}

export function NodeGeneralTab({
    label,
    setLabel,
    nodeType,
    renderParameterEditor,
}: NodeGeneralTabProps) {
    return (
        <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Node Name
                </label>
                {nodeType === 'twiddle.embeddedWorkflow' ? (
                    <div className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                        {label}
                    </div>
                ) : (
                    <input
                        type="text"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                    />
                )}
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Node Type
                </label>
                <div className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 font-mono">
                    {nodeType}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Parameters</h3>
                {renderParameterEditor()}
            </div>
        </div>
    );
}
