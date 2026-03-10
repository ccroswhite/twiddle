import { request } from './request';

export const nodesApi = {
    list: () => request('/nodes'),
    get: (type: string) => request(`/nodes/${type}`),
    getAll: () => request('/nodes/all'),
    search: (query: string) => request(`/nodes/search?q=${encodeURIComponent(query)}`),
    byCategory: (category: string) => request(`/nodes/category/${encodeURIComponent(category)}`),
};
