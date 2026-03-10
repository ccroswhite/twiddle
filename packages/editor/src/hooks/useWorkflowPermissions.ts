import { useState } from 'react';
import { foldersApi } from '@/lib/api';
import type { FolderPermission, FolderPermissionLevel } from '@twiddle/shared';
// We assume FolderType is used locally in WorkflowEditor, matching a simple interface
export interface BaseFolderInfo {
    id: string;
    name: string;
}

export function useWorkflowPermissions(initialFolder: BaseFolderInfo | null = null) {
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [permissionsFolder, setPermissionsFolder] = useState<BaseFolderInfo | null>(initialFolder);
    const [folderPermissions, setFolderPermissions] = useState<FolderPermission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const loadPermissions = async (folderId: string) => {
        setLoadingPermissions(true);
        try {
            const permissions = await foldersApi.getPermissions(folderId);
            setFolderPermissions(permissions);
        } catch (err) {
            console.error('Failed to load permissions:', err);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const handleAddPermission = async (type: 'user' | 'group', targetId: string, level: FolderPermissionLevel) => {
        if (!permissionsFolder || !targetId) return;
        try {
            const permission = await foldersApi.addPermission(permissionsFolder.id, {
                userId: type === 'user' ? targetId : undefined,
                groupId: type === 'group' ? targetId : undefined,
                permission: level,
            });
            setFolderPermissions(prev => [...prev, permission]);
        } catch (err) {
            alert(`Failed to add permission: ${(err as Error).message}`);
        }
    };

    const handleUpdatePermission = async (permissionId: string, level: FolderPermissionLevel) => {
        if (!permissionsFolder) return;
        try {
            const updated = await foldersApi.updatePermission(permissionsFolder.id, permissionId, {
                permission: level,
            });
            setFolderPermissions(prev =>
                prev.map(p => p.id === permissionId ? updated : p)
            );
        } catch (err) {
            alert(`Failed to update permission: ${(err as Error).message}`);
        }
    };

    const handleDeletePermission = async (permissionId: string) => {
        if (!permissionsFolder) return;
        try {
            await foldersApi.deletePermission(permissionsFolder.id, permissionId);
            setFolderPermissions(prev => prev.filter(p => p.id !== permissionId));
        } catch (err) {
            alert(`Failed to delete permission: ${(err as Error).message}`);
        }
    };

    const openPermissionsModal = async (folder: BaseFolderInfo) => {
        setPermissionsFolder(folder);
        await loadPermissions(folder.id);
        setShowPermissionsModal(true);
    };

    return {
        showPermissionsModal,
        setShowPermissionsModal,
        permissionsFolder,
        setPermissionsFolder,
        folderPermissions,
        loadingPermissions,
        handleAddPermission,
        handleUpdatePermission,
        handleDeletePermission,
        openPermissionsModal,
    };
}
