import { request } from './request';

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
