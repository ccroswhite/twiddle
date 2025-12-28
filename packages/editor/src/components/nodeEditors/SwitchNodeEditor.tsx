import type { ParameterEditorProps } from './types';

export function SwitchNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    const cases = (parameters.cases as Array<{ value: string; label: string }>) || [];

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Switch Expression (Python)
                </label>
                <textarea
                    value={(parameters.expression as string) || ''}
                    onChange={(e) => updateParameter('expression', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20 bg-slate-900 text-green-400"
                    placeholder="input_data.get('status')"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression whose result will be matched against cases
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                        Cases
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            const newCases = [...cases];
                            newCases.push({ value: '', label: `Case ${cases.length + 1}` });
                            updateParameter('cases', newCases);
                        }}
                        className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                    >
                        + Add Case
                    </button>
                </div>

                <div className="space-y-2">
                    {cases.map((caseItem, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={caseItem.value}
                                onChange={(e) => {
                                    const newCases = [...cases];
                                    newCases[index] = { ...newCases[index], value: e.target.value };
                                    updateParameter('cases', newCases);
                                }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                                placeholder="Value to match"
                            />
                            <input
                                type="text"
                                value={caseItem.label}
                                onChange={(e) => {
                                    const newCases = [...cases];
                                    newCases[index] = { ...newCases[index], label: e.target.value };
                                    updateParameter('cases', newCases);
                                }}
                                className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                placeholder="Label"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newCases = cases.filter((_, i) => i !== index);
                                    updateParameter('cases', newCases);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {cases.length === 0 && (
                        <p className="text-sm text-slate-400 py-2">
                            No cases defined. Add cases to create output branches.
                        </p>
                    )}
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={(parameters.hasDefault as boolean) ?? true}
                        onChange={(e) => updateParameter('hasDefault', e.target.checked)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">Include default case (for unmatched values)</span>
                </label>
            </div>
        </div>
    );
}
