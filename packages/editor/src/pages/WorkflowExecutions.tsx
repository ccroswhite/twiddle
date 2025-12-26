/**
 * WorkflowExecutions Page
 * 
 * A full-page view for browsing workflow executions from Temporal.
 * Features:
 * - Search/select workflows
 * - View all executions for a workflow grouped by date
 * - Waterfall timeline visualization for individual executions
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Search,
    Play,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    Loader2,
    ChevronRight,
    Calendar,
    ArrowLeft,
} from 'lucide-react';
import {
    executionsApi,
    workflowsApi,
    type ExecutionInfo,
    type ExecutionTimeline,
    type Workflow,
} from '@/lib/api';

// =============================================================================
// Main Page Component
// =============================================================================

export function WorkflowExecutions() {
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
    const [executions, setExecutions] = useState<ExecutionInfo[]>([]);
    const [selectedExecution, setSelectedExecution] = useState<ExecutionInfo | null>(null);
    const [timeline, setTimeline] = useState<ExecutionTimeline | null>(null);

    const [loadingWorkflows, setLoadingWorkflows] = useState(true);
    const [loadingExecutions, setLoadingExecutions] = useState(false);
    const [loadingTimeline, setLoadingTimeline] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [temporalAvailable, setTemporalAvailable] = useState(true);

    // Load workflows on mount
    useEffect(() => {
        loadWorkflows();
        checkTemporalHealth();
    }, []);

    // Restore selection from URL
    useEffect(() => {
        const workflowId = searchParams.get('workflow');
        const executionId = searchParams.get('execution');

        if (workflowId && workflows.length > 0) {
            const workflow = workflows.find(w => w.id === workflowId);
            if (workflow && !selectedWorkflow) {
                handleSelectWorkflow(workflow);
            }
        }

        if (executionId && executions.length > 0) {
            const execution = executions.find(e => e.workflowId === executionId);
            if (execution && !selectedExecution) {
                handleSelectExecution(execution);
            }
        }
    }, [workflows, executions, searchParams]);

    async function checkTemporalHealth() {
        try {
            const health = await executionsApi.health();
            setTemporalAvailable(health.temporal);
            if (!health.temporal) {
                setError('Temporal is not available. Start your Temporal server to view executions.');
            }
        } catch {
            setTemporalAvailable(false);
            setError('Cannot connect to backend. Please ensure the API server is running.');
        }
    }

    async function loadWorkflows() {
        setLoadingWorkflows(true);
        try {
            const result = await workflowsApi.list();
            setWorkflows(result);
        } catch (err) {
            console.error('Failed to load workflows:', err);
        } finally {
            setLoadingWorkflows(false);
        }
    }

    async function handleSelectWorkflow(workflow: Workflow) {
        setSelectedWorkflow(workflow);
        setSelectedExecution(null);
        setTimeline(null);
        setSearchParams({ workflow: workflow.id });

        setLoadingExecutions(true);
        setError(null);

        try {
            const result = await executionsApi.listByWorkflowName(workflow.name);
            setExecutions(result.executions);
        } catch {
            setError('Failed to load executions');
            setExecutions([]);
        } finally {
            setLoadingExecutions(false);
        }
    }

    async function handleSelectExecution(execution: ExecutionInfo) {
        setSelectedExecution(execution);
        setSearchParams({
            workflow: selectedWorkflow?.id || '',
            execution: execution.workflowId
        });

        setLoadingTimeline(true);

        try {
            const result = await executionsApi.getTimeline(execution.workflowId, execution.runId);
            setTimeline(result);
        } catch (err) {
            console.error('Failed to load timeline:', err);
            setTimeline(null);
        } finally {
            setLoadingTimeline(false);
        }
    }

    function handleBackToWorkflows() {
        setSelectedWorkflow(null);
        setSelectedExecution(null);
        setTimeline(null);
        setExecutions([]);
        setSearchParams({});
    }

    function handleBackToExecutions() {
        setSelectedExecution(null);
        setTimeline(null);
        if (selectedWorkflow) {
            setSearchParams({ workflow: selectedWorkflow.id });
        }
    }

    // Filter workflows based on search
    const filteredWorkflows = useMemo(() => {
        if (!searchQuery) return workflows;
        const query = searchQuery.toLowerCase();
        return workflows.filter(w =>
            w.name.toLowerCase().includes(query) ||
            w.description?.toLowerCase().includes(query)
        );
    }, [workflows, searchQuery]);

    // Group executions by date
    const executionsByDate = useMemo(() => {
        const groups: Record<string, ExecutionInfo[]> = {};

        for (const exec of executions) {
            const date = new Date(exec.startTime).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(exec);
        }

        // Sort dates descending (most recent first)
        return Object.entries(groups).sort((a, b) =>
            new Date(b[0]).getTime() - new Date(a[0]).getTime()
        );
    }, [executions]);

    return (
        <div className="h-full flex flex-col bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="flex items-center gap-4">
                    {(selectedWorkflow || selectedExecution) && (
                        <button
                            onClick={selectedExecution ? handleBackToExecutions : handleBackToWorkflows}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800">
                            {selectedExecution
                                ? 'Execution Timeline'
                                : selectedWorkflow
                                    ? selectedWorkflow.name
                                    : 'Workflow Executions'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {selectedExecution
                                ? `Run: ${selectedExecution.workflowId.slice(-12)}`
                                : selectedWorkflow
                                    ? 'View all executions for this workflow'
                                    : 'Search and view workflow execution history'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-amber-800 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {/* Workflow Selection View */}
                {!selectedWorkflow && (
                    <WorkflowSelector
                        workflows={filteredWorkflows}
                        loading={loadingWorkflows}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onSelectWorkflow={handleSelectWorkflow}
                    />
                )}

                {/* Execution List View */}
                {selectedWorkflow && !selectedExecution && (
                    <ExecutionList
                        executionsByDate={executionsByDate}
                        loading={loadingExecutions}
                        temporalAvailable={temporalAvailable}
                        onSelectExecution={handleSelectExecution}
                        onRefresh={() => handleSelectWorkflow(selectedWorkflow)}
                    />
                )}

                {/* Timeline View */}
                {selectedExecution && (
                    <TimelineView
                        execution={selectedExecution}
                        timeline={timeline}
                        loading={loadingTimeline}
                    />
                )}
            </div>
        </div>
    );
}

// =============================================================================
// Workflow Selector Component
// =============================================================================

interface WorkflowSelectorProps {
    workflows: Workflow[];
    loading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onSelectWorkflow: (workflow: Workflow) => void;
}

function WorkflowSelector({
    workflows,
    loading,
    searchQuery,
    onSearchChange,
    onSelectWorkflow,
}: WorkflowSelectorProps) {
    return (
        <div className="h-full overflow-y-auto p-6">
            {/* Search */}
            <div className="max-w-2xl mx-auto mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search workflows..."
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
            )}

            {/* Workflow List */}
            {!loading && (
                <div className="max-w-2xl mx-auto space-y-2">
                    {workflows.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Play className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p>No workflows found</p>
                            {searchQuery && (
                                <p className="text-sm mt-1">Try a different search term</p>
                            )}
                        </div>
                    ) : (
                        workflows.map((workflow) => (
                            <button
                                key={workflow.id}
                                onClick={() => onSelectWorkflow(workflow)}
                                className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                                        <Play className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-medium text-slate-800">{workflow.name}</h3>
                                        {workflow.description && (
                                            <p className="text-sm text-slate-500 truncate max-w-md">
                                                {workflow.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Execution List Component
// =============================================================================

interface ExecutionListProps {
    executionsByDate: [string, ExecutionInfo[]][];
    loading: boolean;
    temporalAvailable: boolean;
    onSelectExecution: (execution: ExecutionInfo) => void;
    onRefresh: () => void;
}

function ExecutionList({
    executionsByDate,
    loading,
    temporalAvailable,
    onSelectExecution,
    onRefresh,
}: ExecutionListProps) {
    return (
        <div className="h-full overflow-y-auto p-6">
            {/* Toolbar */}
            <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>Executions by date</span>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
            )}

            {/* No Temporal */}
            {!loading && !temporalAvailable && (
                <div className="max-w-3xl mx-auto text-center py-12 text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-400" />
                    <p className="font-medium">Temporal Not Available</p>
                    <p className="text-sm mt-1">Start your Temporal server to view executions</p>
                </div>
            )}

            {/* No Executions */}
            {!loading && temporalAvailable && executionsByDate.length === 0 && (
                <div className="max-w-3xl mx-auto text-center py-12 text-slate-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>No executions found</p>
                    <p className="text-sm mt-1">Run this workflow to see execution history</p>
                </div>
            )}

            {/* Execution Groups */}
            {!loading && executionsByDate.length > 0 && (
                <div className="max-w-3xl mx-auto space-y-6">
                    {executionsByDate.map(([date, dateExecutions]) => (
                        <div key={date}>
                            <h3 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {date}
                                <span className="text-slate-400">({dateExecutions.length})</span>
                            </h3>
                            <div className="space-y-2">
                                {dateExecutions.map((exec) => (
                                    <ExecutionCard
                                        key={`${exec.workflowId}-${exec.runId}`}
                                        execution={exec}
                                        onClick={() => onSelectExecution(exec)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Execution Card Component
// =============================================================================

interface ExecutionCardProps {
    execution: ExecutionInfo;
    onClick: () => void;
}

function ExecutionCard({ execution, onClick }: ExecutionCardProps) {
    const statusIcon = {
        RUNNING: <Play className="w-4 h-4 text-blue-500" />,
        COMPLETED: <CheckCircle className="w-4 h-4 text-green-500" />,
        FAILED: <XCircle className="w-4 h-4 text-red-500" />,
        CANCELED: <AlertCircle className="w-4 h-4 text-orange-500" />,
        TERMINATED: <AlertCircle className="w-4 h-4 text-orange-500" />,
        TIMED_OUT: <Clock className="w-4 h-4 text-red-500" />,
    }[execution.status] || <Clock className="w-4 h-4 text-slate-400" />;

    const statusColor = {
        RUNNING: 'bg-blue-50 text-blue-700 border-blue-200',
        COMPLETED: 'bg-green-50 text-green-700 border-green-200',
        FAILED: 'bg-red-50 text-red-700 border-red-200',
        CANCELED: 'bg-orange-50 text-orange-700 border-orange-200',
        TERMINATED: 'bg-orange-50 text-orange-700 border-orange-200',
        TIMED_OUT: 'bg-red-50 text-red-700 border-red-200',
    }[execution.status] || 'bg-slate-50 text-slate-700 border-slate-200';

    function formatDuration(ms?: number): string {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-primary-300 hover:shadow-sm transition-all group"
        >
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full border ${statusColor}`}>
                    {statusIcon}
                    <span className="text-sm font-medium">{execution.statusDisplay.label}</span>
                </div>
                <div className="text-left">
                    <div className="text-sm font-mono text-slate-600">
                        {execution.workflowId.slice(-16)}
                    </div>
                    <div className="text-xs text-slate-400">
                        {new Date(execution.startTime).toLocaleTimeString()}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                    {formatDuration(execution.durationMs)}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-primary-500 transition-colors" />
            </div>
        </button>
    );
}

// =============================================================================
// Timeline View Component
// =============================================================================

interface TimelineViewProps {
    execution: ExecutionInfo;
    timeline: ExecutionTimeline | null;
    loading: boolean;
}

function TimelineView({ execution, timeline, loading }: TimelineViewProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
        );
    }

    if (!timeline) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <p>Failed to load timeline</p>
            </div>
        );
    }

    const maxOffset = Math.max(
        ...timeline.events.map(e => e.endOffsetMs || e.offsetMs),
        timeline.totalDurationMs || 1000
    );

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
                {/* Summary */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {execution.status === 'COMPLETED' && <CheckCircle className="w-6 h-6 text-green-500" />}
                            {execution.status === 'FAILED' && <XCircle className="w-6 h-6 text-red-500" />}
                            {execution.status === 'RUNNING' && <Play className="w-6 h-6 text-blue-500" />}
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">
                                    {execution.statusDisplay.label}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {new Date(execution.startTime).toLocaleString()}
                                </p>
                            </div>
                        </div>
                        {timeline.totalDurationMs && (
                            <div className="text-right">
                                <div className="text-2xl font-semibold text-slate-800">
                                    {timeline.totalDurationMs < 1000
                                        ? `${timeline.totalDurationMs}ms`
                                        : `${(timeline.totalDurationMs / 1000).toFixed(2)}s`}
                                </div>
                                <p className="text-sm text-slate-500">Total Duration</p>
                            </div>
                        )}
                    </div>
                    <div className="text-sm text-slate-600">
                        <span className="font-medium">Workflow ID:</span>{' '}
                        <code className="bg-slate-100 px-2 py-0.5 rounded">{execution.workflowId}</code>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Activity Timeline</h3>

                    <div className="space-y-3">
                        {timeline.events.map((event) => {
                            const startPercent = (event.offsetMs / maxOffset) * 100;
                            const widthPercent = event.endOffsetMs
                                ? ((event.endOffsetMs - event.offsetMs) / maxOffset) * 100
                                : 2;

                            const bgColor = {
                                green: 'bg-green-500',
                                red: 'bg-red-500',
                                blue: 'bg-blue-500',
                                orange: 'bg-orange-500',
                                gray: 'bg-slate-300',
                            }[event.color] || 'bg-slate-300';

                            return (
                                <div key={event.id} className="flex items-center gap-4">
                                    {/* Activity Name */}
                                    <div className="w-40 flex-shrink-0 text-right">
                                        <span className="text-sm font-medium text-slate-700 truncate block">
                                            {event.name}
                                        </span>
                                        {event.attempt && event.attempt > 1 && (
                                            <span className="text-xs text-orange-600">Attempt {event.attempt}</span>
                                        )}
                                    </div>

                                    {/* Timeline Bar */}
                                    <div className="flex-1 relative h-8 bg-slate-100 rounded overflow-hidden">
                                        <div
                                            className={`absolute h-full ${bgColor} rounded transition-all`}
                                            style={{
                                                left: `${startPercent}%`,
                                                width: `${Math.max(widthPercent, 1)}%`,
                                            }}
                                        />
                                    </div>

                                    {/* Duration */}
                                    <div className="w-20 text-right text-sm text-slate-500">
                                        {event.durationMs ? `${event.durationMs}ms` : '-'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span>Completed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span>Failed</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span>Running</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-slate-300" />
                            <span>Scheduled</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
