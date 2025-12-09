/**
 * Group management routes
 * 
 * Permissions:
 * - Only system administrators can create groups
 * - Only system administrators can assign group admin role
 * - Group admins can add/remove members (but not assign admin role)
 * - Users can remove themselves from any group
 * - All users are added to the Default group on registration
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';

// Helper to get current user with admin status
async function getCurrentUser(request: { user?: { id: string } }) {
  const userId = request.user?.id;
  if (!userId) return null;
  
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true, email: true, name: true },
  });
}

// Helper to check if user is group admin
async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return membership?.role === 'admin' || membership?.role === 'owner';
}

// Helper to check if user can manage group members
async function canManageGroupMembers(userId: string, groupId: string, isSystemAdmin: boolean): Promise<boolean> {
  if (isSystemAdmin) return true;
  return isGroupAdmin(userId, groupId);
}

export const groupRoutes: FastifyPluginAsync = async (app) => {
  // List all groups (that the user has access to)
  app.get('/', async (request, _reply) => {
    const user = await getCurrentUser(request as { user?: { id: string } });
    
    // If user is admin, show all groups
    if (user?.isAdmin) {
      const groups = await prisma.group.findMany({
        include: {
          _count: {
            select: {
              members: true,
              workflows: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      
      return groups.map((g: typeof groups[number]) => ({
        ...g,
        role: 'admin', // System admin has admin access to all groups
        memberCount: g._count.members,
        workflowCount: g._count.workflows,
      }));
    }
    
    // If user is authenticated, get their groups
    if (user) {
      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        include: {
          group: {
            include: {
              _count: {
                select: {
                  members: true,
                  workflows: true,
                },
              },
            },
          },
        },
      });
      
      return memberships.map((m: typeof memberships[number]) => ({
        ...m.group,
        role: m.role,
        memberCount: m.group._count.members,
        workflowCount: m.group._count.workflows,
      }));
    }
    
    // Unauthenticated mode - return all groups
    const groups = await prisma.group.findMany({
      include: {
        _count: {
          select: {
            members: true,
            workflows: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    return groups.map((g: typeof groups[number]) => ({
      ...g,
      memberCount: g._count.members,
      workflowCount: g._count.workflows,
    }));
  });

  // Get a single group
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            workflows: true,
            credentials: true,
          },
        },
      },
    });
    
    if (!group) {
      return reply.status(404).send({ error: 'Group not found' });
    }
    
    return {
      ...group,
      workflowCount: group._count.workflows,
      credentialCount: group._count.credentials,
    };
  });

  // Create a new group (admin only)
  app.post<{
    Body: {
      name: string;
      description?: string;
      isDefault?: boolean;
    };
  }>('/', async (request, reply) => {
    const user = await getCurrentUser(request as { user?: { id: string } });
    
    // Only system administrators can create groups
    if (!user?.isAdmin) {
      return reply.status(403).send({ error: 'Only administrators can create groups' });
    }
    
    const { name, description, isDefault } = request.body;
    
    if (!name) {
      return reply.status(400).send({ error: 'Name is required' });
    }
    
    // Check if group name already exists
    const existing = await prisma.group.findUnique({
      where: { name },
    });
    
    if (existing) {
      return reply.status(409).send({ error: 'Group with this name already exists' });
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.group.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    
    const group = await prisma.group.create({
      data: {
        name,
        description,
        isDefault: isDefault || false,
        createdById: user.id,
        // Add creator as admin of the group
        members: {
          create: {
            userId: user.id,
            role: 'admin',
          },
        },
      },
      include: {
        members: true,
      },
    });
    
    return reply.status(201).send(group);
  });

  // Update a group (admin or group admin only)
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      description?: string;
      isDefault?: boolean;
    };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const user = await getCurrentUser(request as { user?: { id: string } });
    
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    // Check permissions: system admin or group admin
    const canEdit = user.isAdmin || await isGroupAdmin(user.id, id);
    if (!canEdit) {
      return reply.status(403).send({ error: 'You do not have permission to edit this group' });
    }
    
    const { name, description, isDefault } = request.body;
    
    // Only system admin can change isDefault
    if (isDefault !== undefined && !user.isAdmin) {
      return reply.status(403).send({ error: 'Only administrators can change the default group' });
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.group.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    
    try {
      const group = await prisma.group.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });
      
      return group;
    } catch {
      return reply.status(404).send({ error: 'Group not found' });
    }
  });

  // Delete a group (admin only)
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const user = await getCurrentUser(request as { user?: { id: string } });
    
    // Only system administrators can delete groups
    if (!user?.isAdmin) {
      return reply.status(403).send({ error: 'Only administrators can delete groups' });
    }
    
    // Prevent deleting the default group
    const group = await prisma.group.findUnique({ where: { id } });
    if (group?.isDefault) {
      return reply.status(400).send({ error: 'Cannot delete the default group' });
    }
    
    try {
      await prisma.group.delete({
        where: { id },
      });
      
      return { success: true };
    } catch {
      return reply.status(404).send({ error: 'Group not found' });
    }
  });

  // =========================================================================
  // Group Members
  // =========================================================================

  // List members of a group
  app.get<{ Params: { id: string } }>('/:id/members', async (request, reply) => {
    const { id } = request.params;
    
    const members = await prisma.groupMember.findMany({
      where: { groupId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    if (members.length === 0) {
      // Check if group exists
      const group = await prisma.group.findUnique({ where: { id } });
      if (!group) {
        return reply.status(404).send({ error: 'Group not found' });
      }
    }
    
    return members.map((m: typeof members[number]) => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    }));
  });

  // Add a member to a group (admin or group admin only)
  app.post<{
    Params: { id: string };
    Body: {
      userId: string;
      role?: string;
    };
  }>('/:id/members', async (request, reply) => {
    const { id } = request.params;
    const { userId, role = 'member' } = request.body;
    const currentUser = await getCurrentUser(request as { user?: { id: string } });
    
    if (!currentUser) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    if (!userId) {
      return reply.status(400).send({ error: 'userId is required' });
    }
    
    // Check permissions: system admin or group admin can add members
    const canManage = await canManageGroupMembers(currentUser.id, id, currentUser.isAdmin);
    if (!canManage) {
      return reply.status(403).send({ error: 'You do not have permission to add members to this group' });
    }
    
    // Only system admin can assign admin role
    if (role === 'admin' && !currentUser.isAdmin) {
      return reply.status(403).send({ error: 'Only system administrators can assign the group admin role' });
    }
    
    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: { userId, groupId: id },
      },
    });
    
    if (existing) {
      return reply.status(409).send({ error: 'User is already a member of this group' });
    }
    
    try {
      const member = await prisma.groupMember.create({
        data: {
          userId,
          groupId: id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
      
      return reply.status(201).send(member);
    } catch {
      return reply.status(400).send({ error: 'Failed to add member' });
    }
  });

  // Update a member's role (admin or group admin only, but only admin can set admin role)
  app.put<{
    Params: { id: string; memberId: string };
    Body: { role: string };
  }>('/:id/members/:memberId', async (request, reply) => {
    const { id, memberId } = request.params;
    const { role } = request.body;
    const currentUser = await getCurrentUser(request as { user?: { id: string } });
    
    if (!currentUser) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    if (!role) {
      return reply.status(400).send({ error: 'role is required' });
    }
    
    // Check permissions
    const canManage = await canManageGroupMembers(currentUser.id, id, currentUser.isAdmin);
    if (!canManage) {
      return reply.status(403).send({ error: 'You do not have permission to update members in this group' });
    }
    
    // Only system admin can assign/remove admin role
    if (role === 'admin' && !currentUser.isAdmin) {
      return reply.status(403).send({ error: 'Only system administrators can assign the group admin role' });
    }
    
    // Check if changing from admin role (only system admin can do this)
    const existingMember = await prisma.groupMember.findUnique({ where: { id: memberId } });
    if (existingMember?.role === 'admin' && role !== 'admin' && !currentUser.isAdmin) {
      return reply.status(403).send({ error: 'Only system administrators can remove the group admin role' });
    }
    
    try {
      const member = await prisma.groupMember.update({
        where: { id: memberId },
        data: { role },
      });
      
      return member;
    } catch {
      return reply.status(404).send({ error: 'Member not found' });
    }
  });

  // Remove a member from a group
  // - Admin or group admin can remove any member
  // - Users can remove themselves from any group (except default group)
  app.delete<{ Params: { id: string; memberId: string } }>(
    '/:id/members/:memberId',
    async (request, reply) => {
      const { id, memberId } = request.params;
      const currentUser = await getCurrentUser(request as { user?: { id: string } });
      
      if (!currentUser) {
        return reply.status(401).send({ error: 'Authentication required' });
      }
      
      // Get the member being removed
      const memberToRemove = await prisma.groupMember.findUnique({
        where: { id: memberId },
        include: { group: true },
      });
      
      if (!memberToRemove) {
        return reply.status(404).send({ error: 'Member not found' });
      }
      
      // Check if user is removing themselves
      const isRemovingSelf = memberToRemove.userId === currentUser.id;
      
      if (isRemovingSelf) {
        // Users can remove themselves, but not from the default group
        if (memberToRemove.group.isDefault) {
          return reply.status(400).send({ error: 'You cannot leave the default group' });
        }
      } else {
        // Check permissions: system admin or group admin can remove others
        const canManage = await canManageGroupMembers(currentUser.id, id, currentUser.isAdmin);
        if (!canManage) {
          return reply.status(403).send({ error: 'You do not have permission to remove members from this group' });
        }
        
        // Group admins cannot remove other admins (only system admin can)
        if (memberToRemove.role === 'admin' && !currentUser.isAdmin) {
          return reply.status(403).send({ error: 'Only system administrators can remove group admins' });
        }
      }
      
      try {
        await prisma.groupMember.delete({
          where: { id: memberId },
        });
        
        return { success: true };
      } catch {
        return reply.status(404).send({ error: 'Member not found' });
      }
    },
  );

  // =========================================================================
  // Group Workflows
  // =========================================================================

  // List workflows in a group
  app.get<{ Params: { id: string } }>('/:id/workflows', async (request, reply) => {
    const { id } = request.params;
    
    const workflows = await prisma.workflow.findMany({
      where: { groupId: id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        active: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (workflows.length === 0) {
      // Check if group exists
      const group = await prisma.group.findUnique({ where: { id } });
      if (!group) {
        return reply.status(404).send({ error: 'Group not found' });
      }
    }
    
    return workflows;
  });
};
