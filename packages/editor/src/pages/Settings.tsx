import { useState, useEffect } from 'react';
import { User, Lock, Shield, Bell, Palette, Settings as SettingsIcon, Key, Server, Save, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { localAuthApi, settingsApi, type SystemSettings } from '@/lib/api';

export function Settings() {
  const { user, ssoEnabled } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  const [activeTab, setActiveTab] = useState('profile');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // System settings state (admin only)
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ssoTestResult, setSsoTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ssoTesting, setSsoTesting] = useState(false);

  // Build tabs based on user role
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    // Admin-only tabs
    ...(isAdmin ? [
      { id: 'sso', label: 'SSO / Authentication', icon: Key },
      { id: 'general', label: 'General', icon: SettingsIcon },
      { id: 'temporal', label: 'Temporal', icon: Server },
    ] : []),
  ];

  // Load system settings for admins
  useEffect(() => {
    if (isAdmin && ['sso', 'general', 'temporal'].includes(activeTab)) {
      loadSettings();
    }
  }, [isAdmin, activeTab]);

  async function loadSettings() {
    if (systemSettings) return; // Already loaded
    setSettingsLoading(true);
    try {
      const settings = await settingsApi.get();
      setSystemSettings(settings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setSettingsMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setSettingsLoading(false);
    }
  }

  async function saveSettings() {
    if (!systemSettings) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const updated = await settingsApi.update(systemSettings);
      setSystemSettings(updated);
      setSettingsMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err) {
      setSettingsMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function testSsoConnection() {
    setSsoTesting(true);
    setSsoTestResult(null);
    try {
      const result = await settingsApi.testSso();
      setSsoTestResult(result);
    } catch (err) {
      setSsoTestResult({ success: false, message: (err as Error).message });
    } finally {
      setSsoTesting(false);
    }
  }

  function updateSsoSettings(updates: Partial<SystemSettings['sso']>) {
    if (!systemSettings) return;
    setSystemSettings({
      ...systemSettings,
      sso: { ...systemSettings.sso, ...updates },
    });
  }

  function updateGeneralSettings(updates: Partial<SystemSettings['general']>) {
    if (!systemSettings) return;
    setSystemSettings({
      ...systemSettings,
      general: { ...systemSettings.general, ...updates },
    });
  }

  function updateSecuritySettings(updates: Partial<SystemSettings['security']>) {
    if (!systemSettings) return;
    setSystemSettings({
      ...systemSettings,
      security: { ...systemSettings.security, ...updates },
    });
  }

  function updateTemporalSettings(updates: Partial<SystemSettings['temporal']>) {
    if (!systemSettings) return;
    setSystemSettings({
      ...systemSettings,
      temporal: { ...systemSettings.temporal, ...updates },
    });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setPasswordLoading(true);
    try {
      await localAuthApi.changePassword({ currentPassword, newPassword });
      setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMessage({ type: 'error', text: (err as Error).message });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Account Type</h3>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {ssoEnabled ? 'SSO Account (Azure Entra)' : 'Local Account'}
                  </span>
                  {user?.isAdmin && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
                
                {ssoEnabled ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-sm text-slate-600">
                      Your account uses Single Sign-On (SSO). Password management is handled by your identity provider.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    {passwordMessage && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          passwordMessage.type === 'success'
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {passwordMessage.text}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        At least 8 characters with uppercase, lowercase, and number
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    >
                      {passwordLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2">Sessions</h3>
                <p className="text-sm text-slate-500">
                  You are currently signed in. Your session will expire after 7 days of inactivity.
                </p>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Notification Preferences</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  Notification settings coming soon.
                </p>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Appearance</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  Theme and appearance settings coming soon.
                </p>
              </div>
            </div>
          )}

          {/* SSO / Authentication Tab (Admin Only) */}
          {activeTab === 'sso' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">SSO / Authentication Settings</h2>
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving || !systemSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {settingsMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  settingsMessage.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {settingsMessage.text}
                </div>
              )}

              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : systemSettings && (
                <div className="space-y-6">
                  {/* Enable SSO */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-slate-900">Enable Single Sign-On</h3>
                      <p className="text-sm text-slate-500">Allow users to authenticate via SSO provider</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={systemSettings.sso.enabled}
                        onChange={(e) => updateSsoSettings({ enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  {/* SSO Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      SSO Provider
                    </label>
                    <select
                      value={systemSettings.sso.provider}
                      onChange={(e) => updateSsoSettings({ provider: e.target.value as 'azure-entra' | 'okta' | 'none' })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!systemSettings.sso.enabled}
                    >
                      <option value="none">None</option>
                      <option value="azure-entra">Microsoft Azure Entra ID (Azure AD)</option>
                      <option value="okta">Okta</option>
                    </select>
                  </div>

                  {/* Azure Entra Configuration */}
                  {systemSettings.sso.enabled && systemSettings.sso.provider === 'azure-entra' && (
                    <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                      <h3 className="font-medium text-slate-900 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Azure Entra ID Configuration
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Client ID (Application ID)
                          </label>
                          <input
                            type="text"
                            value={systemSettings.sso.azureEntra?.clientId || ''}
                            onChange={(e) => updateSsoSettings({
                              azureEntra: { ...systemSettings.sso.azureEntra!, clientId: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Tenant ID (Directory ID)
                          </label>
                          <input
                            type="text"
                            value={systemSettings.sso.azureEntra?.tenantId || ''}
                            onChange={(e) => updateSsoSettings({
                              azureEntra: { ...systemSettings.sso.azureEntra!, tenantId: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={systemSettings.sso.azureEntra?.clientSecret || ''}
                            onChange={(e) => updateSsoSettings({
                              azureEntra: { ...systemSettings.sso.azureEntra!, clientSecret: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Redirect URI
                          </label>
                          <input
                            type="text"
                            value={systemSettings.sso.azureEntra?.redirectUri || ''}
                            onChange={(e) => updateSsoSettings({
                              azureEntra: { ...systemSettings.sso.azureEntra!, redirectUri: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="https://your-domain.com/api/auth/callback"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Okta Configuration */}
                  {systemSettings.sso.enabled && systemSettings.sso.provider === 'okta' && (
                    <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                      <h3 className="font-medium text-slate-900 flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Okta Configuration
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={systemSettings.sso.okta?.clientId || ''}
                            onChange={(e) => updateSsoSettings({
                              okta: { ...systemSettings.sso.okta!, clientId: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="0oaxxxxxxxxxxxxxxxx"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Okta Domain
                          </label>
                          <input
                            type="text"
                            value={systemSettings.sso.okta?.domain || ''}
                            onChange={(e) => updateSsoSettings({
                              okta: { ...systemSettings.sso.okta!, domain: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="your-org.okta.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={systemSettings.sso.okta?.clientSecret || ''}
                            onChange={(e) => updateSsoSettings({
                              okta: { ...systemSettings.sso.okta!, clientSecret: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Redirect URI
                          </label>
                          <input
                            type="text"
                            value={systemSettings.sso.okta?.redirectUri || ''}
                            onChange={(e) => updateSsoSettings({
                              okta: { ...systemSettings.sso.okta!, redirectUri: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="https://your-domain.com/api/auth/callback"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test SSO Connection */}
                  {systemSettings.sso.enabled && systemSettings.sso.provider !== 'none' && (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={testSsoConnection}
                        disabled={ssoTesting}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${ssoTesting ? 'animate-spin' : ''}`} />
                        {ssoTesting ? 'Testing...' : 'Test Connection'}
                      </button>
                      {ssoTestResult && (
                        <span className={`text-sm ${ssoTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {ssoTestResult.message}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Password Policy */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-medium text-slate-900 mb-4">Password Policy</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Minimum Length
                        </label>
                        <input
                          type="number"
                          value={systemSettings.security.passwordMinLength}
                          onChange={(e) => updateSecuritySettings({ passwordMinLength: parseInt(e.target.value) || 8 })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min={6}
                          max={32}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={systemSettings.security.passwordRequireUppercase}
                            onChange={(e) => updateSecuritySettings({ passwordRequireUppercase: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">Require uppercase letter</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={systemSettings.security.passwordRequireLowercase}
                            onChange={(e) => updateSecuritySettings({ passwordRequireLowercase: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">Require lowercase letter</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={systemSettings.security.passwordRequireNumber}
                            onChange={(e) => updateSecuritySettings({ passwordRequireNumber: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">Require number</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={systemSettings.security.passwordRequireSpecial}
                            onChange={(e) => updateSecuritySettings({ passwordRequireSpecial: e.target.checked })}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">Require special character</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* General Settings Tab (Admin Only) */}
          {activeTab === 'general' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving || !systemSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : systemSettings && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={systemSettings.general.siteName}
                      onChange={(e) => updateGeneralSettings({ siteName: e.target.value })}
                      className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={systemSettings.general.allowRegistration}
                        onChange={(e) => updateGeneralSettings({ allowRegistration: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <div>
                        <span className="font-medium text-slate-900">Allow Registration</span>
                        <p className="text-sm text-slate-500">Allow new users to create accounts</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={systemSettings.general.requireEmailVerification}
                        onChange={(e) => updateGeneralSettings({ requireEmailVerification: e.target.checked })}
                        className="rounded border-slate-300"
                      />
                      <div>
                        <span className="font-medium text-slate-900">Require Email Verification</span>
                        <p className="text-sm text-slate-500">Users must verify their email before accessing the system</p>
                      </div>
                    </label>
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-medium text-slate-900 mb-4">Session Settings</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Session Duration (days)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.security.sessionDurationDays}
                          onChange={(e) => updateSecuritySettings({ sessionDurationDays: parseInt(e.target.value) || 7 })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min={1}
                          max={90}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Max Login Attempts
                        </label>
                        <input
                          type="number"
                          value={systemSettings.security.maxLoginAttempts}
                          onChange={(e) => updateSecuritySettings({ maxLoginAttempts: parseInt(e.target.value) || 5 })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min={1}
                          max={20}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Lockout Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={systemSettings.security.lockoutDurationMinutes}
                          onChange={(e) => updateSecuritySettings({ lockoutDurationMinutes: parseInt(e.target.value) || 15 })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          min={1}
                          max={1440}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Temporal Settings Tab (Admin Only) */}
          {activeTab === 'temporal' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Temporal Settings</h2>
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving || !systemSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {settingsSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : systemSettings && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Configure the connection to your Temporal server for workflow execution.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Server Address
                      </label>
                      <input
                        type="text"
                        value={systemSettings.temporal.serverAddress}
                        onChange={(e) => updateTemporalSettings({ serverAddress: e.target.value })}
                        className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="localhost:7233"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        The address of your Temporal server (host:port)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Namespace
                      </label>
                      <input
                        type="text"
                        value={systemSettings.temporal.namespace}
                        onChange={(e) => updateTemporalSettings({ namespace: e.target.value })}
                        className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="default"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        The Temporal namespace for workflows
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Task Queue
                      </label>
                      <input
                        type="text"
                        value={systemSettings.temporal.taskQueue}
                        onChange={(e) => updateTemporalSettings({ taskQueue: e.target.value })}
                        className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="twiddle-tasks"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        The task queue name for workflow workers
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
