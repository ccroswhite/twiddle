/**
 * Authentication context for React
 * Supports both SSO (Azure Entra) and local authentication
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  fetchAuthConfig,
  fetchCurrentUser,
  login as authLogin,
  logout as authLogout,
  getAuthError,
  type AuthConfig,
  type User,
} from '@/lib/auth';
import { localAuthApi } from '@/lib/api';

interface AuthContextValue {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  config: AuthConfig | null;
  error: string | null;
  ssoEnabled: boolean;
  login: () => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAuth = useCallback(async () => {
    try {
      // Fetch auth config (SSO settings)
      const authConfig = await fetchAuthConfig();
      setConfig(authConfig);

      // If SSO is enabled, check SSO session
      if (authConfig.enabled) {
        const { authenticated: isAuth, user: currentUser } = await fetchCurrentUser();
        setAuthenticated(isAuth);
        setUser(currentUser);
      } else {
        // SSO not enabled, check local auth session
        try {
          const { authenticated: isAuth, user: currentUser } = await localAuthApi.me();
          setAuthenticated(isAuth);
          setUser(currentUser);
        } catch {
          // Not authenticated
          setAuthenticated(false);
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Failed to load auth state:', err);
      setError('Failed to load authentication state');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check for auth errors in URL
    const authError = getAuthError();
    if (authError) {
      setError(decodeURIComponent(authError));
    }

    loadAuth();
  }, [loadAuth]);

  const login = () => {
    // For SSO, redirect to login
    if (config?.enabled) {
      authLogin();
    }
    // For local auth, the Login page handles it
  };

  const logout = async () => {
    try {
      if (config?.enabled) {
        // SSO logout
        await authLogout();
      } else {
        // Local auth logout
        await localAuthApi.logout();
        setAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed');
    }
  };

  const refreshAuth = useCallback(async () => {
    setLoading(true);
    await loadAuth();
  }, [loadAuth]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextValue = {
    loading,
    authenticated,
    user,
    config,
    error,
    ssoEnabled: config?.enabled ?? false,
    login,
    logout,
    refreshAuth,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
