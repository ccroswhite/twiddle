import { request } from './request';
import type { Group, GroupCreateInput, GroupUpdateInput, GroupMember, Workflow } from '@twiddle/shared';

export const groupsApi = {
    list: () => request<Group[]>('/groups'),
    get: (id: string) => request<Group>(`/groups/${id}`),
    create: (data: GroupCreateInput) =>
        request<Group>('/groups', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    update: (id: string, data: GroupUpdateInput) =>
        request<Group>(`/groups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    delete: (id: string) =>
        request<void>(`/groups/${id}`, {
            method: 'DELETE',
        }),
    // Members
    listMembers: (groupId: string) =>
        request<GroupMember[]>(`/groups/${groupId}/members`),
    addMember: (groupId: string, userId: string, role = 'member') =>
        request<GroupMember>(`/groups/${groupId}/members`, {
            method: 'POST',
            body: JSON.stringify({ userId, role }),
        }),
    updateMember: (groupId: string, memberId: string, role: string) =>
        request<GroupMember>(`/groups/${groupId}/members/${memberId}`, {
            method: 'PUT',
            body: JSON.stringify({ role }),
        }),
    removeMember: (groupId: string, memberId: string) =>
        request<void>(`/groups/${groupId}/members/${memberId}`, {
            method: 'DELETE',
        }),
    // Workflows
    listWorkflows: (groupId: string) =>
        request<Workflow[]>(`/groups/${groupId}/workflows`),
};
