import type { ParameterEditorProps } from './types';

export function SetDataNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data (JSON)
                </label>
                <textarea
                    value={(parameters.data as string) || '{}'}
                    onChange={(e) => updateParameter('data', e.target.value)}
                    className="w-full h-32 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"key": "value"}'
                />
                <p className="text-xs text-slate-500 mt-1">
                    Static data to output from this node in JSON format.
                </p>
            </div>
        </div>
    );
}
