import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, XCircle, EyeOff, CheckCircle } from 'lucide-react';
import type { ValidationIssue } from '@/hooks/useWorkflowValidator';

interface ValidationTrayProps {
    issues: ValidationIssue[];
    hasValidated?: boolean;
    onIssueClick: (nodeId: string) => void;
    onIgnoreIssue?: (nodeId: string, issueId: string) => void;
}

export function ValidationTray({ issues, hasValidated, onIssueClick, onIgnoreIssue }: ValidationTrayProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');

    if (issues.length === 0 && !hasValidated) return null;

    if (issues.length === 0 && hasValidated) {
        return (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-50 border border-green-200 shadow-lg rounded-md px-4 py-2 flex items-center gap-2 transition-all">
                <div className="bg-green-100 rounded-full p-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-green-800 text-sm font-medium">Validation Passed (0 Issues)</span>
            </div>
        );
    }

    return (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-lg rounded-md transition-all duration-300 flex flex-col overflow-hidden \${isExpanded ? 'w-[500px] max-h-[300px]' : 'w-[auto] max-h-12'}`}>

            {/* Header (Always Visible) */}
            <div
                className="flex items-center gap-4 px-4 py-2 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {errors.length > 0 && (
                        <div className="flex items-center gap-1.5 text-red-600 font-medium text-sm">
                            <XCircle className="w-4 h-4" />
                            {errors.length} {errors.length === 1 ? 'Error' : 'Errors'}
                        </div>
                    )}
                    {warnings.length > 0 && (
                        <div className="flex items-center gap-1.5 text-yellow-600 font-medium text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {warnings.length} {warnings.length === 1 ? 'Warning' : 'Warnings'}
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center text-xs text-slate-500 font-medium">
                    Workflow Validation
                </div>
                <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </div>

            {/* Expanded List */}
            {isExpanded && (
                <div className="overflow-y-auto border-t border-slate-100 bg-slate-50">
                    <ul className="divide-y divide-slate-100">
                        {issues.map((issue) => (
                            <li
                                key={issue.id}
                                className="px-4 py-3 hover:bg-white cursor-pointer transition-colors group"
                                onClick={() => onIssueClick(issue.nodeId)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 shrink-0">
                                        {issue.severity === 'error' ? (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                                            {issue.message}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                                            Click to jump to node
                                        </p>
                                    </div>
                                    {issue.severity === 'warning' && onIgnoreIssue && (
                                        <button
                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Ignore this warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onIgnoreIssue(issue.nodeId, issue.id);
                                            }}
                                        >
                                            <EyeOff className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
