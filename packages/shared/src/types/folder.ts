/**
 * Folder and permission types for Twiddle
 */

export type FolderPermissionLevel = 'READ' | 'WRITE' | 'ADMIN';

export interface Folder {
    id: string;
    name: string;
    description?: string;
    color?: string;
    parentId?: string;
    groupId?: string;
    createdById?: string;
    createdAt: string;
    updatedAt: string;
    createdBy?: {
        id: string;
        name?: string;
        email: string;
    };
    group?: {
        id: string;
        name: string;
    };
    _count?: {
        workflows: number;
        children: number;
    };
    children?: Folder[];
    workflows?: unknown[];
    permissions?: FolderPermission[];
}

export interface FolderPermission {
    id: string;
    folderId: string;
    userId?: string;
    groupId?: string;
    permission: FolderPermissionLevel;
    createdAt: string;
    user?: {
        id: string;
        email: string;
        name?: string;
    };
    group?: {
        id: string;
        name: string;
    };
}

export interface FolderCreateInput {
    name: string;
    description?: string;
    color?: string;
    parentId?: string | null;
    groupId?: string | null;
}

export interface FolderUpdateInput {
    name?: string;
    description?: string;
    color?: string;
    parentId?: string | null;
}
