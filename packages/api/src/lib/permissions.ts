import { prisma } from './prisma.js';
import type { FolderPermission, GroupMember } from '../generated/prisma/client.js';

// Numerical hierarchy for folder permission levels
const FOLDER_PERMISSION_LEVELS: Record<string, number> = {
    READ: 1,
    OPERATOR: 2,
    WRITE: 3,
    ADMIN: 4,
};

type RequiredFolderLevel = keyof typeof FOLDER_PERMISSION_LEVELS;

/**
 * Evaluates whether a user has the requisite permission level to access a folder.
 * This checks:
 * 1. Is the user the creator/owner of the folder? (Always allowed)
 * 2. Does the user have a direct `FolderPermission` assigned that meets or exceeds the required level?
 * 3. Is the user a member of any group that has a `FolderPermission` assigned that meets or exceeds the required level?
 */
export async function canAccessFolder(
    user: { id: string } | null,
    folderId: string,
    requiredLevel: RequiredFolderLevel = 'READ'
): Promise<boolean> {
    if (!user) return false;

    // Fetch the folder and its permissions
    const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        include: {
            permissions: true,
        },
    });

    if (!folder) return false;

    // 1. Owner bypass
    if (folder.createdById === user.id) return true;

    const requiredWeight = FOLDER_PERMISSION_LEVELS[requiredLevel];

    // 2. Direct user permission
    const userPermission = folder.permissions.find((p: FolderPermission) => p.userId === user.id);
    if (userPermission) {
        const userWeight = FOLDER_PERMISSION_LEVELS[userPermission.permission] || 0;
        if (userWeight >= requiredWeight) return true;
    }

    // 3. Group memberships permission
    const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
    });

    const userGroupIds = memberships.map((m: Pick<GroupMember, 'groupId'>) => m.groupId);

    const bestGroupPermission = folder.permissions
        .filter((p: FolderPermission) => p.groupId && userGroupIds.includes(p.groupId))
        .map((p: FolderPermission) => FOLDER_PERMISSION_LEVELS[p.permission] || 0)
        .sort((a: number, b: number) => b - a)[0]; // Max permission weight

    if (bestGroupPermission !== undefined && bestGroupPermission >= requiredWeight) {
        return true;
    }

    return false;
}

/**
 * Evaluates whether a user has the requisite permission level to access a workflow.
 * Workflows inherit permissions from their parent Folder.
 * If the workflow is not in a folder, it falls back to legacy Group ownership or Creator limits.
 */
export async function canAccessWorkflow(
    user: { id: string } | null,
    workflowId: string,
    requiredLevel: RequiredFolderLevel = 'READ'
): Promise<boolean> {
    if (!user) return false;

    const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { folderId: true, groupId: true, createdById: true },
    });

    if (!workflow) return false;

    // 1. Owner bypass
    if (workflow.createdById === user.id) return true;

    // 2. Folder Inheritance
    if (workflow.folderId) {
        return canAccessFolder(user, workflow.folderId, requiredLevel);
    }

    // 3. Legacy Group Fallback
    // If not in a folder, we mandate they be in the `groupId` (if set) for ANY access.
    if (workflow.groupId) {
        const isMember = await prisma.groupMember.findUnique({
            where: { userId_groupId: { userId: user.id, groupId: workflow.groupId } }
        });
        return !!isMember;
    }

    // 4. If no folder and no group, but someone else created it, deny.
    return false;
}
