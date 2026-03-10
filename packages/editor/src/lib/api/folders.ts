import { request } from './request';
import type { Folder, FolderCreateInput, FolderUpdateInput, FolderPermission, FolderPermissionLevel, Workflow } from '@twiddle/shared';

export const foldersApi = {
    list: (parentId?: string) =>
        request<Folder[]>(`/folders${parentId ? `?parentId=${parentId}` : ''}`),
    get: (id: string) => request<Folder>(`/folders/${id}`),
    create: (data: FolderCreateInput) =>
        request<Folder>('/folders', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: FolderUpdateInput) =>
        request<Folder>(`/folders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        request<void>(`/folders/${id}`, {
            method: 'DELETE',
        }),
    addWorkflow: (folderId: string, workflowId: string) =>
        request<Workflow>(`/folders/${folderId}/workflows`, {
            method: 'POST',
            body: JSON.stringify({ workflowId }),
        }),
    removeWorkflow: (folderId: string, workflowId: string) =>
        request<Workflow>(`/folders/${folderId}/workflows/${workflowId}`, {
            method: 'DELETE',
        }),
    // Permissions
    getPermissions: (folderId: string) =>
        request<FolderPermission[]>(`/folders/${folderId}/permissions`),
    addPermission: (
        folderId: string,
        data: { userId?: string; groupId?: string; permission: FolderPermissionLevel }
    ) =>
        request<FolderPermission>(`/folders/${folderId}/permissions`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updatePermission: (
        folderId: string,
        permissionId: string,
        data: { permission: FolderPermissionLevel }
    ) =>
        request<FolderPermission>(`/folders/${folderId}/permissions/${permissionId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    deletePermission: (folderId: string, permissionId: string) =>
        request<void>(`/folders/${folderId}/permissions/${permissionId}`, {
            method: 'DELETE',
        }),
};
