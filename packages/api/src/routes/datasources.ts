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

const PERMISSION_LEVELS = {
  READ: 1,
  WRITE: 2,
  ADMIN: 3
};

// Check if user can access a data source with the required permission level
async function canAccessDataSource(
  user: { id: string; isAdmin: boolean },
  dataSource: { createdById: string | null; permissions?: { groupId: string | null; userId: string | null; permission: string }[] },
  requiredLevel: 'READ' | 'WRITE' | 'ADMIN' = 'READ'
): Promise<boolean> {
  // Admins can access all data sources
  if (user.isAdmin) return true;

  // Owner can always access
  if (dataSource.createdById === user.id) return true;

  // Legacy data sources (no owner) are accessible to all for READ, but only admins for WRITE/ADMIN
  if (dataSource.createdById === null) {
    if (requiredLevel === 'READ') return true;
    return user.isAdmin;
  }

  // If shared with permissions, check membership
  if (dataSource.permissions && dataSource.permissions.length > 0) {
    const requiredWeight = PERMISSION_LEVELS[requiredLevel];

    // Direct user assignment
    const directPerms = dataSource.permissions.filter(p => p.userId === user.id);
    for (const p of directPerms) {
      const weight = PERMISSION_LEVELS[p.permission as keyof typeof PERMISSION_LEVELS] || 0;
      if (weight >= requiredWeight) return true;
    }

    // Group assignment
    const groupPerms = dataSource.permissions.filter(p => p.groupId);
    if (groupPerms.length > 0) {
      const userGroupIds = await getUserGroupIds(user.id);
      for (const p of groupPerms) {
        if (p.groupId && userGroupIds.includes(p.groupId)) {
          const weight = PERMISSION_LEVELS[p.permission as keyof typeof PERMISSION_LEVELS] || 0;
          if (weight >= requiredWeight) return true;
        }
      }
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


    const rawData = dataSource.data as Record<string, unknown>;
    const passwordFields = ['password', 'clientSecret', 'apiKey', 'token', 'accessToken', 'refreshToken', 'passphrase', 'privateKey', 'tlsKey'];
    const safeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawData)) {
      if (passwordFields.includes(key)) {
        safeData[key] = ''; // Explicitly return empty string for frontend fields
      } else {
        safeData[key] = value;
      }
    }

    return {
      id: dataSource.id,
      name: dataSource.name,
      type: dataSource.type,
      data: safeData,
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

    const { name, type, data, groupPermissions } = request.body as CredentialCreateInput & {
      groupPermissions?: { groupId: string; permission: 'READ' | 'WRITE' | 'ADMIN' }[]
    };

    // Verify user is a member of all specified groups
    if (groupPermissions && groupPermissions.length > 0) {
      const userGroupIds = await getUserGroupIds(user.id);
      const groupIds = groupPermissions.map(p => p.groupId);
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
        permissions: groupPermissions && groupPermissions.length > 0 ? {
          create: groupPermissions.map(p => ({ groupId: p.groupId, permission: p.permission }))
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
    const { name, data, groupPermissions } = request.body as CredentialUpdateInput & {
      groupPermissions?: { groupId: string; permission: 'READ' | 'WRITE' | 'ADMIN' }[]
    };

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

    // Check access permission for updating core details (requires WRITE)
    const hasWriteAccess = await canAccessDataSource(user, existing, 'WRITE');
    if (!hasWriteAccess) {
      return reply.status(403).send({ error: 'Write access denied' });
    }

    // Changing group permissions requires ADMIN access
    if (groupPermissions !== undefined) {
      const hasAdminAccess = await canAccessDataSource(user, existing, 'ADMIN');
      if (!hasAdminAccess) {
        return reply.status(403).send({ error: 'Only administrators can change group sharing' });
      }
    }

    // If changing groups, verify user is a member of all new groups
    if (groupPermissions !== undefined && groupPermissions.length > 0) {
      const userGroupIds = await getUserGroupIds(user.id);
      const groupIds = groupPermissions.map(p => p.groupId);
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
        ...(groupPermissions !== undefined && {
          permissions: {
            deleteMany: {}, // Delete all existing
            create: groupPermissions.map(p => ({ groupId: p.groupId, permission: p.permission })), // Re-create new mappings
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
      select: {
        createdById: true,
        permissions: { select: { groupId: true, userId: true, permission: true } }
      },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Data source not found' });
    }

    // Require ADMIN level access to delete
    const hasAdminAccess = await canAccessDataSource(user, existing, 'ADMIN');
    if (!hasAdminAccess) {
      return reply.status(403).send({ error: 'Only administrators can delete the data source' });
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

    // Check access permission (Requires WRITE to authorize a test request)
    const hasAccess = await canAccessDataSource(user, dataSource, 'WRITE');
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Write access required to test connection' });
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
