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
    Github,
    FolderOpen,
    Undo2,
    Settings,
    Play,
    LayoutGrid,
} from 'lucide-react';
import { ExportDropdown, type ExportFormat } from './ExportDropdown';
import { ViewCodeDropdown, type ViewCodeFormat } from './ViewCodeDropdown';

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
    onViewCode: (format: ViewCodeFormat) => void;
    onGitHubSettings: () => void;
    onProperties: () => void;
    onExecutions: () => void;
    onAutoLayout: () => void;
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
    onAutoLayout,
    onSave,
}: EditorToolbarProps) {
    return (
        <div className="bg-slate-50 border-b border-slate-300 px-2 py-1.5 flex items-center justify-between relative z-50 shadow-sm text-[13px]">
            <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-2 border-r border-slate-300 pr-3">
                    <input
                        type="text"
                        value={workflowName}
                        onChange={(e) => onNameChange(e.target.value)}
                        className="font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:bg-white focus:ring-1 focus:ring-primary-500 rounded-sm px-1.5 py-0.5 w-48 lg:w-64"
                    />
                    {!isNew && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded-sm">
                            V{workflowVersion}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={onUndo}
                    disabled={!canUndo || isReadOnly}
                    className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-200 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo last change"
                >
                    <Undo2 className="w-3.5 h-3.5" />
                    Undo
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                    onClick={onOpenBrowser}
                    className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-200 rounded-sm transition-colors"
                    title="Open an existing workflow"
                >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Open
                </button>
                <button
                    onClick={onAddActivity}
                    disabled={isReadOnly}
                    className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-200 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add a new activity or trigger to the workflow"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Activity
                </button>
                <ExportDropdown disabled={isNew} onExport={onExport} />
                <ViewCodeDropdown disabled={isNew || !pythonCode} onViewCode={onViewCode} />
                <button
                    onClick={onGitHubSettings}
                    disabled={isNew}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-sm transition-colors disabled:opacity-50 ${githubConnected
                        ? 'text-green-700 hover:bg-green-100'
                        : 'text-slate-700 hover:bg-slate-200'
                        }`}
                    title={githubConnected ? 'GitHub connected' : 'Connect to GitHub'}
                >
                    <Github className="w-3.5 h-3.5" />
                    GitHub
                </button>
                <button
                    onClick={onProperties}
                    className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-200 rounded-sm transition-colors"
                    title="Workflow properties and schedule"
                >
                    <Settings className="w-3.5 h-3.5" />
                    Properties
                </button>
                <button
                    onClick={onExecutions}
                    disabled={isNew}
                    className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-200 rounded-sm transition-colors disabled:opacity-50"
                    title="View workflow executions"
                >
                    <Play className="w-3.5 h-3.5" />
                    Monitor
                </button>
                <button
                    onClick={onAutoLayout}
                    disabled={isReadOnly}
                    className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-200 rounded-sm transition-colors disabled:opacity-50"
                    title="Auto-align canvas top-to-bottom"
                >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Auto Layout
                </button>
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <button
                    onClick={onSave}
                    disabled={saving || isReadOnly}
                    className="flex items-center gap-1.5 px-3 py-1 bg-primary-600 text-white font-medium rounded-sm hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
        </div>
    );
}

