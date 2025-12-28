import type { ParameterEditorProps } from './types';

export function HttpRequestNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL
                </label>
                <input
                    type="text"
                    value={(parameters.url as string) || ''}
                    onChange={(e) => updateParameter('url', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://api.example.com/endpoint"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Method
                </label>
                <select
                    value={(parameters.method as string) || 'GET'}
                    onChange={(e) => updateParameter('method', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Headers (JSON)
                </label>
                <textarea
                    value={(parameters.headers as string) || '{}'}
                    onChange={(e) => updateParameter('headers', e.target.value)}
                    className="w-full h-20 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"Content-Type": "application/json"}'
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Body
                </label>
                <textarea
                    value={(parameters.body as string) || ''}
                    onChange={(e) => updateParameter('body', e.target.value)}
                    className="w-full h-24 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Request body (JSON for POST/PUT/PATCH)"
                />
            </div>
        </div>
    );
}
