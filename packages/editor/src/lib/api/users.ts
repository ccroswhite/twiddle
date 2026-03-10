import { request } from './request';
import type { User, Group } from '@twiddle/shared';

export const usersApi = {
    list: () => request<User[]>('/users'),
    get: (id: string) => request<User>(`/users/${id}`),
    me: () => request<User>('/users/me'),
    getGroups: (userId: string) => request<Group[]>(`/users/${userId}/groups`),
};
