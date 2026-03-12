import { request } from './request';
import type { DataSourceCreateInput, DataSourceUpdateInput } from '@twiddle/shared';

export interface DataSourcePermissionMap {
    groupId: string;
    permission: 'READ' | 'WRITE' | 'ADMIN';
}

export const datasourcesApi = {
    list: () => request('/datasources'),
    get: (id: string) => request(`/datasources/${id}`),
    getForEdit: (id: string) => request(`/datasources/${id}/edit`),
    create: (data: DataSourceCreateInput & { groupPermissions?: DataSourcePermissionMap[] }) =>
        request('/datasources', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: DataSourceUpdateInput & { groupPermissions?: DataSourcePermissionMap[] }) =>
        request(`/datasources/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        request(`/datasources/${id}`, {
            method: 'DELETE',
        }),
    test: (id: string) =>
        request(`/datasources/${id}/test`, {
            method: 'POST',
        }),
    // Test data source without saving (for the create form)
    testUnsaved: (type: string, data: Record<string, unknown>) =>
        request<any>(`/datasources/test`, {
            method: 'POST',
            body: JSON.stringify({ type, data }),
        }),
};

// Backwards compatibility alias
export const credentialsApi = datasourcesApi;
