/**
 * Authentication utilities for the frontend
 */

export interface AuthConfig {
  enabled: boolean;
  provider: 'azure-entra' | 'none';
  clientId?: string;
  tenantId?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  provider?: string;
  isAdmin?: boolean;
}

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  config: AuthConfig | null;
}

const API_BASE = '/api/auth';

/**
 * Fetch auth configuration
 */
export async function fetchAuthConfig(): Promise<AuthConfig> {
  const response = await fetch(`${API_BASE}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch auth config');
  }
  return response.json();
}

/**
 * Fetch current user session
 */
export async function fetchCurrentUser(): Promise<{ authenticated: boolean; user: User | null }> {
  const response = await fetch(`${API_BASE}/me`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

/**
 * Initiate login flow
 */
export function login(): void {
  window.location.href = `${API_BASE}/login`;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Logout failed');
  }
  
  const data = await response.json() as { success: boolean; logoutUrl?: string };
  
  // If there's a logout URL (for SSO), redirect to it
  if (data.logoutUrl) {
    window.location.href = data.logoutUrl;
  } else {
    // Otherwise just reload the page
    window.location.reload();
  }
}

/**
 * Check for auth errors in URL
 */
export function getAuthError(): string | null {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('auth_error');
  
  if (error) {
    // Clean up URL
    const url = new URL(window.location.href);
    url.searchParams.delete('auth_error');
    window.history.replaceState({}, '', url.toString());
  }
  
  return error;
}
