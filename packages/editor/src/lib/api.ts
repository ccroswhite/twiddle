export type {
  WorkflowCreateInput,
  WorkflowUpdateInput,
  WorkflowEnvironment,
  PromotionStatus,
  PromotionRequest,
  Folder,
  FolderPermission,
  FolderPermissionLevel,
  FolderCreateInput,
  FolderUpdateInput,
  DataSourceWithAccess,
  DataSourceCreateInput,
  DataSourceUpdateInput,
  DataSourceData,
  Group,
  GroupMember,
  GroupCreateInput,
  GroupUpdateInput,
  User,
  AuthUser,
  AuthResponse,
  AuthMeResponse,
  GitHubUser,
  GitHubRepo,
  GitHubStatus,
  SystemSettings,
  NodeTypeInfo,
  WorkflowProperty,
  WorkflowSchedule,
} from '@twiddle/shared';

import type {
  WorkflowCreateInput,
  WorkflowUpdateInput,
  WorkflowEnvironment,
  PromotionStatus,
  PromotionRequest,
  Folder,
  FolderPermission,
  FolderPermissionLevel,
  FolderCreateInput,
  FolderUpdateInput,
  DataSourceWithAccess,
  DataSourceCreateInput,
  DataSourceUpdateInput,
  Group,
  GroupMember,
  GroupCreateInput,
  GroupUpdateInput,
  User,
  AuthResponse,
  AuthMeResponse,
  GitHubUser,
  GitHubRepo,
  GitHubStatus,
  SystemSettings,
  NodeTypeInfo,
} from '@twiddle/shared';


const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // Only set Content-Type for requests with a body
  const headers: Record<string, string> = {};
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Workflows API
export const workflowsApi = {
  list: () => request<Workflow[]>('/workflows'),
  get: (id: string) => request<Workflow>(`/workflows/${id}`),
  create: (data: WorkflowCreateInput) =>
    request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: WorkflowUpdateInput) =>
    request<Workflow>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/workflows/${id}`, {
      method: 'DELETE',
    }),
  exportPython: async (id: string) => {
    // Download as tarball
    const response = await fetch(`${API_BASE}/workflows/${id}/export/python?format=tar`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(error.error || 'Export failed');
    }
    // Get filename from Content-Disposition header
    const disposition = response.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1] || 'workflow.tar.gz';

    // Download the blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  exportPythonJson: (id: string) =>
    request<{
      workflowId: string;
      workflowName: string;
      workflowDescription?: string;
      version: number;
      environment: string;
      exportedAt: string;
      directoryName: string;
      definition: {
        nodes: unknown[];
        connections: unknown[];
        settings?: unknown;
        tags?: string[];
      };
      files: Record<string, string>;
    }>(`/workflows/${id}/export/python?format=json`),
  exportAirflow: async (id: string) => {
    // Download as tarball
    const response = await fetch(`${API_BASE}/workflows/${id}/export/airflow?format=tar`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(error.error || 'Export failed');
    }
    // Get filename from Content-Disposition header
    const disposition = response.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1] || 'workflow-airflow.tar.gz';

    // Download the blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  exportAirflowJson: (id: string) =>
    request<{
      workflowId: string;
      workflowName: string;
      workflowDescription?: string;
      version: number;
      environment: string;
      exportedAt: string;
      directoryName: string;
      definition: {
        nodes: unknown[];
        connections: unknown[];
        settings?: unknown;
        tags?: string[];
      };
      files: Record<string, string>;
    }>(`/workflows/${id}/export/airflow?format=json`),
  exportIR: async (id: string) => {
    // Download as JSON file
    const response = await fetch(`${API_BASE}/workflows/${id}/export/ir`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(error.error || 'Export failed');
    }
    // Get filename from Content-Disposition header
    const disposition = response.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1] || 'workflow.twiddle.json';

    // Download the blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
  importWorkflow: (data: {
    workflowName?: string;
    workflowDescription?: string;
    definition: {
      nodes: unknown[];
      connections: unknown[];
      settings?: unknown;
      tags?: string[];
    };
    groupId?: string;
  }) =>
    request<Workflow>('/workflows/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  promote: (id: string, targetEnvironment: 'UT' | 'LT' | 'PD') =>
    request<Workflow>(`/workflows/${id}/promote`, {
      method: 'POST',
      body: JSON.stringify({ targetEnvironment }),
    }),
  demote: (id: string, targetEnvironment: 'DV' | 'UT' | 'LT') =>
    request<Workflow>(`/workflows/${id}/demote`, {
      method: 'POST',
      body: JSON.stringify({ targetEnvironment }),
    }),
  heartbeat: (id: string) =>
    request<{ success: boolean; status: string; request?: { userId: string; name: string; email: string; requestedAt: string } }>(`/workflows/${id}/lock`, {
      method: 'POST',
    }),
  requestLock: (id: string) =>
    request<{ success: boolean; status: string }>(`/workflows/${id}/lock/request`, {
      method: 'POST',
    }),
  resolveLock: (id: string, action: 'ACCEPT' | 'DENY') =>
    request<{ success: boolean; status: string }>(`/workflows/${id}/lock/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  unlock: (id: string) =>
    request<{ success: boolean }>(`/workflows/${id}/unlock`, {
      method: 'POST',
    }),
  getVersions: (id: string) =>
    request<{ id: string; version: number; createdAt: string; createdBy: { name: string; email: string } | null }[]>(`/workflows/${id}/versions`),
  getVersion: (id: string, versionId: string) =>
    request<{ id: string; version: number; nodes: any[]; connections: any[]; settings: any }>(`/workflows/${id}/versions/${versionId}`),
};



// Promotions API

export const promotionsApi = {
  list: (status?: PromotionStatus, workflowId?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (workflowId) params.append('workflowId', workflowId);
    return request<PromotionRequest[]>(`/promotions?${params.toString()}`);
  },
  request: (workflowId: string, notes?: string) =>
    request<PromotionRequest>('/promotions/request', {
      method: 'POST',
      body: JSON.stringify({ workflowId, notes }),
    }),
  approve: (id: string, notes?: string) =>
    request<PromotionRequest>(`/promotions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  reject: (id: string, notes?: string) =>
    request<PromotionRequest>(`/promotions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
};

// Nodes API
export const nodesApi = {
  list: () => request<NodeTypeInfo[]>('/nodes'),
  get: (type: string) => request<NodeDefinition>(`/nodes/${type}`),
  getAll: () => request<NodeDefinition[]>('/nodes/definitions/all'),
  search: (query: string) => request<NodeTypeInfo[]>(`/nodes/search/${query}`),
  byCategory: (category: string) => request<NodeTypeInfo[]>(`/nodes/category/${category}`),
};

// Data Sources API


export const datasourcesApi = {
  list: () => request<DataSourceWithAccess[]>('/datasources'),
  get: (id: string) => request<DataSourceWithAccess>(`/datasources/${id}`),
  getForEdit: (id: string) => request<DataSourceWithAccess & { data: Record<string, unknown> }>(`/datasources/${id}/edit`),
  create: (data: DataSourceCreateInput & { groupIds?: string[] }) =>
    request<DataSourceWithAccess>('/datasources', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: DataSourceUpdateInput & { groupIds?: string[] }) =>
    request<DataSourceWithAccess>(`/datasources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/datasources/${id}`, {
      method: 'DELETE',
    }),
  test: (id: string) =>
    request<{ success: boolean; message: string; details?: Record<string, unknown> }>(`/datasources/${id}/test`, {
      method: 'POST',
    }),
  // Test data source without saving (for the create form)
  testUnsaved: (type: string, data: Record<string, unknown>) =>
    request<{ success: boolean; message: string; details?: Record<string, unknown> }>('/datasources/test', {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    }),
};

// Backwards compatibility alias
export const credentialsApi = datasourcesApi;


// Types
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: unknown[];
  connections: unknown[];
  settings: unknown;
  active: boolean;
  tags: string[];
  environment: WorkflowEnvironment;
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  groupId?: string;
  folderId?: string;
  createdBy?: {
    id: string;
    name?: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  lockedBy?: {
    id: string;
    name: string;
    email: string;
    isMe: boolean;
  } | null;
}


interface NodeDefinition {
  type: string;
  displayName: string;
  description: string;
  icon?: string;
  iconColor?: string;
  category: string;
  version: number;
  inputs: string[];
  outputs: string[];
  parameters: unknown[];
  credentials?: unknown[];
  subtitle?: string;
}


// ============================================================================
// Groups API
// ============================================================================

export const groupsApi = {
  list: () => request<Group[]>('/groups'),
  get: (id: string) => request<Group>(`/groups/${id}`),
  create: (data: GroupCreateInput) =>
    request<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: GroupUpdateInput) =>
    request<Group>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/groups/${id}`, {
      method: 'DELETE',
    }),
  // Members
  listMembers: (groupId: string) =>
    request<GroupMember[]>(`/groups/${groupId}/members`),
  addMember: (groupId: string, userId: string, role = 'member') =>
    request<GroupMember>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),
  updateMember: (groupId: string, memberId: string, role: string) =>
    request<GroupMember>(`/groups/${groupId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  removeMember: (groupId: string, memberId: string) =>
    request<void>(`/groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
    }),
  // Workflows
  listWorkflows: (groupId: string) =>
    request<Workflow[]>(`/groups/${groupId}/workflows`),
};

// ============================================================================
// Folders API
// ============================================================================

export const foldersApi = {
  list: (parentId?: string) =>
    request<Folder[]>(`/folders${parentId ? `?parentId=${parentId}` : ''}`),
  get: (id: string) => request<Folder>(`/folders/${id}`),
  create: (data: FolderCreateInput) =>
    request<Folder>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: FolderUpdateInput) =>
    request<Folder>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<void>(`/folders/${id}`, {
      method: 'DELETE',
    }),
  addWorkflow: (folderId: string, workflowId: string) =>
    request<Workflow>(`/folders/${folderId}/workflows`, {
      method: 'POST',
      body: JSON.stringify({ workflowId }),
    }),
  removeWorkflow: (folderId: string, workflowId: string) =>
    request<Workflow>(`/folders/${folderId}/workflows/${workflowId}`, {
      method: 'DELETE',
    }),
  // Permissions
  getPermissions: (folderId: string) =>
    request<FolderPermission[]>(`/folders/${folderId}/permissions`),
  addPermission: (
    folderId: string,
    data: { userId?: string; groupId?: string; permission: FolderPermissionLevel }
  ) =>
    request<FolderPermission>(`/folders/${folderId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePermission: (
    folderId: string,
    permissionId: string,
    data: { permission: FolderPermissionLevel }
  ) =>
    request<FolderPermission>(`/folders/${folderId}/permissions/${permissionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePermission: (folderId: string, permissionId: string) =>
    request<void>(`/folders/${folderId}/permissions/${permissionId}`, {
      method: 'DELETE',
    }),
};

// ============================================================================
// Users API
// ============================================================================

export const usersApi = {
  list: () => request<User[]>('/users'),
  get: (id: string) => request<User>(`/users/${id}`),
  me: () => request<User>('/users/me'),
  getGroups: (userId: string) => request<Group[]>(`/users/${userId}/groups`),
};

// ============================================================================
// GitHub API
// ============================================================================

export const githubApi = {
  validateToken: (token: string) =>
    request<{ valid: boolean; user?: GitHubUser; error?: string }>('/github/validate', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  listRepos: (credentialId: string) =>
    request<GitHubRepo[]>(`/github/repos?credentialId=${credentialId}`),
  checkRepo: (owner: string, repo: string, credentialId: string) =>
    request<{ exists: boolean }>(`/github/repos/check?owner=${owner}&repo=${repo}&credentialId=${credentialId}`),
  createRepo: (data: {
    owner: string;
    repo: string;
    credentialId: string;
    description?: string;
    isPrivate?: boolean;
  }) =>
    request<{ success: boolean; cloneUrl?: string; repoUrl?: string; error?: string }>('/github/repos/create', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  cloneRepo: (data: {
    owner: string;
    repo: string;
    credentialId: string;
    branch?: string;
  }) =>
    request<{ success: boolean; localPath?: string; error?: string }>('/github/repos/clone', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  initRepo: (data: {
    owner: string;
    repo: string;
    credentialId: string;
    workflowId: string;
    description?: string;
    isPrivate?: boolean;
    branch?: string;
  }) =>
    request<{ success: boolean; localPath?: string; repoUrl?: string; error?: string }>('/github/repos/init', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  connectRepo: (data: {
    workflowId: string;
    owner: string;
    repo: string;
    credentialId: string;
    branch?: string;
    path?: string;
  }) =>
    request<{ success: boolean; localPath?: string; error?: string }>('/github/repos/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  disconnectRepo: (workflowId: string) =>
    request<{ success: boolean }>('/github/repos/disconnect', {
      method: 'POST',
      body: JSON.stringify({ workflowId }),
    }),
  getStatus: (workflowId: string) =>
    request<GitHubStatus>(`/github/workflows/${workflowId}/status`),
};

// ============================================================================
// Local Auth API
// ============================================================================

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

// System Settings API (admin only)

export const settingsApi = {
  get: () => request<SystemSettings>('/settings'),
  update: (data: Partial<SystemSettings>) =>
    request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  testSso: () =>
    request<{ success: boolean; message: string }>('/settings/sso/test', {
      method: 'POST',
    }),
};

// ============================================================================
// Executions API (Temporal integration)
// ============================================================================

export interface ExecutionInfo {
  workflowId: string;
  runId: string;
  workflowType: string;
  status: string;
  startTime: string;
  closeTime?: string;
  executionTime?: string;
  taskQueue: string;
  historyLength: number;
  statusDisplay: {
    label: string;
    color: string;
  };
  durationMs?: number;
}

export interface TimelineEvent {
  id: string;
  type: 'workflow' | 'activity' | 'timer' | 'signal' | 'marker';
  name: string;
  status: 'scheduled' | 'started' | 'completed' | 'failed' | 'canceled' | 'timedOut';
  startTime: string;
  endTime?: string;
  durationMs?: number;
  attempt?: number;
  color: string;
  offsetMs: number;
  endOffsetMs?: number;
  details?: Record<string, unknown>;
  error?: {
    message: string;
    type: string;
  };
}

export interface ExecutionTimeline {
  workflowId: string;
  runId: string;
  status: string;
  startTime: string;
  closeTime?: string;
  totalDurationMs?: number;
  statusDisplay: {
    label: string;
    color: string;
  };
  events: TimelineEvent[];
}

export const executionsApi = {
  // Check if Temporal is available
  health: () =>
    request<{ temporal: boolean; message: string }>('/executions/health'),

  // List all executions
  list: (params?: { query?: string; taskQueue?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.append('query', params.query);
    if (params?.taskQueue) searchParams.append('taskQueue', params.taskQueue);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const queryString = searchParams.toString();
    return request<{
      executions: ExecutionInfo[];
      total: number;
      hasMore: boolean;
    }>(`/executions${queryString ? `?${queryString}` : ''}`);
  },

  // Get executions for a specific workflow by name
  listByWorkflowName: (workflowName: string, limit = 20) =>
    request<{
      workflowName: string;
      taskQueue: string;
      executions: ExecutionInfo[];
      total: number;
      hasMore: boolean;
    }>(`/executions/workflow/${encodeURIComponent(workflowName)}?limit=${limit}`),

  // Get single execution details
  get: (workflowId: string, runId?: string) => {
    const queryString = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return request<ExecutionInfo>(`/executions/${encodeURIComponent(workflowId)}${queryString}`);
  },

  // Get execution timeline for waterfall visualization
  getTimeline: (workflowId: string, runId?: string) => {
    const queryString = runId ? `?runId=${encodeURIComponent(runId)}` : '';
    return request<ExecutionTimeline>(`/executions/${encodeURIComponent(workflowId)}/timeline${queryString}`);
  },
};
