import { request } from './request';
import type { AuthResponse, AuthMeResponse } from '@twiddle/shared';

export const localAuthApi = {
    // Check if setup is required (no users exist)
    setupRequired: () =>
        request<{ setupRequired: boolean }>('/auth/local/setup-required'),

    // Initial admin setup
    setup: (data: { email: string; password: string; name?: string }) =>
        request<AuthResponse>('/auth/local/setup', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: 'include',
        }),

    // Register new user
    register: (data: { email: string; password: string; name?: string }) =>
        request<AuthResponse>('/auth/local/register', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: 'include',
        }),

    // Login
    login: (data: { email: string; password: string }) =>
        request<AuthResponse>('/auth/local/login', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: 'include',
        }),

    // Logout
    logout: () =>
        request<{ success: boolean }>('/auth/local/logout', {
            method: 'POST',
            credentials: 'include',
        }),

    // Get current user
    me: () =>
        request<AuthMeResponse>('/auth/local/me', {
            credentials: 'include',
        }),

    // Change password
    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        request<{ success: boolean }>('/auth/local/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
            credentials: 'include',
        }),

    // Request password reset
    forgotPassword: (data: { email: string }) =>
        request<{ success: boolean; message: string; resetToken?: string; resetUrl?: string }>('/auth/local/forgot-password', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Verify reset token
    verifyResetToken: (data: { email: string; token: string }) =>
        request<{ valid: boolean }>('/auth/local/verify-reset-token', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Reset password with token
    resetPassword: (data: { email: string; token: string; newPassword: string }) =>
        request<{ success: boolean; message: string }>('/auth/local/reset-password', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

export const clearAuthData = () => {
    localStorage.removeItem('token');
};

export default localAuthApi;
