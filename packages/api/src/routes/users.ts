/**
 * User management routes
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  // List all users (admin only in production)
  app.get('/', async (_request, _reply) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        avatarUrl: true,
        isAdmin: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            groupMemberships: true,
            workflows: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return users.map((u: typeof users[number]) => ({
      ...u,
      groupCount: u._count.groupMemberships,
      workflowCount: u._count.workflows,
    }));
  });

  // Get current user
  app.get('/me', async (request, reply) => {
    const userId = (request as { user?: { id: string } }).user?.id;
    
    if (!userId) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        groupMemberships: {
          include: {
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
    
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      groups: user.groupMemberships.map((m: typeof user.groupMemberships[number]) => ({
        id: m.group.id,
        name: m.group.name,
        role: m.role,
      })),
    };
  });

  // Get a single user
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        provider: true,
        avatarUrl: true,
        isAdmin: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        groupMemberships: {
          include: {
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
    
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    
    return {
      ...user,
      groups: user.groupMemberships.map((m: typeof user.groupMemberships[number]) => ({
        id: m.group.id,
        name: m.group.name,
        role: m.role,
      })),
    };
  });

  // Create a new user (admin only)
  app.post<{
    Body: {
      email: string;
      name?: string;
      isAdmin?: boolean;
      groupIds?: string[];
    };
  }>('/', async (request, reply) => {
    const { email, name, isAdmin, groupIds } = request.body;
    
    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }
    
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existing) {
      return reply.status(409).send({ error: 'User with this email already exists' });
    }
    
    // Get default groups
    const defaultGroups = await prisma.group.findMany({
      where: { isDefault: true },
      select: { id: true },
    });
    
    const allGroupIds = [
      ...defaultGroups.map((g: typeof defaultGroups[number]) => g.id),
      ...(groupIds || []),
    ];
    
    const user = await prisma.user.create({
      data: {
        email,
        name,
        isAdmin: isAdmin || false,
        groupMemberships: {
          create: allGroupIds.map((groupId: string) => ({
            groupId,
            role: 'member',
          })),
        },
      },
      include: {
        groupMemberships: {
          include: {
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
    
    return reply.status(201).send(user);
  });

  // Update a user
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      isAdmin?: boolean;
      isActive?: boolean;
    };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { name, isAdmin, isActive } = request.body;
    
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(isAdmin !== undefined && { isAdmin }),
          ...(isActive !== undefined && { isActive }),
        },
      });
      
      return user;
    } catch {
      return reply.status(404).send({ error: 'User not found' });
    }
  });

  // Delete a user
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { id } = request.params;
    
    try {
      await prisma.user.delete({
        where: { id },
      });
      
      return { success: true };
    } catch {
      return reply.status(404).send({ error: 'User not found' });
    }
  });

  // Get user's groups
  app.get<{ Params: { id: string } }>('/:id/groups', async (request, reply) => {
    const { id } = request.params;
    
    const memberships = await prisma.groupMember.findMany({
      where: { userId: id },
      include: {
        group: true,
      },
    });
    
    if (memberships.length === 0) {
      // Check if user exists
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
    }
    
    return memberships.map((m: typeof memberships[number]) => ({
      ...m.group,
      role: m.role,
    }));
  });
};
