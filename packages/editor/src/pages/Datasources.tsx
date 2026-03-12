import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Database, X, Users, Share2, Pencil } from 'lucide-react';
import { datasourcesApi, groupsApi, type DataSourceWithAccess, type Group, type DataSourceData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Field definition with support for select and conditional visibility
import { DynamicDataSourceForm } from '../components/datasources/registry';

// Remove the obsolete fields calculation 
export function Datasources() {
  useAuth(); // Ensure user is authenticated
  const [dataSources, setDataSources] = useState<DataSourceWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newDataSource, setNewDataSource] = useState<{
    name: string; type: string; data: DataSourceData; groupPermissions: { groupId: string; permission: 'READ' | 'WRITE' | 'ADMIN' }[]
  }>({ name: '', type: '', data: {}, groupPermissions: [] });
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: Record<string, unknown> } | null>(null);
  const [showTestDetails, setShowTestDetails] = useState(false);
  const [testing, setTesting] = useState(false);

  // Groups the user belongs to (for sharing)
  const [userGroups, setUserGroups] = useState<Group[]>([]);

  // For editing credential
  const [editingDataSource, setEditingDataSource] = useState<DataSourceWithAccess | null>(null);
  const [editGroupPermissions, setEditGroupPermissions] = useState<{ groupId: string; permission: 'READ' | 'WRITE' | 'ADMIN' }[]>([]);
  const [editName, setEditName] = useState<string>('');
  const [editData, setEditData] = useState<DataSourceData>({});
  const [editShowPasswords, setEditShowPasswords] = useState<Record<string, boolean>>({});

  // For sharing data source
  const [sharingDataSource, setSharingDataSource] = useState<DataSourceWithAccess | null>(null);
  const [shareGroupPermissions, setShareGroupPermissions] = useState<{ groupId: string; permission: 'READ' | 'WRITE' | 'ADMIN' }[]>([]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; dataSource: DataSourceWithAccess } | null>(null);
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
    loadDataSources();
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

  async function loadDataSources() {
    try {
      setLoading(true);
      const data = await datasourcesApi.list() as DataSourceWithAccess[];
      setDataSources(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    try {
      await datasourcesApi.create({
        name: newDataSource.name,
        type: newDataSource.type,
        data: newDataSource.data as Record<string, unknown>,
        groupPermissions: newDataSource.groupPermissions,
      });
      setShowCreate(false);
      setNewDataSource({ name: '', type: '', data: {}, groupPermissions: [] });
      setShowPasswords({});
      setTestResult(null);
      loadDataSources();
    } catch (err) {
      console.error('Create credential error:', err);
      alert((err as Error).message);
    }
  }

  async function handleUpdateCredential() {
    if (!editingDataSource) return;
    try {
      // Only include data if there are actual changes (non-empty values)
      const hasDataChanges = Object.values(editData).some(v => v !== '' && v !== undefined && v !== null);

      await datasourcesApi.update(editingDataSource.id, {
        name: editName,
        ...(hasDataChanges && { data: editData as Record<string, unknown> }),
        groupPermissions: editGroupPermissions,
      });
      loadDataSources();
      setEditingDataSource(null);
      setEditShowPasswords({});
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleUpdateSharing() {
    if (!sharingDataSource) return;
    try {
      await datasourcesApi.update(sharingDataSource.id, {
        name: sharingDataSource.name,
        groupPermissions: shareGroupPermissions,
      });
      loadDataSources();
      setSharingDataSource(null);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function openEditModal(dataSource: DataSourceWithAccess) {
    setEditingDataSource(dataSource);
    setEditGroupPermissions(dataSource.permissions || []);
    setEditName(dataSource.name);
    setEditShowPasswords({});

    // Fetch full data source details for editing
    try {
      const fullData = await datasourcesApi.getForEdit(dataSource.id) as any;
      setEditData(fullData.data as DataSourceData);
    } catch (err) {
      console.error('Failed to fetch data source for editing:', err);
      setEditData({});
    }
  }

  function updateEditData(field: keyof DataSourceData, value: string | number | boolean) {
    setEditData((prev: DataSourceData) => ({ ...prev, [field]: value }));
  }

  function toggleEditPasswordVisibility(field: string) {
    setEditShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    try {
      await datasourcesApi.delete(id);
      loadDataSources();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function updateDataSourceData(field: keyof DataSourceData, value: string | number | boolean) {
    setNewDataSource({
      ...newDataSource,
      data: { ...newDataSource.data, [field]: value },
    });
  }

  function togglePasswordVisibility(field: string) {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }

  async function handleTestConnectivity() {
    if (!newDataSource.type) return;

    setTesting(true);
    setTestResult(null);

    try {
      console.log('Testing credentials:', newDataSource.type, newDataSource.data);
      const result = await datasourcesApi.testUnsaved(
        newDataSource.type,
        newDataSource.data as Record<string, unknown>
      ) as any;
      console.log('Test result:', result);
      setTestResult(result);
    } catch (err) {
      console.error('Test error:', err);
      setTestResult({ success: false, message: (err as Error).message || 'Unknown error occurred' });
    } finally {
      setTesting(false);
    }
  }

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

      {dataSources.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No data sources yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map((dataSource) => (
            <div
              key={dataSource.id}
              className="bg-white rounded-lg border border-slate-200 p-4 cursor-context-menu"
              onContextMenu={(e) => {
                if (dataSource.isOwner) {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, dataSource });
                }
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <Database className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{dataSource.name}</div>
                    <div className="text-sm text-slate-500">{dataSource.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {dataSource.isOwner && (
                    <button
                      onClick={() => {
                        setSharingDataSource(dataSource);
                        setShareGroupPermissions(dataSource.permissions || []);
                      }}
                      className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Share with group"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}
                  {dataSource.isOwner && (
                    <button
                      onClick={() => handleDelete(dataSource.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Updated {new Date(dataSource.updatedAt).toLocaleDateString()}</span>
                {dataSource.permissions && dataSource.permissions.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {dataSource.permissions.map(p => p.group.name).join(', ')}
                  </span>
                )}
                {!dataSource.isOwner && (
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
              openEditModal(contextMenu.dataSource);
              setContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              handleDelete(contextMenu.dataSource.id);
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
              setNewDataSource({ name: '', type: '', data: {}, groupPermissions: [] });
              setShowPasswords({});
              setTestResult(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Data Source</h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewDataSource({ name: '', type: '', data: {}, groupPermissions: [] });
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
                  value={newDataSource.name}
                  onChange={(e) => setNewDataSource({ ...newDataSource, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Data source name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data Source</label>
                <select
                  value={newDataSource.type}
                  onChange={(e) => setNewDataSource({ ...newDataSource, type: e.target.value, data: {} })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select data source...</option>
                  <option value="mssqlDatasource">MS SQL Server</option>
                  <option value="postgresqlDatasource">PostgreSQL</option>
                  <option value="mysqlDatasource">MySQL</option>
                  <option value="oracleDatasource">Oracle</option>
                  <option value="cassandraDatasource">Cassandra</option>
                  <option value="redisDatasource">Redis</option>
                  <option value="valkeyDatasource">Valkey</option>
                  <option value="opensearchDatasource">OpenSearch</option>
                  <option value="elasticsearchDatasource">Elasticsearch</option>
                  <option value="snowflakeDatasource">Snowflake</option>
                  <option value="prestodbDatasource">PrestoDB</option>
                  <option value="oauth2">OAuth2 / OIDC</option>
                  <option value="sshDatasource">SSH</option>
                  <option value="winrmDatasource">WinRM</option>
                  <option value="githubDatasource">GitHub</option>
                </select>
              </div>

              {/* Share with Groups */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Share with Groups (optional)
                </label>
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {userGroups.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No groups available</div>
                  ) : (
                    userGroups.map((group) => {
                      const existingPerm = newDataSource.groupPermissions.find(p => p.groupId === group.id);
                      return (
                        <div key={group.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                          <label className="flex items-center gap-2 flex-grow cursor-pointer">
                            <input
                              type="checkbox"
                              checked={existingPerm !== undefined}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewDataSource({
                                    ...newDataSource,
                                    groupPermissions: [...newDataSource.groupPermissions, { groupId: group.id, permission: 'READ' }]
                                  });
                                } else {
                                  setNewDataSource({
                                    ...newDataSource,
                                    groupPermissions: newDataSource.groupPermissions.filter(p => p.groupId !== group.id)
                                  });
                                }
                              }}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-slate-700">{group.name}</span>
                          </label>
                          {existingPerm && (
                            <select
                              value={existingPerm.permission}
                              onChange={(e) => {
                                const level = e.target.value as 'READ' | 'WRITE' | 'ADMIN';
                                setNewDataSource({
                                  ...newDataSource,
                                  groupPermissions: newDataSource.groupPermissions.map(p =>
                                    p.groupId === group.id ? { ...p, permission: level } : p
                                  )
                                });
                              }}
                              className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="READ">Read</option>
                              <option value="WRITE">Write</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  All members of selected groups will be able to use this data source.
                </p>
              </div>

              {/* Dynamic fields based on credential type */}
              {newDataSource.type && (
                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <h3 className="text-sm font-medium text-slate-700">Connection Details</h3>
                  <DynamicDataSourceForm
                    type={newDataSource.type}
                    data={newDataSource.data}
                    onDataChange={updateDataSourceData}
                    showPasswords={showPasswords}
                    onTogglePasswordVisibility={togglePasswordVisibility}
                    isEditMode={false}
                  />
                </div>
              )}

              {/* Test Result */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg text-sm ${testResult.success
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className="flex-1">{testResult.message}</span>
                    {testResult.details && (
                      <button
                        type="button"
                        onClick={() => setShowTestDetails(!showTestDetails)}
                        className="text-xs underline opacity-75 hover:opacity-100"
                      >
                        {showTestDetails ? 'Hide details' : 'Show details'}
                      </button>
                    )}
                  </div>
                  {showTestDetails && testResult.details && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <pre className="text-xs whitespace-pre-wrap font-mono opacity-90 overflow-x-auto">
                        {JSON.stringify(testResult.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between gap-3 mt-6">
              <button
                onClick={handleTestConnectivity}
                disabled={!newDataSource.type || testing}
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
                    setNewDataSource({ name: '', type: '', data: {}, groupPermissions: [] });
                    setShowPasswords({});
                    setTestResult(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newDataSource.name || !newDataSource.type}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div >
      )
      }

      {/* Edit Credential Modal */}
      {
        editingDataSource && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditingDataSource(null);
                setEditShowPasswords({});
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Edit Data Source</h2>
                <button
                  onClick={() => {
                    setEditingDataSource(null);
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
                    placeholder="Data source name"
                  />
                </div>

                {/* Type (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                    {editingDataSource.type}
                  </div>
                </div>

                {/* Share with Groups */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Share with Groups
                  </label>
                  <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {userGroups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">No groups available</div>
                    ) : (
                      userGroups.map((group) => {
                        const existingPerm = editGroupPermissions.find(p => p.groupId === group.id);
                        return (
                          <div key={group.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                            <label className="flex items-center gap-2 flex-grow cursor-pointer">
                              <input
                                type="checkbox"
                                checked={existingPerm !== undefined}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditGroupPermissions([...editGroupPermissions, { groupId: group.id, permission: 'READ' }]);
                                  } else {
                                    setEditGroupPermissions(editGroupPermissions.filter(p => p.groupId !== group.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-slate-700">{group.name}</span>
                            </label>
                            {existingPerm && (
                              <select
                                value={existingPerm.permission}
                                onChange={(e) => {
                                  const level = e.target.value as 'READ' | 'WRITE' | 'ADMIN';
                                  setEditGroupPermissions(editGroupPermissions.map(p =>
                                    p.groupId === group.id ? { ...p, permission: level } : p
                                  ));
                                }}
                                className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="READ">Read</option>
                                <option value="WRITE">Write</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    All members of selected groups will be able to use this data source.
                  </p>
                </div>

                {/* Dynamic credential fields based on type */}
                {editingDataSource.type && (
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <h3 className="text-sm font-medium text-slate-700">
                      Update Connection Details
                    </h3>
                    <DynamicDataSourceForm
                      type={editingDataSource.type}
                      data={editData}
                      onDataChange={updateEditData}
                      showPasswords={editShowPasswords}
                      onTogglePasswordVisibility={toggleEditPasswordVisibility}
                      isEditMode={true}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingDataSource(null);
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
        )
      }

      {/* Share Connection Modal */}
      {
        sharingDataSource && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSharingDataSource(null);
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Share Connection</h2>
                <button
                  onClick={() => setSharingDataSource(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Data Source Name (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data Source</label>
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <Database className="w-5 h-5 text-slate-500" />
                    <div>
                      <div className="font-medium text-slate-900">{sharingDataSource.name}</div>
                      <div className="text-sm text-slate-500">{sharingDataSource.type}</div>
                    </div>
                  </div>
                </div>

                {/* Current Sharing Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Status</label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    {sharingDataSource.permissions && sharingDataSource.permissions.length > 0 ? (
                      <span className="flex items-center gap-2 text-primary-600">
                        <Users className="w-4 h-4" />
                        Shared with {sharingDataSource.permissions.map(p => p.group.name).join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-500">Private - only you can access</span>
                    )}
                  </div>
                </div>

                {/* Share with Groups */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Share with Groups
                  </label>
                  <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                    {userGroups.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">No groups available</div>
                    ) : (
                      userGroups.map((group) => {
                        const existingPerm = shareGroupPermissions.find(p => p.groupId === group.id);
                        return (
                          <div key={group.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50">
                            <label className="flex items-center gap-2 flex-grow cursor-pointer">
                              <input
                                type="checkbox"
                                checked={existingPerm !== undefined}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setShareGroupPermissions([...shareGroupPermissions, { groupId: group.id, permission: 'READ' }]);
                                  } else {
                                    setShareGroupPermissions(shareGroupPermissions.filter(p => p.groupId !== group.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-slate-700">{group.name}</span>
                            </label>
                            {existingPerm && (
                              <select
                                value={existingPerm.permission}
                                onChange={(e) => {
                                  const level = e.target.value as 'READ' | 'WRITE' | 'ADMIN';
                                  setShareGroupPermissions(shareGroupPermissions.map(p =>
                                    p.groupId === group.id ? { ...p, permission: level } : p
                                  ));
                                }}
                                className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="READ">Read</option>
                                <option value="WRITE">Write</option>
                                <option value="ADMIN">Admin</option>
                              </select>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    All members of selected groups will be able to use this data source.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setSharingDataSource(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSharing}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Save Sharing
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
