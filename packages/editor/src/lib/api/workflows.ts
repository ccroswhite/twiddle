import { request } from './request';
import type { WorkflowCreateInput, WorkflowUpdateInput } from '@twiddle/shared';

export const workflowsApi = {
    list: () => request('/workflows'),
    get: (id: string) => request(`/workflows/${id}`),
    create: (data: WorkflowCreateInput) =>
        request('/workflows', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: WorkflowUpdateInput) =>
        request(`/workflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        request(`/workflows/${id}`, {
            method: 'DELETE',
        }),
    exportPython: (id: string) =>
        request(`/workflows/${id}/export/python`, {
            headers: {
                Accept: 'application/octet-stream',
            },
        }).then(async () => {
            // Handle file download
            const response = await fetch(`/api/workflows/${id}/export/python`);
            if (!response.ok) throw new Error('Failed to export workflow');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow-${id}-python.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }),
    exportPythonJson: (id: string) =>
        request(`/workflows/${id}/export/python-json`, {
            method: 'GET',
        }),
    exportAirflow: (id: string) =>
        request(`/workflows/${id}/export/airflow`, {
            headers: {
                Accept: 'application/octet-stream',
            },
        }).then(async () => {
            // Handle file download
            const response = await fetch(`/api/workflows/${id}/export/airflow`);
            if (!response.ok) throw new Error('Failed to export workflow');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow-${id}-airflow.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }),
    exportAirflowJson: (id: string) =>
        request(`/workflows/${id}/export/airflow-json`, {
            method: 'GET',
        }),
    exportIR: (id: string) =>
        request(`/workflows/${id}/export/ir`, {
            headers: {
                Accept: 'application/octet-stream',
            },
        }).then(async () => {
            const response = await fetch(`/api/workflows/${id}/export/ir`);
            if (!response.ok) throw new Error('Failed to export workflow IR');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow-${id}-ir.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }),
    importWorkflow: (data: {
        workflowName?: string;
        workflowDescription?: string;
        definition: {
            nodes: unknown[];
            connections: unknown[];
            settings?: unknown;
            tags?: string[];
        };
        groupId?: string;
    }) =>
        request('/workflows/import', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    promote: (id: string, targetEnvironment: 'UT' | 'LT' | 'PD') =>
        request(`/workflows/${id}/promote`, {
            method: 'POST',
            body: JSON.stringify({ targetEnvironment }),
        }),
    demote: (id: string, targetEnvironment: 'DV' | 'UT' | 'LT') =>
        request(`/workflows/${id}/demote`, {
            method: 'POST',
            body: JSON.stringify({ targetEnvironment }),
        }),
    heartbeat: (id: string) =>
        request(`/workflows/${id}/heartbeat`, {
            method: 'POST',
        }),
    requestLock: (id: string) =>
        request(`/workflows/${id}/lock/request`, {
            method: 'POST',
        }),
    resolveLock: (id: string, action: 'ACCEPT' | 'DENY') =>
        request(`/workflows/${id}/lock/resolve`, {
            method: 'POST',
            body: JSON.stringify({ action }),
        }),
    unlock: (id: string) =>
        request(`/workflows/${id}/lock`, {
            method: 'DELETE',
        }),
    getVersions: (id: string) => request(`/workflows/${id}/versions`),
    getVersion: (id: string, versionId: string) => request(`/workflows/${id}/versions/${versionId}`),
};
