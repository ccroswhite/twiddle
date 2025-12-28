import type { ParameterEditorProps } from './types';

export function DatabaseNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    SQL Query
                </label>
                <textarea
                    value={(parameters.query as string) || ''}
                    onChange={(e) => updateParameter('query', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-cyan-400"
                    placeholder="SELECT * FROM users WHERE active = true"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credential
                </label>
                <input
                    type="text"
                    value={(parameters.credentialId as string) || ''}
                    onChange={(e) => updateParameter('credentialId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Credential ID"
                />
            </div>
        </div>
    );
}
