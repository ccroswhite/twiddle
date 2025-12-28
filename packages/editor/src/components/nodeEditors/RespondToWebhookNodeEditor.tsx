import type { ParameterEditorProps } from './types';

export function RespondToWebhookNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status Code
                </label>
                <select
                    value={(parameters.statusCode as number) || 200}
                    onChange={(e) => updateParameter('statusCode', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value={200}>200 OK</option>
                    <option value={201}>201 Created</option>
                    <option value={202}>202 Accepted</option>
                    <option value={204}>204 No Content</option>
                    <option value={400}>400 Bad Request</option>
                    <option value={401}>401 Unauthorized</option>
                    <option value={403}>403 Forbidden</option>
                    <option value={404}>404 Not Found</option>
                    <option value={500}>500 Internal Server Error</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Content Type
                </label>
                <select
                    value={(parameters.contentType as string) || 'application/json'}
                    onChange={(e) => updateParameter('contentType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="application/json">application/json</option>
                    <option value="text/plain">text/plain</option>
                    <option value="text/html">text/html</option>
                    <option value="application/xml">application/xml</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Response Headers (JSON)
                </label>
                <textarea
                    value={(parameters.headers as string) || '{}'}
                    onChange={(e) => updateParameter('headers', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20"
                    placeholder='{"X-Custom-Header": "value"}'
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Response Body (Python expression)
                </label>
                <textarea
                    value={(parameters.body as string) || ''}
                    onChange={(e) => updateParameter('body', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-green-400"
                    placeholder='{"status": "success", "data": input_data}'
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression that returns the response body. Use input_data to access data from previous nodes.
                </p>
            </div>
        </div>
    );
}
