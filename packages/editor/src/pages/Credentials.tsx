import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Database, X, Eye, EyeOff, Users, Share2, Pencil } from 'lucide-react';
import { credentialsApi, groupsApi, type CredentialWithAccess } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: string;
  name: string;
  role?: string;
}

interface CredentialData {
  // Basic Auth
  username?: string;
  password?: string;
  // Bearer Token / API Key
  token?: string;
  apiKey?: string;
  // Database
  host?: string;
  port?: number;
  database?: string;
  // SSH
  privateKey?: string;
  passphrase?: string;
  // TLS/SSL
  useTls?: boolean;
  tlsCert?: string;
  tlsKey?: string;
  tlsCa?: string;
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  // Snowflake specific
  account?: string;
  warehouse?: string;
  role?: string;
  // WinRM
  domain?: string;
  useHttps?: boolean;
}

// Define which fields each credential type needs
const credentialFields: Record<string, { label: string; field: keyof CredentialData; type: 'text' | 'password' | 'textarea' | 'number' | 'checkbox' }[]> = {
  httpBasicAuth: [
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
  ],
  httpBearerToken: [
    { label: 'Token', field: 'token', type: 'password' },
  ],
  apiKey: [
    { label: 'API Key', field: 'apiKey', type: 'password' },
  ],
  oauth2: [
    { label: 'Client ID', field: 'clientId', type: 'text' },
    { label: 'Client Secret', field: 'clientSecret', type: 'password' },
    { label: 'Access Token', field: 'accessToken', type: 'password' },
    { label: 'Refresh Token', field: 'refreshToken', type: 'password' },
  ],
  winrmCredentials: [
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Domain', field: 'domain', type: 'text' },
    { label: 'Use HTTPS', field: 'useHttps', type: 'checkbox' },
  ],
  sshCredentials: [
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password (optional)', field: 'password', type: 'password' },
    { label: 'Private Key', field: 'privateKey', type: 'textarea' },
    { label: 'Passphrase (optional)', field: 'passphrase', type: 'password' },
  ],
  mssqlCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Database', field: 'database', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
  ],
  postgresqlCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Database', field: 'database', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
    { label: 'TLS Certificate', field: 'tlsCert', type: 'textarea' },
  ],
  mysqlCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Database', field: 'database', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
  ],
  cassandraCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
  ],
  redisCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Password (optional)', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
  ],
  valkeyCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Password (optional)', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
  ],
  opensearchCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
  ],
  elasticsearchCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'API Key (alternative)', field: 'apiKey', type: 'password' },
    { label: 'Use TLS', field: 'useTls', type: 'checkbox' },
  ],
  snowflakeCredentials: [
    { label: 'Account', field: 'account', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
    { label: 'Warehouse', field: 'warehouse', type: 'text' },
    { label: 'Database', field: 'database', type: 'text' },
    { label: 'Role (optional)', field: 'role', type: 'text' },
  ],
  prestodbCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password (optional)', field: 'password', type: 'password' },
  ],
  oracleCredentials: [
    { label: 'Host', field: 'host', type: 'text' },
    { label: 'Port', field: 'port', type: 'number' },
    { label: 'Database/Service Name', field: 'database', type: 'text' },
    { label: 'Username', field: 'username', type: 'text' },
    { label: 'Password', field: 'password', type: 'password' },
  ],
  githubCredentials: [
    { label: 'Personal Access Token', field: 'token', type: 'password' },
  ],
};

export function Credentials() {
  useAuth(); // Ensure user is authenticated
  const [credentials, setCredentials] = useState<CredentialWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newCredential, setNewCredential] = useState<{ name: string; type: string; data: CredentialData; groupId: string }>({ name: '', type: '', data: {}, groupId: '' });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  
  // Groups the user belongs to (for sharing)
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  
  // For editing credential
  const [editingCredential, setEditingCredential] = useState<CredentialWithAccess | null>(null);
  const [editGroupId, setEditGroupId] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editData, setEditData] = useState<CredentialData>({});
  const [editShowPasswords, setEditShowPasswords] = useState<Record<string, boolean>>({});

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; credential: CredentialWithAccess } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadCredentials();
    loadUserGroups();
  }, []);

  async function loadUserGroups() {
    try {
      const groups = await groupsApi.list();
      setUserGroups(groups as Group[]);
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }

  async function loadCredentials() {
    try {
      setLoading(true);
      const data = await credentialsApi.list();
      setCredentials(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      await credentialsApi.create({
        name: newCredential.name,
        type: newCredential.type,
        data: newCredential.data as Record<string, unknown>,
        groupId: newCredential.groupId || undefined,
      });
      setShowCreate(false);
      setNewCredential({ name: '', type: '', data: {}, groupId: '' });
      setShowPasswords({});
      setTestResult(null);
      loadCredentials();
    } catch (err) {
      console.error('Create credential error:', err);
      alert((err as Error).message);
    }
  }

  async function handleUpdateCredential() {
    if (!editingCredential) return;
    try {
      // Only include data if there are actual changes (non-empty values)
      const hasDataChanges = Object.values(editData).some(v => v !== '' && v !== undefined && v !== null);
      
      await credentialsApi.update(editingCredential.id, {
        name: editName,
        ...(hasDataChanges && { data: editData as Record<string, unknown> }),
        groupId: editGroupId || null,
      });
      loadCredentials();
      setEditingCredential(null);
      setEditShowPasswords({});
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function openEditModal(credential: CredentialWithAccess) {
    setEditingCredential(credential);
    setEditGroupId(credential.groupId || '');
    setEditName(credential.name);
    // Note: We don't have access to the actual credential data from the list
    // The API would need to return it or we'd need to fetch it
    setEditData({});
    setEditShowPasswords({});
  }

  function updateEditData(field: keyof CredentialData, value: string | number | boolean) {
    setEditData(prev => ({ ...prev, [field]: value }));
  }

  function toggleEditPasswordVisibility(field: string) {
    setEditShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    try {
      await credentialsApi.delete(id);
      loadCredentials();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function updateCredentialData(field: keyof CredentialData, value: string | number | boolean) {
    setNewCredential({
      ...newCredential,
      data: { ...newCredential.data, [field]: value },
    });
  }

  function togglePasswordVisibility(field: string) {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleTestConnectivity() {
    if (!newCredential.type) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      console.log('Testing credentials:', newCredential.type, newCredential.data);
      const result = await credentialsApi.testUnsaved(
        newCredential.type,
        newCredential.data as Record<string, unknown>
      );
      console.log('Test result:', result);
      setTestResult(result);
    } catch (err) {
      console.error('Test error:', err);
      setTestResult({ success: false, message: (err as Error).message || 'Unknown error occurred' });
    } finally {
      setTesting(false);
    }
  }

  // Get fields for the selected credential type
  const currentFields = newCredential.type ? credentialFields[newCredential.type] || [] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Sources</h1>
          <p className="text-slate-500">Manage your database connections and API credentials</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Data Source
        </button>
      </div>

      {credentials.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No data sources yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="bg-white rounded-lg border border-slate-200 p-4 cursor-context-menu"
              onContextMenu={(e) => {
                if (credential.isOwner) {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, credential });
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <Database className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{credential.name}</div>
                    <div className="text-sm text-slate-500">{credential.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {credential.isOwner && (
                    <button
                      onClick={() => {
                        setEditingCredential(credential);
                        setEditGroupId(credential.groupId || '');
                      }}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Share with group"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                  {credential.isOwner && (
                    <button
                      onClick={() => handleDelete(credential.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Updated {new Date(credential.updatedAt).toLocaleDateString()}</span>
                {credential.group && (
                  <span className="flex items-center gap-1 text-primary-600">
                    <Users className="w-3 h-3" />
                    {credential.group.name}
                  </span>
                )}
                {!credential.isOwner && (
                  <span className="text-amber-600">Shared</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={() => {
              openEditModal(contextMenu.credential);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              handleDelete(contextMenu.credential.id);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal when clicking backdrop
            if (e.target === e.currentTarget) {
              setShowCreate(false);
              setNewCredential({ name: '', type: '', data: {}, groupId: '' });
              setShowPasswords({});
              setTestResult(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Credential</h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewCredential({ name: '', type: '', data: {}, groupId: '' });
                  setShowPasswords({});
                  setTestResult(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCredential.name}
                  onChange={(e) => setNewCredential({ ...newCredential, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="My API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={newCredential.type}
                  onChange={(e) => setNewCredential({ ...newCredential, type: e.target.value, data: {} })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select type...</option>
                  <option value="httpBasicAuth">HTTP Basic Auth</option>
                  <option value="httpBearerToken">HTTP Bearer Token</option>
                  <option value="apiKey">API Key</option>
                  <option value="oauth2">OAuth2</option>
                  <option value="githubCredentials">GitHub</option>
                  <option value="winrmCredentials">WinRM Credentials</option>
                  <option value="sshCredentials">SSH Credentials</option>
                  <option value="mssqlCredentials">MS SQL Server</option>
                  <option value="postgresqlCredentials">PostgreSQL</option>
                  <option value="mysqlCredentials">MySQL</option>
                  <option value="oracleCredentials">Oracle</option>
                  <option value="cassandraCredentials">Cassandra</option>
                  <option value="redisCredentials">Redis</option>
                  <option value="valkeyCredentials">Valkey</option>
                  <option value="opensearchCredentials">OpenSearch</option>
                  <option value="elasticsearchCredentials">Elasticsearch</option>
                  <option value="snowflakeCredentials">Snowflake</option>
                  <option value="prestodbCredentials">PrestoDB</option>
                </select>
              </div>

              {/* Share with Group */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Share with Group (optional)
                </label>
                <select
                  value={newCredential.groupId}
                  onChange={(e) => setNewCredential({ ...newCredential, groupId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Private (only you)</option>
                  {userGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Sharing with a group allows all group members to use this credential
                </p>
              </div>

              {/* Dynamic fields based on credential type */}
              {currentFields.length > 0 && (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-slate-700">Credential Details</h3>
                  {currentFields.map((fieldDef) => (
                    <div key={fieldDef.field}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {fieldDef.label}
                      </label>
                      {fieldDef.type === 'checkbox' ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!newCredential.data[fieldDef.field]}
                            onChange={(e) => updateCredentialData(fieldDef.field, e.target.checked)}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-slate-600">Enable</span>
                        </label>
                      ) : fieldDef.type === 'textarea' ? (
                        <textarea
                          value={(newCredential.data[fieldDef.field] as string) || ''}
                          onChange={(e) => updateCredentialData(fieldDef.field, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                          placeholder={fieldDef.label}
                        />
                      ) : fieldDef.type === 'password' ? (
                        <div className="relative">
                          <input
                            type={showPasswords[fieldDef.field] ? 'text' : 'password'}
                            value={(newCredential.data[fieldDef.field] as string) || ''}
                            onChange={(e) => updateCredentialData(fieldDef.field, e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder={fieldDef.label}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(fieldDef.field)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswords[fieldDef.field] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : fieldDef.type === 'number' ? (
                        <input
                          type="number"
                          value={(newCredential.data[fieldDef.field] as number) || ''}
                          onChange={(e) => updateCredentialData(fieldDef.field, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={fieldDef.label}
                        />
                      ) : (
                        <input
                          type="text"
                          value={(newCredential.data[fieldDef.field] as string) || ''}
                          onChange={(e) => updateCredentialData(fieldDef.field, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={fieldDef.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    testResult.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {testResult.message}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={handleTestConnectivity}
                disabled={!newCredential.type || testing}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                    Testing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Test Connectivity
                  </>
                )}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setNewCredential({ name: '', type: '', data: {}, groupId: '' });
                    setShowPasswords({});
                    setTestResult(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newCredential.name || !newCredential.type}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Credential Modal */}
      {editingCredential && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditingCredential(null);
              setEditShowPasswords({});
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Credential</h2>
              <button
                onClick={() => {
                  setEditingCredential(null);
                  setEditShowPasswords({});
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Credential name"
                />
              </div>

              {/* Type (read-only) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                  {editingCredential.type}
                </div>
              </div>

              {/* Share with Group */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Share with Group
                </label>
                <select
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Private (only you)</option>
                  {userGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Group members will be able to use this credential in their workflows
                </p>
              </div>

              {/* Dynamic credential fields based on type */}
              {credentialFields[editingCredential.type] && (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-slate-700">
                    Update Credential Details
                    <span className="text-xs font-normal text-slate-500 ml-2">
                      (leave blank to keep existing values)
                    </span>
                  </h3>
                  {credentialFields[editingCredential.type].map((fieldDef) => (
                    <div key={fieldDef.field}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {fieldDef.label}
                      </label>
                      {fieldDef.type === 'checkbox' ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!editData[fieldDef.field]}
                            onChange={(e) => updateEditData(fieldDef.field, e.target.checked)}
                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-slate-600">Enable</span>
                        </label>
                      ) : fieldDef.type === 'textarea' ? (
                        <textarea
                          value={(editData[fieldDef.field] as string) || ''}
                          onChange={(e) => updateEditData(fieldDef.field, e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                          placeholder={`Enter new ${fieldDef.label.toLowerCase()}`}
                        />
                      ) : fieldDef.type === 'password' ? (
                        <div className="relative">
                          <input
                            type={editShowPasswords[fieldDef.field] ? 'text' : 'password'}
                            value={(editData[fieldDef.field] as string) || ''}
                            onChange={(e) => updateEditData(fieldDef.field, e.target.value)}
                            className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder={`Enter new ${fieldDef.label.toLowerCase()}`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleEditPasswordVisibility(fieldDef.field)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {editShowPasswords[fieldDef.field] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ) : fieldDef.type === 'number' ? (
                        <input
                          type="number"
                          value={(editData[fieldDef.field] as number) || ''}
                          onChange={(e) => updateEditData(fieldDef.field, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`Enter new ${fieldDef.label.toLowerCase()}`}
                        />
                      ) : (
                        <input
                          type="text"
                          value={(editData[fieldDef.field] as string) || ''}
                          onChange={(e) => updateEditData(fieldDef.field, e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={`Enter new ${fieldDef.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingCredential(null);
                  setEditShowPasswords({});
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCredential}
                disabled={!editName}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
