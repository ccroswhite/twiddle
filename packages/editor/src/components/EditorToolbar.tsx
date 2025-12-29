/**
 * EditorToolbar
 * 
 * Top toolbar for the workflow editor containing:
 * - Workflow name input and version badge
 * - Action buttons (Undo, Open, Add Activity, Export, View Code, GitHub, Properties, Save)
 */

import {
    Save,
    Plus,
    Code,
    Github,
    FolderOpen,
    Undo2,
    Settings,
    Play,
} from 'lucide-react';
import { ExportDropdown, type ExportFormat } from './ExportDropdown';

// =============================================================================
// Types
// =============================================================================

export interface EditorToolbarProps {
    // Workflow info
    workflowName: string;
    workflowVersion: number;
    isNew: boolean;
    isReadOnly: boolean;
    saving: boolean;

    // State for conditional button states
    canUndo: boolean;
    githubConnected: boolean;
    pythonCode: { workflow: string; activities: string } | null;

    // Event handlers
    onNameChange: (name: string) => void;
    onUndo: () => void;
    onOpenBrowser: () => void;
    onAddActivity: () => void;
    onExport: (format: ExportFormat) => void;
    onViewCode: () => void;
    onGitHubSettings: () => void;
    onProperties: () => void;
    onExecutions: () => void;
    onSave: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function EditorToolbar({
    workflowName,
    workflowVersion,
    isNew,
    isReadOnly,
    saving,
    canUndo,
    githubConnected,
    pythonCode,
    onNameChange,
    onUndo,
    onOpenBrowser,
    onAddActivity,
    onExport,
    onViewCode,
    onGitHubSettings,
    onProperties,
    onExecutions,
    onSave,
}: EditorToolbarProps) {
    return (
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between relative z-50">
            <div className="flex items-center gap-4">
                <div className="flex items-baseline gap-2">
                    <input
                        type="text"
                        value={workflowName}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                    />
                    {!isNew && (
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            v{workflowVersion}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onUndo}
                    disabled={!canUndo || isReadOnly}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo last change"
                >
                    <Undo2 className="w-4 h-4" />
                    Undo
                </button>
                <div className="w-px h-6 bg-slate-200" />
                <button
                    onClick={onOpenBrowser}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open an existing workflow"
                >
                    <FolderOpen className="w-4 h-4" />
                    Open
                </button>
                <button
                    onClick={onAddActivity}
                    disabled={isReadOnly}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add a new activity or trigger to the workflow"
                >
                    <Plus className="w-4 h-4" />
                    Add Activity
                </button>
                <ExportDropdown disabled={isNew} onExport={onExport} />
                <button
                    onClick={onViewCode}
                    disabled={isNew || !pythonCode}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="View generated Python code"
                >
                    <Code className="w-4 h-4" />
                    View Code
                </button>
                <button
                    onClick={onGitHubSettings}
                    disabled={isNew}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${githubConnected
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    title={githubConnected ? 'GitHub connected' : 'Connect to GitHub'}
                >
                    <Github className="w-4 h-4" />
                    GitHub
                </button>
                <button
                    onClick={onProperties}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Workflow properties and schedule"
                >
                    <Settings className="w-4 h-4" />
                    Properties
                </button>
                <button
                    onClick={onExecutions}
                    disabled={isNew}
                    className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                    title="View workflow executions"
                >
                    <Play className="w-4 h-4" />
                    Executions
                </button>
                <button
                    onClick={onSave}
                    disabled={saving || isReadOnly}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}
