/**
 * Auth guard component that protects routes
 * Supports both SSO and local authentication
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogIn, Loader2, AlertCircle } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { loading, authenticated, config, error, login, ssoEnabled, clearError } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if any
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Authentication Error</h1>
          <p className="text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => {
              clearError();
              if (ssoEnabled) {
                login();
              } else {
                window.location.href = '/login';
              }
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If not authenticated
  if (!authenticated) {
    // If SSO is enabled, show SSO login screen
    if (ssoEnabled) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to Twiddle</h1>
            <p className="text-slate-500 mb-6">
              Sign in with your organization account to continue
            </p>
            <button
              onClick={login}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <LogIn className="w-5 h-5" />
              Sign in with {config?.provider === 'azure-entra' ? 'Microsoft' : 'SSO'}
            </button>
            <p className="text-xs text-slate-400 mt-4">
              Protected by {config?.provider === 'azure-entra' ? 'Azure Entra ID' : 'Single Sign-On'}
            </p>
          </div>
        </div>
      );
    }

    // For local auth, redirect to login page
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
