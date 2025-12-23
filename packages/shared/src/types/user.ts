/**
 * User and authentication types for Twiddle
 */

export interface User {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role: string;
}

export interface AuthResponse {
    success: boolean;
    user?: AuthUser;
    error?: string;
}

export interface AuthMeResponse {
    authenticated: boolean;
    user: AuthUser | null;
}
