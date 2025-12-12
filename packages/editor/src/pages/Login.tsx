import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Workflow, Eye, EyeOff, LogIn, UserPlus, Mail, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { localAuthApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LoginMode = 'login' | 'register' | 'setup' | 'forgot-password' | 'reset-password';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAuth } = useAuth();
  
  const [mode, setMode] = useState<LoginMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    checkSetupRequired();
    
    // Check for reset token in URL
    const token = searchParams.get('token');
    const emailParam = searchParams.get('email');
    if (token && emailParam) {
      setMode('reset-password');
      setResetToken(token);
      setEmail(emailParam);
    }
  }, [searchParams]);

  async function checkSetupRequired() {
    try {
      const { setupRequired } = await localAuthApi.setupRequired();
      if (setupRequired) {
        setMode('setup');
      }
    } catch (err) {
      console.error('Failed to check setup status:', err);
    } finally {
      setCheckingSetup(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'forgot-password') {
        const result = await localAuthApi.forgotPassword({ email });
        setSuccess(result.message);
        
        // In development, show the reset URL if provided
        if (result.resetUrl) {
          console.log('Reset URL:', result.resetUrl);
        }
      } else if (mode === 'reset-password') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const result = await localAuthApi.resetPassword({
          email,
          token: resetToken,
          newPassword: password,
        });
        
        setSuccess(result.message);
        // Redirect to login after a short delay
        setTimeout(() => {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSuccess(null);
        }, 2000);
      } else if (mode === 'register' || mode === 'setup') {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const apiCall = mode === 'setup' ? localAuthApi.setup : localAuthApi.register;
        const result = await apiCall({ email, password, name: name || undefined });
        
        if (result.success) {
          await refreshAuth();
          navigate('/workflows');
        }
      } else {
        const result = await localAuthApi.login({ email, password });
        
        if (result.success) {
          await refreshAuth();
          navigate('/workflows');
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Workflow className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Twiddle</h1>
          <p className="text-slate-500 mt-2">Workflow Automation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            {mode === 'setup' && 'Create Admin Account'}
            {mode === 'login' && 'Sign In'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot-password' && 'Reset Password'}
            {mode === 'reset-password' && 'Set New Password'}
          </h2>

          {mode === 'setup' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Welcome! Create your admin account to get started.
              </p>
            </div>
          )}

          {mode === 'forgot-password' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
          )}

          {mode === 'reset-password' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Enter your new password below.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === 'register' || mode === 'setup') && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
            )}

            {/* Email field - shown for all modes except reset-password (email is pre-filled) */}
            {mode !== 'reset-password' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}

            {/* Show email as read-only for reset-password */}
            {mode === 'reset-password' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                  disabled
                />
              </div>
            )}

            {/* Password field - not shown for forgot-password */}
            {mode !== 'forgot-password' && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  {mode === 'reset-password' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {(mode === 'register' || mode === 'setup' || mode === 'reset-password') && (
                  <p className="text-xs text-slate-500 mt-1">
                    At least 8 characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>
            )}

            {/* Confirm password - shown for register, setup, and reset-password */}
            {(mode === 'register' || mode === 'setup' || mode === 'reset-password') && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  {mode === 'login' && <><LogIn className="w-5 h-5" /> Sign In</>}
                  {mode === 'register' && <><UserPlus className="w-5 h-5" /> Create Account</>}
                  {mode === 'setup' && <><UserPlus className="w-5 h-5" /> Create Admin Account</>}
                  {mode === 'forgot-password' && <><Mail className="w-5 h-5" /> Send Reset Link</>}
                  {mode === 'reset-password' && <><KeyRound className="w-5 h-5" /> Reset Password</>}
                </>
              )}
            </button>
          </form>

          {mode !== 'setup' && (
            <div className="mt-6 text-center space-y-3">
              {mode === 'login' && (
                <>
                  <p className="text-sm text-slate-600">
                    <button
                      onClick={() => { setMode('forgot-password'); setError(null); setSuccess(null); }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Forgot your password?
                    </button>
                  </p>
                  <p className="text-sm text-slate-600">
                    Don't have an account?{' '}
                    <button
                      onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Sign up
                    </button>
                  </p>
                </>
              )}
              
              {mode === 'register' && (
                <p className="text-sm text-slate-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}

              {(mode === 'forgot-password' || mode === 'reset-password') && (
                <p className="text-sm text-slate-600">
                  <button
                    onClick={() => { setMode('login'); setError(null); setSuccess(null); setPassword(''); setConfirmPassword(''); }}
                    className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          Powered by Temporal
        </p>
      </div>
    </div>
  );
}
