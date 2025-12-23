/**
 * GitHub integration types for Twiddle
 */

export interface GitHubUser {
    login: string;
    name?: string;
    avatarUrl?: string;
}

export interface GitHubRepo {
    id: number;
    name: string;
    fullName: string;
    private: boolean;
    defaultBranch: string;
}

export interface GitHubStatus {
    connected: boolean;
    user?: GitHubUser;
    repos?: GitHubRepo[];
}
