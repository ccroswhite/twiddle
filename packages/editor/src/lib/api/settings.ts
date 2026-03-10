import { request } from './request';
import type { SystemSettings } from '@twiddle/shared';

export const settingsApi = {
    get: () => request<SystemSettings>('/settings'),
    update: (data: Partial<SystemSettings>) =>
        request<SystemSettings>('/settings', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    testSso: () =>
        request<{ success: boolean; message: string }>('/settings/sso/test', {
            method: 'POST',
        }),
};
