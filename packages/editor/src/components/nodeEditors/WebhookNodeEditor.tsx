import type { ParameterEditorProps } from './types';

export function WebhookNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Webhook Path
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">/webhook/</span>
                    <input
                        type="text"
                        value={(parameters.path as string) || ''}
                        onChange={(e) => updateParameter('path', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="my-webhook-path"
                    />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Unique path for this webhook endpoint
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Allowed Methods
                </label>
                <div className="flex flex-wrap gap-2">
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => {
                        const methods = (parameters.methods as string[]) || ['POST'];
                        const isSelected = methods.includes(method);
                        return (
                            <button
                                key={method}
                                type="button"
                                onClick={() => {
                                    const newMethods = isSelected
                                        ? methods.filter((m) => m !== method)
                                        : [...methods, method];
                                    updateParameter('methods', newMethods.length > 0 ? newMethods : ['POST']);
                                }}
                                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${isSelected
                                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {method}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Authentication
                </label>
                <select
                    value={(parameters.authentication as string) || 'none'}
                    onChange={(e) => updateParameter('authentication', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="none">None (Public)</option>
                    <option value="header">Header Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="query">Query Parameter</option>
                </select>
            </div>
            {(parameters.authentication as string) && (parameters.authentication as string) !== 'none' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {(parameters.authentication as string) === 'header' ? 'Header Name' :
                            (parameters.authentication as string) === 'query' ? 'Query Parameter Name' : 'Credential'}
                    </label>
                    <input
                        type="text"
                        value={(parameters.authKey as string) || ''}
                        onChange={(e) => updateParameter('authKey', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={(parameters.authentication as string) === 'header' ? 'X-API-Key' :
                            (parameters.authentication as string) === 'query' ? 'api_key' : 'credential-id'}
                    />
                </div>
            )}
            {(parameters.authentication as string) && (parameters.authentication as string) !== 'none' && (parameters.authentication as string) !== 'basic' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Expected Token Value
                    </label>
                    <input
                        type="password"
                        value={(parameters.authValue as string) || ''}
                        onChange={(e) => updateParameter('authValue', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="secret-token"
                    />
                </div>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="respondImmediately"
                    checked={(parameters.respondImmediately as boolean) ?? false}
                    onChange={(e) => updateParameter('respondImmediately', e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="respondImmediately" className="text-sm text-slate-700">
                    Respond immediately (don't wait for workflow completion)
                </label>
            </div>
        </div>
    );
}
