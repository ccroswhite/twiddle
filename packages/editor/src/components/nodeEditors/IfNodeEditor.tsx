import type { ParameterEditorProps } from './types';

export function IfNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Condition Expression
                </label>
                <textarea
                    value={(parameters.condition as string) || ''}
                    onChange={(e) => updateParameter('condition', e.target.value)}
                    className="w-full h-20 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="input['value'] > 100"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression that evaluates to True or False.
                    Use 'input' to access data from the previous node.
                </p>
            </div>
        </div>
    );
}
