import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { CredentialCreateInput, CredentialUpdateInput } from '@twiddle/shared';
import { testCredential } from '../lib/datasourceTester.js';

// Helper to get user from session cookie
async function getUserFromSession(request: FastifyRequest) {
  const cookieHeader = request.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  );
  const token = cookies['twiddle_session'] || '';

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

// Get group IDs that a user belongs to
async function getUserGroupIds(userId: string): Promise<string[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  return memberships.map(m => m.groupId);
}

// Check if user can access a data source (owner, admin, in shared group, or legacy data source)
async function canAccessDataSource(
  user: { id: string; isAdmin: boolean },
  dataSource: { createdById: string | null; groups?: { groupId: string }[] }
): Promise<boolean> {
  // Admins can access all data sources
  if (user.isAdmin) return true;

  // Owner can always access
  if (dataSource.createdById === user.id) return true;

  // Legacy data sources (no owner) are accessible to all authenticated users
  if (dataSource.createdById === null) return true;

  // If shared with any groups, check membership
  if (dataSource.groups && dataSource.groups.length > 0) {
    const groupIds = dataSource.groups.map(g => g.groupId);
    const membership = await prisma.groupMember.findFirst({
      where: {
        userId: user.id,
        groupId: { in: groupIds }
      },
    });
    return !!membership;
  }

  return false;
}

export const credentialRoutes: FastifyPluginAsync = async (app) => {
  // List data sources the user can access (owned or shared via group)
  app.get('/', async (request, reply) => {
    const user = await getUserFromSession(request);

    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    // Get user's group IDs
    const groupIds = await getUserGroupIds(user.id);

    // Build query conditions:
    // - User owns the data source
    // - Data source is shared with a group user belongs to
    // - Legacy data sources (no owner) - visible to admins only
    // - Admins can see all data sources
    const whereConditions = user.isAdmin
      ? {} // Admins see all data sources
      : {
        OR: [
          { createdById: user.id },
          { groups: { some: { groupId: { in: groupIds } } } },
          { createdById: null }, // Legacy data sources with no owner
        ],
      };

    const dataSources = await prisma.dataSource.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groups: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add isOwner flag and flatten groups for frontend
    return dataSources.map(ds => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
      createdById: ds.createdById,
      groups: ds.groups.map(g => g.group),
      isOwner: ds.createdById === user.id || (ds.createdById === null && user.isAdmin),
    }));
  });

  // Get a single data source (without sensitive data)
  app.get('/:id', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groups: {
          select: {
            groupId: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!dataSource) {
      return reply.status(404).send({ error: 'Data source not found' });
    }

    // Check access permission
    const hasAccess = await canAccessDataSource(user, dataSource);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      createdAt: dataSource.createdAt,
      updatedAt: dataSource.updatedAt,
      createdById: dataSource.createdById,
      groups: dataSource.groups.map(g => g.group),
      isOwner: dataSource.createdById === user.id || (dataSource.createdById === null && user.isAdmin),
    };
  });

  // Create a new data source
  app.post('/', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { name, type, data, groupIds } = request.body as CredentialCreateInput & { groupIds?: string[] };

    // Verify user is a member of all specified groups
    if (groupIds && groupIds.length > 0) {
      const userGroupIds = await getUserGroupIds(user.id);
      const invalidGroups = groupIds.filter(gid => !userGroupIds.includes(gid));
      if (invalidGroups.length > 0) {
        return reply.status(403).send({ error: 'You are not a member of one or more selected groups' });
      }
    }

    // Create data source with group associations
    const dataSource = await prisma.dataSource.create({
      data: {
        name,
        type,
        data: data as object,
        createdById: user.id,
        groups: groupIds && groupIds.length > 0 ? {
          create: groupIds.map(groupId => ({ groupId }))
        } : undefined,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groups: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return reply.status(201).send({
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      createdAt: dataSource.createdAt,
      updatedAt: dataSource.updatedAt,
      createdById: dataSource.createdById,
      groups: dataSource.groups.map(g => g.group),
      isOwner: true,
    });
  });

  // Update a data source (including group sharing)
  app.put('/:id', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };
    const { name, data, groupIds } = request.body as CredentialUpdateInput & { groupIds?: string[] };

    // Get existing data source
    const existing = await prisma.dataSource.findUnique({
      where: { id },
      select: {
        createdById: true,
        groups: { select: { groupId: true } },
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Data source not found' });
    }

    // Check access permission
    const hasAccess = await canAccessDataSource(user, existing);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Only owner (or admin for legacy data sources) can change group sharing
    const isOwner = existing.createdById === user.id || (existing.createdById === null && user.isAdmin);
    if (groupIds !== undefined && !isOwner) {
      return reply.status(403).send({ error: 'Only the data source owner can change group sharing' });
    }

    // If changing groups, verify user is a member of all new groups
    if (groupIds !== undefined && groupIds.length > 0) {
      const userGroupIds = await getUserGroupIds(user.id);
      const invalidGroups = groupIds.filter(gid => !userGroupIds.includes(gid));
      if (invalidGroups.length > 0) {
        return reply.status(403).send({ error: 'You are not a member of one or more selected groups' });
      }
    }

    // Update data source and group associations
    const dataSource = await prisma.dataSource.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(data !== undefined && { data: data as object }),
        ...(groupIds !== undefined && {
          groups: {
            deleteMany: {},
            create: groupIds.map(groupId => ({ groupId })),
          },
        }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groups: {
          select: {
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      createdAt: dataSource.createdAt,
      updatedAt: dataSource.updatedAt,
      createdById: dataSource.createdById,
      groups: dataSource.groups.map(g => g.group),
      isOwner: dataSource.createdById === user.id || (dataSource.createdById === null && user.isAdmin),
    };
  });

  // Delete a data source (only owner can delete)
  app.delete('/:id', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    // Get existing data source
    const existing = await prisma.dataSource.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Data source not found' });
    }

    // Only owner (or admin for legacy data sources) can delete
    const isOwner = existing.createdById === user.id || (existing.createdById === null && user.isAdmin);
    if (!isOwner) {
      return reply.status(403).send({ error: 'Only the data source owner can delete it' });
    }

    await prisma.dataSource.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  // Test a saved data source
  app.post('/:id/test', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      include: {
        groups: { select: { groupId: true } },
      },
    });

    if (!dataSource) {
      return reply.status(404).send({ error: 'Data source not found' });
    }

    // Check access permission
    const hasAccess = await canAccessDataSource(user, dataSource);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const result = await testCredential(
      dataSource.type,
      dataSource.data as Record<string, unknown>
    );

    return result;
  });

  // Test data source without saving (for the create form)
  app.post('/test', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { type, data } = request.body as { type: string; data: Record<string, unknown> };

    if (!type) {
      return { success: false, message: 'Data source type is required' };
    }

    const result = await testCredential(type, data || {});
    return result;
  });
};
