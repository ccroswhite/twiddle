import { request } from './request';
import type { PromotionStatus } from '@twiddle/shared';

export const promotionsApi = {
    list: (status?: PromotionStatus, workflowId?: string) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (workflowId) params.append('workflowId', workflowId);
        return request(`/promotions?${params.toString()}`);
    },
    request: (workflowId: string, notes?: string) =>
        request('/promotions', {
            method: 'POST',
            body: JSON.stringify({ workflowId, notes }),
        }),
    approve: (id: string, notes?: string) =>
        request(`/promotions/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),
    reject: (id: string, notes?: string) =>
        request(`/promotions/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),
};
