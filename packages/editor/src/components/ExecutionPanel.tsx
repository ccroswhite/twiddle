/**
 * ExecutionPanel Component
 * 
 * A side panel that displays workflow execution history from Temporal.
 * Shows a list of recent executions with status badges, and allows
 * drilling down into execution details with a waterfall timeline.
 */

import { useState, useEffect } from 'react';
import { X, Play, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { executionsApi, type ExecutionInfo, type ExecutionTimeline } from '@/lib/api';

interface ExecutionPanelProps {
    workflowName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ExecutionPanel({ workflowName, isOpen, onClose }: ExecutionPanelProps) {
    const [executions, setExecutions] = useState<ExecutionInfo[]>([]);
    const [selectedExecution, setSelectedExecution] = useState<ExecutionInfo | null>(null);
    const [timeline, setTimeline] = useState<ExecutionTimeline | null>(null);
    const [loading, setLoading] = useState(false);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load executions when panel opens
    useEffect(() => {
        if (isOpen && workflowName) {
            loadExecutions();
        }
    }, [isOpen, workflowName]);

    // Load timeline when execution is selected
    useEffect(() => {
        if (selectedExecution) {
            loadTimeline(selectedExecution.workflowId, selectedExecution.runId);
        } else {
            setTimeline(null);
        }
    }, [selectedExecution]);

    async function loadExecutions() {
        setLoading(true);
        setError(null);

        try {
            // First check if Temporal is available
            const health = await executionsApi.health();

            if (!health.temporal) {
                setError('Temporal is not available. Start your Temporal server to view executions.');
                setExecutions([]);
                return;
            }

            const result = await executionsApi.listByWorkflowName(workflowName);
            setExecutions(result.executions);
        } catch {
            setError('Failed to load executions. Is Temporal running?');
            setExecutions([]);
        } finally {
            setLoading(false);
        }
    }

    async function loadTimeline(workflowId: string, runId: string) {
        setTimelineLoading(true);

        try {
            const result = await executionsApi.getTimeline(workflowId, runId);
            setTimeline(result);
        } catch (err) {
            console.error('Failed to load timeline:', err);
            setTimeline(null);
        } finally {
            setTimelineLoading(false);
        }
    }

    function getStatusIcon(status: string) {
        switch (status) {
            case 'RUNNING':
                return <Play className="w-4 h-4 text-blue-500" />;
            case 'COMPLETED':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'FAILED':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'CANCELED':
            case 'TERMINATED':
                return <AlertCircle className="w-4 h-4 text-orange-500" />;
            case 'TIMED_OUT':
                return <Clock className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-500" />;
        }
    }

    function formatDuration(ms?: number): string {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    function formatTime(isoString: string): string {
        return new Date(isoString).toLocaleTimeString();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-xl border-l border-slate-200 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-slate-600" />
                    <h2 className="font-semibold text-slate-800">Executions</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadExecutions}
                        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Error/Info Banner */}
                {error && (
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                )}

                {/* No Executions */}
                {!loading && !error && executions.length === 0 && (
                    <div className="px-4 py-8 text-center text-slate-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No executions found</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Run the workflow to see execution history
                        </p>
                    </div>
                )}

                {/* Execution List */}
                {!loading && executions.length > 0 && !selectedExecution && (
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2 space-y-1">
                            {executions.map((exec) => (
                                <button
                                    key={`${exec.workflowId}-${exec.runId}`}
                                    onClick={() => setSelectedExecution(exec)}
                                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(exec.status)}
                                            <span className="text-sm font-medium text-slate-700">
                                                {exec.statusDisplay.label}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {formatDuration(exec.durationMs)}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500 truncate">
                                        {formatTime(exec.startTime)} • {exec.workflowId.slice(-8)}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Execution Detail / Timeline View */}
                {selectedExecution && (
                    <div className="flex-1 overflow-y-auto">
                        {/* Back Button & Summary */}
                        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                            <button
                                onClick={() => setSelectedExecution(null)}
                                className="text-sm text-blue-600 hover:text-blue-700 mb-2 flex items-center gap-1"
                            >
                                ← Back to list
                            </button>
                            <div className="flex items-center gap-2">
                                {getStatusIcon(selectedExecution.status)}
                                <span className="font-medium">{selectedExecution.statusDisplay.label}</span>
                                <span className="text-sm text-slate-500">
                                    • {formatDuration(selectedExecution.durationMs)}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Started: {new Date(selectedExecution.startTime).toLocaleString()}
                            </div>
                        </div>

                        {/* Timeline Loading */}
                        {timelineLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                            </div>
                        )}

                        {/* Timeline */}
                        {timeline && !timelineLoading && (
                            <ExecutionTimelineView timeline={timeline} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Separate component for timeline visualization
function ExecutionTimelineView({ timeline }: { timeline: ExecutionTimeline }) {
    const maxOffset = Math.max(
        ...timeline.events.map(e => e.endOffsetMs || e.offsetMs),
        timeline.totalDurationMs || 1000
    );

    return (
        <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline</h3>

            <div className="space-y-2">
                {timeline.events.map((event) => {
                    const startPercent = (event.offsetMs / maxOffset) * 100;
                    const widthPercent = event.endOffsetMs
                        ? ((event.endOffsetMs - event.offsetMs) / maxOffset) * 100
                        : 1; // Minimum width for point events

                    const bgColor = {
                        green: 'bg-green-500',
                        red: 'bg-red-500',
                        blue: 'bg-blue-500',
                        orange: 'bg-orange-500',
                        gray: 'bg-slate-300',
                    }[event.color] || 'bg-slate-300';

                    return (
                        <div
                            key={event.id}
                            className="relative h-8 bg-slate-100 rounded overflow-hidden group"
                            title={`${event.name}: ${event.durationMs ? `${event.durationMs}ms` : 'in progress'}`}
                        >
                            {/* Timeline Bar */}
                            <div
                                className={`absolute h-full ${bgColor} rounded transition-all`}
                                style={{
                                    left: `${startPercent}%`,
                                    width: `${Math.max(widthPercent, 1)}%`,
                                }}
                            />

                            {/* Label */}
                            <div className="absolute inset-0 flex items-center px-2">
                                <span className="text-xs font-medium text-slate-700 truncate z-10">
                                    {event.name}
                                </span>
                            </div>

                            {/* Duration on hover */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 z-10">
                                {event.durationMs ? `${event.durationMs}ms` : 'running'}
                            </div>

                            {/* Error indicator */}
                            {event.error && (
                                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                    <XCircle className="w-4 h-4 text-red-600" />
                                </div>
                            )}

                            {/* Retry indicator */}
                            {event.attempt && event.attempt > 1 && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-orange-600 font-medium">
                                    ×{event.attempt}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500" />
                    <span>Completed</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500" />
                    <span>Failed</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    <span>Running</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-slate-300" />
                    <span>Scheduled</span>
                </div>
            </div>

            {/* Total Duration */}
            {timeline.totalDurationMs && (
                <div className="mt-4 pt-3 border-t border-slate-200 text-sm text-slate-600">
                    Total Duration: <span className="font-medium">{timeline.totalDurationMs}ms</span>
                </div>
            )}
        </div>
    );
}
