import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

interface FolderCreateInput {
  name: string;
  description?: string;
  color?: string;
  parentId?: string;
  groupId?: string;
}

interface FolderUpdateInput {
  name?: string;
  description?: string;
  color?: string;
  parentId?: string;
  groupId?: string;
}

export const folderRoutes: FastifyPluginAsync = async (app) => {
  // List all folders (filtered by group membership if authenticated)
  app.get<{
    Querystring: { parentId?: string };
  }>('/', async (request, _reply) => {
    const userId = (request as { user?: { id: string } }).user?.id;
    const { parentId } = request.query;

    // Build where clause based on authentication and parent filter
    let whereClause: Prisma.FolderWhereInput = {
      parentId: parentId || null,
    };

    if (userId) {
      // Get user's group IDs
      const memberships = await prisma.groupMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      const userGroupIds = memberships.map((m) => m.groupId);

      // Show folders in user's groups OR created by user OR with no group
      whereClause = {
        ...whereClause,
        OR: [
          { groupId: { in: userGroupIds } },
          { createdById: userId },
          { groupId: null },
        ],
      };
    }

    const folders = await prisma.folder.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            workflows: true,
            children: true,
          },
        },
      },
    });

    return folders;
  });

  // Get a single folder with its contents
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                workflows: true,
                children: true,
              },
            },
          },
        },
        workflows: {
          orderBy: { updatedAt: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!folder) {
      return reply.status(404).send({ error: 'Folder not found' });
    }

    return folder;
  });

  // Create a new folder
  app.post<{ Body: FolderCreateInput }>('/', async (request, _reply) => {
    const { name, description, color, parentId, groupId } = request.body;
    const userId = (request as { user?: { id: string } }).user?.id;

    // If parentId is provided, inherit groupId from parent if not explicitly set
    let effectiveGroupId = groupId;
    if (parentId && !groupId) {
      const parentFolder = await prisma.folder.findUnique({
        where: { id: parentId },
        select: { groupId: true },
      });
      if (parentFolder) {
        effectiveGroupId = parentFolder.groupId || undefined;
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        color,
        parentId,
        groupId: effectiveGroupId,
        createdById: userId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return folder;
  });

  // Update a folder
  app.put<{ Params: { id: string }; Body: FolderUpdateInput }>(
    '/:id',
    async (request, reply) => {
      const { id } = request.params;
      const { name, description, color, parentId, groupId } = request.body;

      const existing = await prisma.folder.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Folder not found' });
      }

      // Prevent circular parent references
      if (parentId === id) {
        return reply.status(400).send({ error: 'Folder cannot be its own parent' });
      }

      const folder = await prisma.folder.update({
        where: { id },
        data: {
          name,
          description,
          color,
          parentId,
          groupId,
        },
        include: {
          group: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // If groupId changed, update all workflows in this folder to inherit new group
      if (groupId !== undefined && groupId !== existing.groupId) {
        await prisma.workflow.updateMany({
          where: { folderId: id },
          data: { groupId },
        });
      }

      return folder;
    }
  );

  // Delete a folder
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;

    const existing = await prisma.folder.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workflows: true,
            children: true,
          },
        },
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Folder not found' });
    }

    // Don't allow deleting folders with contents
    if (existing._count.workflows > 0 || existing._count.children > 0) {
      return reply.status(400).send({
        error: 'Cannot delete folder with contents. Move or delete workflows and subfolders first.',
      });
    }

    await prisma.folder.delete({ where: { id } });
    return { success: true };
  });

  // Move a workflow to a folder
  app.post<{ Params: { id: string }; Body: { workflowId: string } }>(
    '/:id/workflows',
    async (request, reply) => {
      const { id } = request.params;
      const { workflowId } = request.body;

      const folder = await prisma.folder.findUnique({
        where: { id },
        select: { groupId: true },
      });

      if (!folder) {
        return reply.status(404).send({ error: 'Folder not found' });
      }

      // Update workflow to be in this folder and inherit group
      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          folderId: id,
          groupId: folder.groupId,
        },
      });

      return workflow;
    }
  );

  // Remove a workflow from a folder (move to root)
  app.delete<{ Params: { id: string; workflowId: string } }>(
    '/:id/workflows/:workflowId',
    async (request, reply) => {
      const { workflowId } = request.params;

      const workflow = await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          folderId: null,
          // Keep the groupId when moving to root, or clear it
          // groupId: null,
        },
      });

      if (!workflow) {
        return reply.status(404).send({ error: 'Workflow not found' });
      }

      return workflow;
    }
  );

  // ============================================================================
  // Folder Permissions
  // ============================================================================

  // List permissions for a folder
  app.get<{ Params: { id: string } }>(
    '/:id/permissions',
    async (request, reply) => {
      const { id } = request.params;

      const folder = await prisma.folder.findUnique({
        where: { id },
        include: {
          permissions: {
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
              group: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!folder) {
        return reply.status(404).send({ error: 'Folder not found' });
      }

      return folder.permissions;
    }
  );

  // Add permission to a folder
  app.post<{
    Params: { id: string };
    Body: {
      userId?: string;
      groupId?: string;
      permission: 'READ' | 'WRITE' | 'ADMIN';
    };
  }>('/:id/permissions', async (request, reply) => {
    const { id } = request.params;
    const { userId, groupId, permission } = request.body;
    const currentUserId = (request as { user?: { id: string } }).user?.id;

    // Validate that either userId or groupId is provided, but not both
    if ((!userId && !groupId) || (userId && groupId)) {
      return reply.status(400).send({
        error: 'Either userId or groupId must be provided, but not both',
      });
    }

    // Check folder exists
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return reply.status(404).send({ error: 'Folder not found' });
    }

    // Create the permission
    const folderPermission = await prisma.folderPermission.create({
      data: {
        folderId: id,
        userId: userId || null,
        groupId: groupId || null,
        permission,
        createdById: currentUserId,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return reply.status(201).send(folderPermission);
  });

  // Update a permission
  app.put<{
    Params: { id: string; permissionId: string };
    Body: { permission: 'READ' | 'WRITE' | 'ADMIN' };
  }>('/:id/permissions/:permissionId', async (request, reply) => {
    const { id, permissionId } = request.params;
    const { permission } = request.body;

    // Check folder exists
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return reply.status(404).send({ error: 'Folder not found' });
    }

    const folderPermission = await prisma.folderPermission.update({
      where: { id: permissionId },
      data: { permission },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
      },
    });

    return folderPermission;
  });

  // Delete a permission
  app.delete<{ Params: { id: string; permissionId: string } }>(
    '/:id/permissions/:permissionId',
    async (request, reply) => {
      const { id, permissionId } = request.params;

      // Check folder exists
      const folder = await prisma.folder.findUnique({ where: { id } });
      if (!folder) {
        return reply.status(404).send({ error: 'Folder not found' });
      }

      await prisma.folderPermission.delete({
        where: { id: permissionId },
      });

      return reply.status(204).send();
    }
  );
};
