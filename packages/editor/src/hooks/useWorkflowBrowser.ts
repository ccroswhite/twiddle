/**
 * useWorkflowBrowser Hook
 * 
 * Manages the workflow browser modal state including:
 * - Folder navigation and breadcrumbs
 * - Loading workflows and folders
 * - Folder CRUD operations
 * - Drag and drop for moving workflows
 */

import { useState, useCallback } from 'react';
import { workflowsApi, foldersApi, type Workflow, type Folder } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface UseWorkflowBrowserReturn {
    // Visibility
    isOpen: boolean;
    open: () => void;
    close: () => void;

    // Loading state
    loading: boolean;

    // Folders
    folders: Folder[];
    currentFolderId: string | null;
    folderPath: Folder[];

    // Workflows
    workflows: Workflow[];

    // Navigation
    navigateToFolder: (folder: Folder) => Promise<void>;
    navigateToBreadcrumb: (index: number) => Promise<void>;
    loadContents: (folderId?: string | null) => Promise<void>;

    // Folder CRUD
    createFolder: (name: string) => Promise<void>;
    renameFolder: (folderId: string, newName: string) => Promise<void>;
    deleteFolder: (folderId: string) => Promise<void>;

    // New folder input
    showNewFolderInput: boolean;
    setShowNewFolderInput: (show: boolean) => void;
    newFolderName: string;
    setNewFolderName: (name: string) => void;

    // Folder editing
    editingFolderId: string | null;
    setEditingFolderId: (id: string | null) => void;
    editingFolderName: string;
    setEditingFolderName: (name: string) => void;

    // Drag and drop
    draggingWorkflowId: string | null;
    dragOverFolderId: string | null;
    handleDragStart: (e: React.DragEvent, workflowId: string) => void;
    handleDragEnd: () => void;
    handleDragOver: (e: React.DragEvent, folderId: string | null) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent, targetFolderId: string | null) => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWorkflowBrowser(): UseWorkflowBrowserReturn {
    // Visibility
    const [isOpen, setIsOpen] = useState(false);

    // Loading
    const [loading, setLoading] = useState(false);

    // Folders
    const [folders, setFolders] = useState<Folder[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folderPath, setFolderPath] = useState<Folder[]>([]);

    // Workflows
    const [workflows, setWorkflows] = useState<Workflow[]>([]);

    // New folder input
    const [showNewFolderInput, setShowNewFolderInput] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Folder editing
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    // Drag and drop
    const [draggingWorkflowId, setDraggingWorkflowId] = useState<string | null>(null);
    const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

    // ==========================================================================
    // Core Operations
    // ==========================================================================

    const loadContents = useCallback(async (folderId: string | null = null) => {
        try {
            setLoading(true);
            const [foldersData, workflowsData] = await Promise.all([
                foldersApi.list(folderId || undefined),
                workflowsApi.list(),
            ]);
            setFolders(foldersData);

            // Filter workflows to show only those in the current folder (or root)
            const filteredWorkflows = workflowsData.filter(w => {
                const viewingRoot = !folderId;
                const isInRoot = !w.folderId || w.folderId === 'null';

                if (viewingRoot) {
                    return isInRoot;
                }
                return w.folderId === folderId;
            });
            setWorkflows(filteredWorkflows);
        } catch (err) {
            console.error('Failed to load folder contents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const open = useCallback(() => {
        setIsOpen(true);
        loadContents(null);
    }, [loadContents]);

    const close = useCallback(() => {
        setIsOpen(false);
        // Reset state when closing
        setCurrentFolderId(null);
        setFolderPath([]);
        setShowNewFolderInput(false);
        setNewFolderName('');
        setEditingFolderId(null);
        setEditingFolderName('');
    }, []);

    // ==========================================================================
    // Navigation
    // ==========================================================================

    const navigateToFolder = useCallback(async (folder: Folder) => {
        setCurrentFolderId(folder.id);
        setFolderPath(prev => [...prev, folder]);
        await loadContents(folder.id);
    }, [loadContents]);

    const navigateToBreadcrumb = useCallback(async (index: number) => {
        if (index === -1) {
            // Navigate to root
            setFolderPath([]);
            setCurrentFolderId(null);
            await loadContents(null);
        } else {
            const newPath = folderPath.slice(0, index + 1);
            const folder = newPath[newPath.length - 1];
            setFolderPath(newPath);
            setCurrentFolderId(folder?.id || null);
            await loadContents(folder?.id || null);
        }
    }, [folderPath, loadContents]);

    // ==========================================================================
    // Folder CRUD
    // ==========================================================================

    const createFolder = useCallback(async (name: string) => {
        if (!name.trim()) return;
        try {
            const folder = await foldersApi.create({
                name: name.trim(),
                parentId: currentFolderId || undefined,
            });
            setFolders(prev => [...prev, folder]);
            setNewFolderName('');
            setShowNewFolderInput(false);
        } catch (err) {
            alert(`Failed to create folder: ${(err as Error).message}`);
        }
    }, [currentFolderId]);

    const renameFolder = useCallback(async (folderId: string, newName: string) => {
        if (!newName.trim()) return;
        try {
            await foldersApi.update(folderId, { name: newName.trim() });
            setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
            setEditingFolderId(null);
            setEditingFolderName('');
        } catch (err) {
            alert(`Failed to rename folder: ${(err as Error).message}`);
        }
    }, []);

    const deleteFolder = useCallback(async (folderId: string) => {
        if (!confirm('Are you sure you want to delete this folder? It must be empty.')) return;
        try {
            await foldersApi.delete(folderId);
            setFolders(prev => prev.filter(f => f.id !== folderId));
        } catch (err) {
            alert(`Failed to delete folder: ${(err as Error).message}`);
        }
    }, []);

    // ==========================================================================
    // Drag and Drop
    // ==========================================================================

    const handleDragStart = useCallback((e: React.DragEvent, workflowId: string) => {
        e.dataTransfer.setData('workflowId', workflowId);
        setDraggingWorkflowId(workflowId);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggingWorkflowId(null);
        setDragOverFolderId(null);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        setDragOverFolderId(folderId);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverFolderId(null);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, targetFolderId: string | null) => {
        e.preventDefault();
        const workflowId = e.dataTransfer.getData('workflowId');
        if (!workflowId) return;

        try {
            if (targetFolderId) {
                await foldersApi.addWorkflow(targetFolderId, workflowId);
            } else if (currentFolderId) {
                await foldersApi.removeWorkflow(currentFolderId, workflowId);
            }
            await loadContents(currentFolderId);
        } catch (err) {
            alert(`Failed to move workflow: ${(err as Error).message}`);
        } finally {
            setDraggingWorkflowId(null);
            setDragOverFolderId(null);
        }
    }, [currentFolderId, loadContents]);

    return {
        // Visibility
        isOpen,
        open,
        close,

        // Loading
        loading,

        // Folders
        folders,
        currentFolderId,
        folderPath,

        // Workflows
        workflows,

        // Navigation
        navigateToFolder,
        navigateToBreadcrumb,
        loadContents,

        // Folder CRUD
        createFolder,
        renameFolder,
        deleteFolder,

        // New folder input
        showNewFolderInput,
        setShowNewFolderInput,
        newFolderName,
        setNewFolderName,

        // Folder editing
        editingFolderId,
        setEditingFolderId,
        editingFolderName,
        setEditingFolderName,

        // Drag and drop
        draggingWorkflowId,
        dragOverFolderId,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDragLeave,
        handleDrop,
    };
}
