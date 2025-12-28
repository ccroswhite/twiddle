import { useState, useEffect } from 'react';
import { workflowsApi } from '@/lib/api';
import type { ParameterEditorProps } from './types';

export function EmbeddedWorkflowNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    const [availableVersions, setAvailableVersions] = useState<any[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    useEffect(() => {
        const workflowId = parameters.workflowId as string;
        if (workflowId) {
            setLoadingVersions(true);
            workflowsApi.getVersions(workflowId)
                .then(versions => setAvailableVersions(versions))
                .catch(err => console.error('Failed to load versions', err))
                .finally(() => setLoadingVersions(false));
        }
    }, [parameters.workflowId]);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Embedded Workflow
                </label>
                <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {parameters.workflowName as string || 'Unknown Workflow'}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Embedded Workflow Policy
                </label>
                <select
                    value={(parameters.versionPolicy as string) || 'locked'}
                    onChange={(e) => {
                        const policy = e.target.value;
                        updateParameter('versionPolicy', policy);
                        if (policy !== 'latest' && policy !== 'locked') {
                            updateParameter('versionPolicy', 'locked');
                            updateParameter('workflowVersion', parseInt(policy));
                        }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loadingVersions}
                >
                    <option value="latest">Latest (Always use newest)</option>
                    <option disabled>──────────────</option>
                    {loadingVersions ? (
                        <option disabled>Loading versions...</option>
                    ) : (
                        availableVersions.map(v => (
                            <option key={v.version} value={v.version}>
                                v{v.version} - {v.version === parameters.workflowVersion ? '(Current) ' : ''} {new Date(v.createdAt).toLocaleDateString()}
                            </option>
                        ))
                    )}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                    "Latest" will auto-update when opening the parent workflow. Selecting a version locks it.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Loaded Version
                </label>
                <div className="text-sm text-slate-600 px-3 py-2">
                    v{parameters.workflowVersion as number}
                </div>
            </div>
        </div>
    );
}
