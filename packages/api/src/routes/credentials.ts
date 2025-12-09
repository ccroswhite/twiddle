import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import type { CredentialCreateInput, CredentialUpdateInput } from '@twiddle/shared';
import { testCredential } from '../lib/credentialTester.js';

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

// Check if user can access a credential (owner, admin, in shared group, or legacy credential)
async function canAccessCredential(
  user: { id: string; isAdmin: boolean },
  credential: { createdById: string | null; groupId: string | null }
): Promise<boolean> {
  // Admins can access all credentials
  if (user.isAdmin) return true;
  
  // Owner can always access
  if (credential.createdById === user.id) return true;
  
  // Legacy credentials (no owner) are accessible to all authenticated users
  if (credential.createdById === null) return true;
  
  // If shared with a group, check membership
  if (credential.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: credential.groupId } },
    });
    return !!membership;
  }
  
  return false;
}

export const credentialRoutes: FastifyPluginAsync = async (app) => {
  // List credentials the user can access (owned or shared via group)
  app.get('/', async (request, reply) => {
    const user = await getUserFromSession(request);
    
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    
    // Get user's group IDs
    const groupIds = await getUserGroupIds(user.id);
    
    // Build query conditions:
    // - User owns the credential
    // - Credential is shared with a group user belongs to
    // - Legacy credentials (no owner) - visible to admins only
    // - Admins can see all credentials
    const whereConditions = user.isAdmin
      ? {} // Admins see all credentials
      : {
          OR: [
            { createdById: user.id },
            { groupId: { in: groupIds } },
            { createdById: null }, // Legacy credentials with no owner
          ],
        };
    
    const credentials = await prisma.credential.findMany({
      where: whereConditions,
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    // Add isOwner flag for frontend
    // For legacy credentials (no owner), admins are treated as owners
    return credentials.map(c => ({
      ...c,
      isOwner: c.createdById === user.id || (c.createdById === null && user.isAdmin),
    }));
  });

  // Get a single credential (without sensitive data)
  app.get('/:id', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    const credential = await prisma.credential.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!credential) {
      return reply.status(404).send({ error: 'Credential not found' });
    }

    // Check access permission
    const hasAccess = await canAccessCredential(user, credential);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    return {
      ...credential,
      isOwner: credential.createdById === user.id || (credential.createdById === null && user.isAdmin),
    };
  });

  // Create a new credential
  app.post('/', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { name, type, data, groupId } = request.body as CredentialCreateInput & { groupId?: string };

    // If groupId is provided, verify user is a member of that group
    if (groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId } },
      });
      if (!membership) {
        return reply.status(403).send({ error: 'You are not a member of the selected group' });
      }
    }

    // In production, encrypt the data before storing
    const credential = await prisma.credential.create({
      data: {
        name,
        type,
        data: data as object,
        createdById: user.id,
        groupId: groupId || null,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reply.status(201).send({
      ...credential,
      isOwner: true,
    });
  });

  // Update a credential (including group sharing)
  app.put('/:id', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };
    const { name, data, groupId } = request.body as CredentialUpdateInput & { groupId?: string | null };

    // Get existing credential
    const existing = await prisma.credential.findUnique({
      where: { id },
      select: { createdById: true, groupId: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Credential not found' });
    }

    // Check access permission
    const hasAccess = await canAccessCredential(user, existing);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    // Only owner (or admin for legacy credentials) can change group sharing
    const isOwner = existing.createdById === user.id || (existing.createdById === null && user.isAdmin);
    if (groupId !== undefined && !isOwner) {
      return reply.status(403).send({ error: 'Only the credential owner can change group sharing' });
    }

    // If changing groupId, verify user is a member of that group
    if (groupId && groupId !== existing.groupId) {
      const membership = await prisma.groupMember.findUnique({
        where: { userId_groupId: { userId: user.id, groupId } },
      });
      if (!membership) {
        return reply.status(403).send({ error: 'You are not a member of the selected group' });
      }
    }

    const credential = await prisma.credential.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(data !== undefined && { data: data as object }),
        ...(groupId !== undefined && { groupId: groupId || null }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      ...credential,
      isOwner: credential.createdById === user.id || (credential.createdById === null && user.isAdmin),
    };
  });

  // Delete a credential (only owner can delete)
  app.delete('/:id', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    // Get existing credential
    const existing = await prisma.credential.findUnique({
      where: { id },
      select: { createdById: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Credential not found' });
    }

    // Only owner (or admin for legacy credentials) can delete
    const isOwner = existing.createdById === user.id || (existing.createdById === null && user.isAdmin);
    if (!isOwner) {
      return reply.status(403).send({ error: 'Only the credential owner can delete it' });
    }

    await prisma.credential.delete({
      where: { id },
    });

    return reply.status(204).send();
  });

  // Test a saved credential
  app.post('/:id/test', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { id } = request.params as { id: string };

    const credential = await prisma.credential.findUnique({
      where: { id },
    });

    if (!credential) {
      return reply.status(404).send({ error: 'Credential not found' });
    }

    // Check access permission
    const hasAccess = await canAccessCredential(user, credential);
    if (!hasAccess) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    const result = await testCredential(
      credential.type, 
      credential.data as Record<string, unknown>
    );
    
    return result;
  });

  // Test credentials without saving (for the create form)
  app.post('/test', async (request, reply) => {
    const user = await getUserFromSession(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const { type, data } = request.body as { type: string; data: Record<string, unknown> };
    
    if (!type) {
      return { success: false, message: 'Credential type is required' };
    }
    
    const result = await testCredential(type, data || {});
    return result;
  });
};
