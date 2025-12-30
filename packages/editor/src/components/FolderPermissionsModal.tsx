/**
 * FolderPermissionsModal
 * 
 * Modal for managing folder permissions.
 * Allows adding, updating, and removing user/group permissions.
 * Extracted from WorkflowEditor.tsx for better modularity.
 */

import { useState } from 'react';
import { X, Shield, Folder, User, Users, Trash2 } from 'lucide-react';
import type { Folder as FolderType, FolderPermission, FolderPermissionLevel } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface FolderPermissionsModalProps {
    folder: FolderType;
    permissions: FolderPermission[];
    loading: boolean;
    availableUsers: { id: string; email: string; name?: string }[];
    availableGroups: { id: string; name: string }[];
    onClose: () => void;
    onAddPermission: (type: 'user' | 'group', targetId: string, level: FolderPermissionLevel) => void;
    onUpdatePermission: (permissionId: string, level: FolderPermissionLevel) => void;
    onDeletePermission: (permissionId: string) => void;
}

// =============================================================================
// Component
// =============================================================================

export function FolderPermissionsModal({
    folder,
    permissions,
    loading,
    availableUsers,
    availableGroups,
    onClose,
    onAddPermission,
    onUpdatePermission,
    onDeletePermission,
}: FolderPermissionsModalProps) {
    const [newPermissionType, setNewPermissionType] = useState<'user' | 'group'>('user');
    const [newPermissionTargetId, setNewPermissionTargetId] = useState('');
    const [newPermissionLevel, setNewPermissionLevel] = useState<FolderPermissionLevel>('READ');

    const handleAdd = () => {
        if (newPermissionTargetId) {
            onAddPermission(newPermissionType, newPermissionTargetId, newPermissionLevel);
            setNewPermissionTargetId('');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary-600" />
                        <h3 className="text-lg font-semibold text-slate-900">
                            Folder Permissions
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Folder info */}
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-amber-600" />
                        <span className="font-medium text-slate-900">{folder.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Users and groups with access to this folder can view or edit workflows within it.
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Add new permission */}
                            <AddPermissionForm
                                permissionType={newPermissionType}
                                targetId={newPermissionTargetId}
                                level={newPermissionLevel}
                                availableUsers={availableUsers}
                                availableGroups={availableGroups}
                                onTypeChange={(type) => {
                                    setNewPermissionType(type);
                                    setNewPermissionTargetId('');
                                }}
                                onTargetChange={setNewPermissionTargetId}
                                onLevelChange={setNewPermissionLevel}
                                onAdd={handleAdd}
                            />

                            {/* Existing permissions */}
                            <PermissionsList
                                permissions={permissions}
                                onUpdatePermission={onUpdatePermission}
                                onDeletePermission={onDeletePermission}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Internal Components
// =============================================================================

interface AddPermissionFormProps {
    permissionType: 'user' | 'group';
    targetId: string;
    level: FolderPermissionLevel;
    availableUsers: { id: string; email: string; name?: string }[];
    availableGroups: { id: string; name: string }[];
    onTypeChange: (type: 'user' | 'group') => void;
    onTargetChange: (targetId: string) => void;
    onLevelChange: (level: FolderPermissionLevel) => void;
    onAdd: () => void;
}

function AddPermissionForm({
    permissionType,
    targetId,
    level,
    availableUsers,
    availableGroups,
    onTypeChange,
    onTargetChange,
    onLevelChange,
    onAdd,
}: AddPermissionFormProps) {
    return (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-2">Add Permission</div>
            <div className="flex items-center gap-2">
                <select
                    value={permissionType}
                    onChange={(e) => onTypeChange(e.target.value as 'user' | 'group')}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="user">User</option>
                    <option value="group">Group</option>
                </select>
                <select
                    value={targetId}
                    onChange={(e) => onTargetChange(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">Select {permissionType}...</option>
                    {permissionType === 'user'
                        ? availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name || u.email}
                            </option>
                        ))
                        : availableGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.name}
                            </option>
                        ))}
                </select>
                <select
                    value={level}
                    onChange={(e) => onLevelChange(e.target.value as FolderPermissionLevel)}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="READ">Read</option>
                    <option value="WRITE">Write</option>
                    <option value="ADMIN">Admin</option>
                </select>
                <button
                    onClick={onAdd}
                    disabled={!targetId}
                    className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Add
                </button>
            </div>
        </div>
    );
}

interface PermissionsListProps {
    permissions: FolderPermission[];
    onUpdatePermission: (permissionId: string, level: FolderPermissionLevel) => void;
    onDeletePermission: (permissionId: string) => void;
}

function PermissionsList({
    permissions,
    onUpdatePermission,
    onDeletePermission,
}: PermissionsListProps) {
    return (
        <div>
            <div className="text-sm font-medium text-slate-700 mb-2">Current Permissions</div>
            {permissions.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-4">
                    No permissions set. Only the folder owner has access.
                </div>
            ) : (
                <div className="space-y-2">
                    {permissions.map((perm) => (
                        <div
                            key={perm.id}
                            className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded"
                        >
                            <div className="flex items-center gap-2">
                                {perm.user ? (
                                    <>
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">{perm.user.name || perm.user.email}</span>
                                    </>
                                ) : perm.group ? (
                                    <>
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="text-sm">{perm.group.name}</span>
                                    </>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={perm.permission}
                                    onChange={(e) => onUpdatePermission(perm.id, e.target.value as FolderPermissionLevel)}
                                    className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="READ">Read</option>
                                    <option value="WRITE">Write</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                                <button
                                    onClick={() => onDeletePermission(perm.id)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Remove permission"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
