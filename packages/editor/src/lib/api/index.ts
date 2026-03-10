// Re-export shared types
export type * from '@twiddle/shared';

// Export request utility
export { request, API_BASE } from './request';

// Export API domain namespaces
export { workflowsApi } from './workflows';
export { promotionsApi } from './promotions';
export { nodesApi } from './nodes';
export { datasourcesApi, credentialsApi } from './datasources';
export { groupsApi } from './groups';
export { usersApi } from './users';
export { githubApi } from './github';
export { settingsApi } from './settings';
export { foldersApi } from './folders';
export { localAuthApi } from './auth';

// We also need to re-export the auth hook elements previously in api.ts
export { clearAuthData } from './auth'; export type { ExecutionInfo, TimelineEvent, ExecutionTimeline } from './executions';
export { executionsApi } from './executions';
