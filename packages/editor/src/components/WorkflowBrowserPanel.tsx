/**
 * WorkflowBrowserPanel
 * 
 * A panel component for browsing and managing workflows.
 * Displays folders and workflows with navigation, search, and CRUD operations.
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    FolderOpen,
    ChevronRight,
    Folder,
    FolderPlus,
    Users,
    Clock,
    Trash2,
    Pencil,
    Check,
    Shield,
    GripVertical,
    Plus,
    History,
} from 'lucide-react';
import { RightPanel } from '@/components/RightPanel';
import { EnvironmentBadge } from '@/components/EnvironmentBadge';
import { formatDate } from '@/utils/workflowUtils';
import type { Workflow, Folder as FolderType } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface WorkflowBrowserPanelProps {
    // Visibility
    isOpen: boolean;
    onClose: () => void;

    // Current workflow ID (to highlight current)
    currentWorkflowId?: string;

    // Folder state from useWorkflowBrowser hook
    loading: boolean;
    folders: FolderType[];
    currentFolderId: string | null;
    folderPath: FolderType[];
    workflows: Workflow[];

    // Navigation handlers
    onNavigateToFolder: (folder: FolderType) => void;
    onNavigateToBreadcrumb: (index: number) => void;

    // Folder CRUD
    onCreateFolder: (name: string) => Promise<void>;
    onRenameFolder: (folderId: string, newName: string) => Promise<void>;
    onDeleteFolder: (folderId: string) => Promise<void>;

    // New folder input state
    showNewFolderInput: boolean;
    setShowNewFolderInput: (show: boolean) => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;

    // Folder editing state
    editingFolderId: string | null;
    setEditingFolderId: (id: string | null) => void;
    editingFolderName: string;
    setEditingFolderName: (name: string) => void;

    // Drag and drop
    draggingWorkflowId: string | null;
    dragOverFolderId: string | null;
    onDragStart: (e: React.DragEvent, workflowId: string) => void;
    onDragEnd: () => void;
    onDragOver: (e: React.DragEvent, folderId: string | null) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, targetFolderId: string | null) => Promise<void>;

    // Workflow actions
    onOpenWorkflow: (workflowId: string) => void;
    onRenameWorkflow: (workflowId: string, newName: string) => Promise<void>;
    onDeleteWorkflow: (workflow: Workflow) => void;
    onOpenPermissions: (folder: FolderType) => void;
    onCreateNewWorkflow: (folderId: string | null) => void;

    // Optional: Version history
    onVersionHistory?: (workflow: Workflow) => void;
}

// =============================================================================
// Component
// =============================================================================

export function WorkflowBrowserPanel({
    isOpen,
    onClose,
    currentWorkflowId,
    loading,
    folders,
    currentFolderId,
    folderPath,
    workflows,
    onNavigateToFolder,
    onNavigateToBreadcrumb,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    showNewFolderInput,
    setShowNewFolderInput,
    newFolderName,
    setNewFolderName,
    editingFolderId,
    setEditingFolderId,
    editingFolderName,
    setEditingFolderName,
    draggingWorkflowId,
    dragOverFolderId,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragLeave,
    onDrop,
    onOpenWorkflow,
    onRenameWorkflow,
    onDeleteWorkflow,
    onOpenPermissions,
    onCreateNewWorkflow,
    onVersionHistory,
}: WorkflowBrowserPanelProps) {
    // Internal state for workflow editing (inline rename)
    const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
    const [editingWorkflowName, setEditingWorkflowName] = useState('');

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workflow: Workflow } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Close context menu on click outside
    useEffect(() => {
        if (!contextMenu) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [contextMenu]);

    const handleFolderKeyDown = (e: React.KeyboardEvent, folderId: string) => {
        if (e.key === 'Enter') {
            onRenameFolder(folderId, editingFolderName);
        } else if (e.key === 'Escape') {
            setEditingFolderId(null);
            setEditingFolderName('');
        }
    };

    const handleNewFolderKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            await onCreateFolder(newFolderName);
        } else if (e.key === 'Escape') {
            setShowNewFolderInput(false);
            setNewFolderName('');
        }
    };

    const handleWorkflowKeyDown = (e: React.KeyboardEvent, workflowId: string) => {
        if (e.key === 'Enter') {
            onRenameWorkflow(workflowId, editingWorkflowName);
            setEditingWorkflowId(null);
            setEditingWorkflowName('');
        } else if (e.key === 'Escape') {
            setEditingWorkflowId(null);
            setEditingWorkflowName('');
        }
    };

    return (
        <RightPanel isOpen={isOpen} onClose={onClose}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Open Workflow</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNewFolderInput(true)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="New folder"
                    >
                        <FolderPlus className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1 text-sm">
                    <button
                        onClick={() => onNavigateToBreadcrumb(-1)}
                        className={`hover:text-primary-600 ${folderPath.length === 0 ? 'font-medium text-slate-900' : 'text-slate-500'}`}
                    >
                        All Workflows
                    </button>
                    {folderPath.map((folder, index) => (
                        <span key={folder.id} className="flex items-center gap-1">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <button
                                onClick={() => onNavigateToBreadcrumb(index)}
                                className={`hover:text-primary-600 ${index === folderPath.length - 1 ? 'font-medium text-slate-900' : 'text-slate-500'}`}
                            >
                                {folder.name}
                            </button>
                        </span>
                    ))}
                </div>
                {folderPath.length > 0 && folderPath[folderPath.length - 1]?.group && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        <span>Group: {folderPath[folderPath.length - 1].group?.name}</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* New folder input */}
                {showNewFolderInput && (
                    <div className="mb-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <Folder className="w-5 h-5 text-amber-600" />
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={handleNewFolderKeyDown}
                            className="flex-1 px-2 py-1 border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                            placeholder="Folder name"
                            autoFocus
                        />
                        <button
                            onClick={() => onCreateFolder(newFolderName)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                setShowNewFolderInput(false);
                                setNewFolderName('');
                            }}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="text-center text-slate-500 py-8">Loading...</div>
                )}

                {/* Folders */}
                {!loading && folders.length > 0 && (
                    <div className="mb-4">
                        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Folders</h3>
                        <div className="space-y-1">
                            {folders.map((folder) => (
                                <div
                                    key={folder.id}
                                    className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${dragOverFolderId === folder.id
                                        ? 'bg-primary-100 ring-2 ring-primary-500'
                                        : 'hover:bg-slate-100'
                                        }`}
                                    onClick={() => {
                                        if (editingFolderId !== folder.id) {
                                            onNavigateToFolder(folder);
                                        }
                                    }}
                                    onDragOver={(e) => onDragOver(e, folder.id)}
                                    onDragLeave={onDragLeave}
                                    onDrop={(e) => onDrop(e, folder.id)}
                                >
                                    <FolderOpen className="w-5 h-5 text-amber-500" />
                                    {editingFolderId === folder.id ? (
                                        <input
                                            type="text"
                                            value={editingFolderName}
                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                            onKeyDown={(e) => handleFolderKeyDown(e, folder.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex-1 px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="flex-1 text-slate-700">{folder.name}</span>
                                    )}
                                    {folder.group && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {folder.group.name}
                                        </span>
                                    )}
                                    <div className="hidden group-hover:flex items-center gap-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenPermissions(folder);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                            title="Permissions"
                                        >
                                            <Shield className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingFolderId(folder.id);
                                                setEditingFolderName(folder.name);
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                            title="Rename"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteFolder(folder.id);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Workflows */}
                {!loading && (
                    <div>
                        <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Workflows</h3>
                        {workflows.length === 0 ? (
                            <div className="text-center text-slate-400 py-8">
                                No workflows in this folder
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {workflows.map((workflow) => (
                                    <div
                                        key={workflow.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, workflow.id)}
                                        onDragEnd={onDragEnd}
                                        onClick={() => {
                                            if (editingWorkflowId !== workflow.id) {
                                                onClose();
                                                onOpenWorkflow(workflow.id);
                                            }
                                        }}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            setContextMenu({ x: e.clientX, y: e.clientY, workflow });
                                        }}
                                        className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${workflow.id === currentWorkflowId
                                            ? 'bg-primary-50 ring-1 ring-primary-200'
                                            : draggingWorkflowId === workflow.id
                                                ? 'opacity-50 bg-slate-100'
                                                : 'hover:bg-slate-100'
                                            }`}
                                    >
                                        <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
                                        <div className="flex-1 min-w-0">
                                            {editingWorkflowId === workflow.id ? (
                                                <input
                                                    type="text"
                                                    value={editingWorkflowName}
                                                    onChange={(e) => setEditingWorkflowName(e.target.value)}
                                                    onKeyDown={(e) => handleWorkflowKeyDown(e, workflow.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full px-2 py-0.5 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    <div className="font-medium text-slate-900 truncate">
                                                        {workflow.name}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{formatDate(workflow.updatedAt)}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <EnvironmentBadge environment={workflow.environment} />
                                            {onVersionHistory && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onVersionHistory(workflow);
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                                    title="Version History"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingWorkflowId(workflow.id);
                                                    setEditingWorkflowName(workflow.name);
                                                }}
                                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                                title="Rename"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteWorkflow(workflow);
                                                }}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                    onClick={() => onCreateNewWorkflow(currentFolderId)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Create New Workflow{currentFolderId ? ` in ${folderPath[folderPath.length - 1]?.name || 'folder'}` : ''}
                </button>
            </div>

            {/* Context Menu Portal */}
            {contextMenu && createPortal(
                <div
                    ref={contextMenuRef}
                    className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={() => {
                            setEditingWorkflowId(contextMenu.workflow.id);
                            setEditingWorkflowName(contextMenu.workflow.name);
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                    >
                        <Pencil className="w-4 h-4" />
                        Rename
                    </button>
                    <button
                        onClick={() => {
                            onDeleteWorkflow(contextMenu.workflow);
                            setContextMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </div>,
                document.body
            )}
        </RightPanel>
    );
}
