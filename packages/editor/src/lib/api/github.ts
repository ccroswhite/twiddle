import { request } from './request';
import type { GitHubUser, GitHubRepo, GitHubStatus } from '@twiddle/shared';

export const githubApi = {
    validateToken: (token: string) =>
        request<{ valid: boolean; user?: GitHubUser; error?: string }>('/github/validate', {
            method: 'POST',
            body: JSON.stringify({ token }),
        }),
    listRepos: (credentialId: string) =>
        request<GitHubRepo[]>(`/github/repos?credentialId=${credentialId}`),
    checkRepo: (owner: string, repo: string, credentialId: string) =>
        request<{ exists: boolean }>(`/github/repos/check?owner=${owner}&repo=${repo}&credentialId=${credentialId}`),
    createRepo: (data: {
        owner: string;
        repo: string;
        credentialId: string;
        description?: string;
        isPrivate?: boolean;
    }) =>
        request<{ success: boolean; cloneUrl?: string; repoUrl?: string; error?: string }>('/github/repos/create', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    cloneRepo: (data: {
        owner: string;
        repo: string;
        credentialId: string;
        branch?: string;
    }) =>
        request<{ success: boolean; localPath?: string; error?: string }>('/github/repos/clone', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    initRepo: (data: {
        owner: string;
        repo: string;
        credentialId: string;
        workflowId: string;
        description?: string;
        isPrivate?: boolean;
        branch?: string;
    }) =>
        request<{ success: boolean; localPath?: string; repoUrl?: string; error?: string }>('/github/repos/init', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    connectRepo: (data: {
        workflowId: string;
        owner: string;
        repo: string;
        credentialId: string;
        branch?: string;
        path?: string;
    }) =>
        request<{ success: boolean; localPath?: string; error?: string }>('/github/repos/connect', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    disconnectRepo: (workflowId: string) =>
        request<{ success: boolean }>('/github/repos/disconnect', {
            method: 'POST',
            body: JSON.stringify({ workflowId }),
        }),
    getStatus: (workflowId: string) =>
        request<GitHubStatus>(`/github/workflows/${workflowId}/status`),
};
