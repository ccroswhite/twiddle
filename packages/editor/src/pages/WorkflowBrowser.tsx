/**
 * WorkflowBrowser Page
 * 
 * A full-page workflow browser for navigating folders and selecting workflows.
 * Users can browse, create new workflows, and organize workflows into folders.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
    FolderOpen,
    ChevronRight,
    Folder,
    FolderPlus,
    Users,
    Clock,
    Trash2,
    Pencil,
    Check,
    GripVertical,
    Plus,
    X,
    Workflow,
} from 'lucide-react';
import { useWorkflowBrowser } from '@/hooks/useWorkflowBrowser';
import { useAuth } from '@/contexts/AuthContext';
import { EnvironmentBadge } from '@/components/EnvironmentBadge';
import { formatDate } from '@/utils/workflowUtils';
import type { Workflow as WorkflowType } from '@/lib/api';
import { workflowsApi } from '@/lib/api';

export function WorkflowBrowser() {
    useAuth(); // Ensure user is authenticated
    const navigate = useNavigate();

    // Use the existing workflow browser hook
    const {
        loading,
        folders,
        currentFolderId,
        folderPath,
        workflows,
        navigateToFolder,
        navigateToBreadcrumb,
        createFolder,
        renameFolder,
        deleteFolder,
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
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        loadContents,
        open,
    } = useWorkflowBrowser();

    // Internal state for workflow editing (inline rename)
    const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
    const [editingWorkflowName, setEditingWorkflowName] = useState('');

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workflow: WorkflowType } | null>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    // Delete confirmation state
    const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowType | null>(null);

    // Load contents on mount
    useEffect(() => {
        open();
    }, [open]);

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
            renameFolder(folderId, editingFolderName);
        } else if (e.key === 'Escape') {
            setEditingFolderId(null);
            setEditingFolderName('');
        }
    };

    const handleNewFolderKeyDown = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            await createFolder(newFolderName);
        } else if (e.key === 'Escape') {
            setShowNewFolderInput(false);
            setNewFolderName('');
        }
    };

    const handleWorkflowKeyDown = async (e: React.KeyboardEvent, workflowId: string) => {
        if (e.key === 'Enter') {
            await handleRenameWorkflow(workflowId, editingWorkflowName);
            setEditingWorkflowId(null);
            setEditingWorkflowName('');
        } else if (e.key === 'Escape') {
            setEditingWorkflowId(null);
            setEditingWorkflowName('');
        }
    };

    const handleOpenWorkflow = (workflowId: string) => {
        navigate(`/workflows/${workflowId}`);
    };

    const handleCreateNewWorkflow = (folderId: string | null) => {
        // Store the folder ID for the new workflow
        if (folderId) {
            sessionStorage.setItem('newWorkflowFolderId', folderId);
        } else {
            sessionStorage.removeItem('newWorkflowFolderId');
        }
        navigate('/workflows/new');
    };

    const handleRenameWorkflow = async (workflowId: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            await workflowsApi.update(workflowId, { name: newName.trim() });
            await loadContents(currentFolderId);
        } catch (err) {
            alert(`Failed to rename workflow: ${(err as Error).message}`);
        }
    };

    const handleDeleteWorkflow = async (workflow: WorkflowType) => {
        try {
            await workflowsApi.delete(workflow.id);
            await loadContents(currentFolderId);
            setDeletingWorkflow(null);
        } catch (err) {
            alert(`Failed to delete workflow: ${(err as Error).message}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
                    <p className="text-slate-500">Browse, create, and manage your automation workflows</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNewFolderInput(true)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <FolderPlus className="w-5 h-5" />
                        New Folder
                    </button>
                    <button
                        onClick={() => handleCreateNewWorkflow(currentFolderId)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        New Workflow
                    </button>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="mb-6 px-4 py-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-1 text-sm">
                    <button
                        onClick={() => navigateToBreadcrumb(-1)}
                        className={`hover:text-primary-600 flex items-center gap-1 ${folderPath.length === 0 ? 'font-medium text-slate-900' : 'text-slate-500'}`}
                    >
                        <Workflow className="w-4 h-4" />
                        All Workflows
                    </button>
                    {folderPath.map((folder, index) => (
                        <span key={folder.id} className="flex items-center gap-1">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                            <button
                                onClick={() => navigateToBreadcrumb(index)}
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

            {/* New folder input */}
            {showNewFolderInput && (
                <div className="mb-4 flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Folder className="w-5 h-5 text-amber-600" />
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={handleNewFolderKeyDown}
                        className="flex-1 px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        placeholder="Folder name"
                        autoFocus
                    />
                    <button
                        onClick={() => createFolder(newFolderName)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    >
                        <Check className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => {
                            setShowNewFolderInput(false);
                            setNewFolderName('');
                        }}
                        className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Folders */}
            {folders.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-sm font-medium text-slate-500 uppercase mb-3">Folders</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                className={`group flex items-center gap-3 p-4 bg-white border rounded-lg cursor-pointer transition-colors ${dragOverFolderId === folder.id
                                    ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500'
                                    : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                                    }`}
                                onClick={() => {
                                    if (editingFolderId !== folder.id) {
                                        navigateToFolder(folder);
                                    }
                                }}
                                onDragOver={(e) => handleDragOver(e, folder.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, folder.id)}
                            >
                                <FolderOpen className="w-6 h-6 text-amber-500" />
                                <div className="flex-1 min-w-0">
                                    {editingFolderId === folder.id ? (
                                        <input
                                            type="text"
                                            value={editingFolderName}
                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                            onKeyDown={(e) => handleFolderKeyDown(e, folder.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-medium text-slate-900 truncate block">{folder.name}</span>
                                    )}
                                    {folder.group && (
                                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                                            <Users className="w-3 h-3" />
                                            {folder.group.name}
                                        </span>
                                    )}
                                </div>
                                <div className="hidden group-hover:flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingFolderId(folder.id);
                                            setEditingFolderName(folder.name);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                        title="Rename"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteFolder(folder.id);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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
            <div>
                <h2 className="text-sm font-medium text-slate-500 uppercase mb-3">Workflows</h2>
                {workflows.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
                        <Workflow className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-400 mb-4">No workflows in this folder</p>
                        <button
                            onClick={() => handleCreateNewWorkflow(currentFolderId)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Workflow
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {workflows.map((workflow) => (
                            <div
                                key={workflow.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, workflow.id)}
                                onDragEnd={handleDragEnd}
                                onClick={() => {
                                    if (editingWorkflowId !== workflow.id) {
                                        handleOpenWorkflow(workflow.id);
                                    }
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    setContextMenu({ x: e.clientX, y: e.clientY, workflow });
                                }}
                                className={`group flex items-start gap-3 p-4 bg-white border rounded-lg cursor-pointer transition-colors ${draggingWorkflowId === workflow.id
                                    ? 'opacity-50 bg-slate-100 border-slate-200'
                                    : 'border-slate-200 hover:border-primary-300 hover:shadow-sm'
                                    }`}
                            >
                                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab mt-1" />
                                <div className="flex-1 min-w-0">
                                    {editingWorkflowId === workflow.id ? (
                                        <input
                                            type="text"
                                            value={editingWorkflowName}
                                            onChange={(e) => setEditingWorkflowName(e.target.value)}
                                            onKeyDown={(e) => handleWorkflowKeyDown(e, workflow.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <div className="font-medium text-slate-900 truncate">
                                                {workflow.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatDate(workflow.updatedAt)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <EnvironmentBadge environment={workflow.environment} />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingWorkflowId(workflow.id);
                                            setEditingWorkflowName(workflow.name);
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Rename"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingWorkflow(workflow);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
                            setDeletingWorkflow(contextMenu.workflow);
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

            {/* Delete Confirmation Modal */}
            {deletingWorkflow && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setDeletingWorkflow(null)}
                    />

                    {/* Modal */}
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    Delete Workflow
                                </h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    Are you sure you want to delete <strong>"{deletingWorkflow.name}"</strong>?
                                    This action cannot be undone.
                                </p>
                                {deletingWorkflow.environment !== 'DV' && (
                                    <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                                        ⚠️ This workflow is in <strong>{deletingWorkflow.environment}</strong> environment.
                                        Deleting it may affect production systems.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingWorkflow(null)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteWorkflow(deletingWorkflow)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete Workflow
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
