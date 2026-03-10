import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { CredentialCreateInput, CredentialUpdateInput } from '@twiddle/shared';
import { testDataSource } from '../lib/datasources/registry.js';

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
  dataSource: { createdById: string | null; permissions?: { groupId: string | null; userId: string | null; permission: string }[] }
): Promise<boolean> {
  // Admins can access all data sources
  if (user.isAdmin) return true;

  // Owner can always access
  if (dataSource.createdById === user.id) return true;

  // Legacy data sources (no owner) are accessible to all authenticated users
  if (dataSource.createdById === null) return true;

  // If shared with permissions, check membership
  if (dataSource.permissions && dataSource.permissions.length > 0) {
    // Direct user assignment
    if (dataSource.permissions.some(p => p.userId === user.id)) return true;

    // Group assignment
    const groupIds = dataSource.permissions.filter(p => p.groupId).map(p => p.groupId as string);
    if (groupIds.length > 0) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          userId: user.id,
          groupId: { in: groupIds }
        },
      });
      return !!membership;
    }
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
          { permissions: { some: { groupId: { in: groupIds } } } },
          { permissions: { some: { userId: user.id } } },
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
        permissions: {
          select: {
            permission: true,
            user: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
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
      permissions: ds.permissions,
      groups: ds.permissions.filter((p: any) => p.group).map((p: any) => p.group),
      users: ds.permissions.filter((p: any) => p.user).map((p: any) => p.user),
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
        permissions: {
          select: {
            groupId: true,
            userId: true,
            permission: true,
            user: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
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
      permissions: dataSource.permissions,
      groups: dataSource.permissions.filter((p: any) => p.group).map((p: any) => p.group),
      users: dataSource.permissions.filter((p: any) => p.user).map((p: any) => p.user),
      isOwner: dataSource.createdById === user.id || (dataSource.createdById === null && user.isAdmin),
    };
  });

  // Get a single data source with sensitive data for editing (owners only)
  app.get('/:id/edit', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            permission: true,
            user: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!dataSource) {
      return reply.status(404).send({ error: 'Data source not found' });
    }

    // Only owners can get full data for editing
    const isOwner = dataSource.createdById === user.id || (dataSource.createdById === null && user.isAdmin);
    if (!isOwner) {
      return reply.status(403).send({ error: 'Only the owner can edit this data source' });
    }

    // Filter out password-type fields from data
    const rawData = dataSource.data as Record<string, unknown>;
    const passwordFields = ['password', 'clientSecret', 'apiKey', 'token', 'accessToken', 'refreshToken', 'passphrase', 'privateKey', 'tlsKey'];
    const filteredData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (!passwordFields.includes(key)) {
        filteredData[key] = value;
      }
    }

    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      data: filteredData,
      createdAt: dataSource.createdAt,
      updatedAt: dataSource.updatedAt,
      createdById: dataSource.createdById,
      permissions: dataSource.permissions,
      groups: dataSource.permissions.filter((p: any) => p.group).map((p: any) => p.group),
      users: dataSource.permissions.filter((p: any) => p.user).map((p: any) => p.user),
      isOwner: true,
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

    // Create data source with permissions associations
    const dataSource = await prisma.dataSource.create({
      data: {
        name,
        type,
        data: data as object,
        createdById: user.id,
        permissions: groupIds && groupIds.length > 0 ? {
          create: groupIds.map(groupId => ({ groupId, permission: 'READ' }))
        } : undefined,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        permissions: {
          select: {
            permission: true,
            user: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
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
      permissions: dataSource.permissions,
      groups: dataSource.permissions.filter((p: any) => p.group).map((p: any) => p.group),
      users: dataSource.permissions.filter((p: any) => p.user).map((p: any) => p.user),
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
        data: true,
        permissions: { select: { groupId: true, userId: true, permission: true } },
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

    // Update data source and permissions
    const dataSource = await prisma.dataSource.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(data !== undefined && { data: { ...(existing.data as object), ...(data as object) } }),
        ...(groupIds !== undefined && {
          permissions: {
            deleteMany: {},
            create: groupIds.map(groupId => ({ groupId, permission: 'READ' })),
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
        permissions: {
          select: {
            permission: true,
            user: { select: { id: true, name: true } },
            group: { select: { id: true, name: true } },
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
      permissions: dataSource.permissions,
      groups: dataSource.permissions.filter((p: any) => p.group).map((p: any) => p.group),
      users: dataSource.permissions.filter((p: any) => p.user).map((p: any) => p.user),
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
        permissions: { select: { groupId: true, userId: true, permission: true } },
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

    const result = await testDataSource(
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

    const result = await testDataSource(type, data || {});
    return result;
  });
};
