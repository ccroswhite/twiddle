/**
 * Workflow locking routes
 * Handles lock acquisition, refresh, request, resolve, and release
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';

// Lock timeout in milliseconds (2 minutes)
const LOCK_TIMEOUT = 2 * 60 * 1000;

export const lockRoutes: FastifyPluginAsync = async (app) => {
    // Acquire or refresh lock
    app.post<{ Params: { id: string } }>('/:id/lock', async (request, reply) => {
        const { id } = request.params;
        const user = (request as { user?: { id: string } }).user;

        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }

        const lock = await prisma.workflowLock.findUnique({ where: { workflowId: id } });
        if (!lock) {
            // Try to acquire
            try {
                await prisma.workflowLock.create({
                    data: { workflowId: id, userId: user.id }
                });
                return { success: true, status: 'acquired' };
            } catch (e) {
                return reply.status(409).send({ error: 'Workflow is locked by another user' });
            }
        }

        if (lock.userId !== user.id) {
            // Check if stale
            const now = new Date();
            if (now.getTime() - new Date(lock.updatedAt).getTime() > LOCK_TIMEOUT) {
                // Takeover
                await prisma.workflowLock.delete({ where: { id: lock.id } });
                await prisma.workflowLock.create({
                    data: { workflowId: id, userId: user.id }
                });
                return { success: true, status: 'taken_over' };
            }
            return reply.status(409).send({ error: 'Workflow is locked by another user' });
        }

        // Refresh
        const updatedLock = await prisma.workflowLock.update({
            where: { id: lock.id },
            data: { updatedAt: new Date() },
            include: { requestingUser: true }
        });

        // Check for active request
        let requestInfo = null;
        if (updatedLock.requestingUserId) {
            requestInfo = {
                userId: updatedLock.requestingUserId,
                name: updatedLock.requestingUser?.name || updatedLock.requestingUser?.email,
                email: updatedLock.requestingUser?.email,
                requestedAt: updatedLock.requestingAt
            };
        }

        return { success: true, status: 'refreshed', request: requestInfo };
    });

    // Request Lock Takeover
    app.post<{ Params: { id: string } }>('/:id/lock/request', async (request, reply) => {
        const { id } = request.params;
        const user = (request as { user?: { id: string } }).user;
        if (!user) return reply.status(401).send({ error: 'Unauthorized' });

        const lock = await prisma.workflowLock.findUnique({ where: { workflowId: id } });
        if (!lock) return { success: true, status: 'acquired' }; // Logic elsewhere will acquire it on next load

        if (lock.userId === user.id) return { success: true, status: 'already_locked' };

        await prisma.workflowLock.update({
            where: { id: lock.id },
            data: { requestingUserId: user.id, requestingAt: new Date() }
        });
        return { success: true, status: 'requested' };
    });

    // Resolve Lock Request (Accept/Deny)
    app.post<{ Params: { id: string }, Body: { action: 'ACCEPT' | 'DENY' } }>('/:id/lock/resolve', async (request, reply) => {
        const { id } = request.params;
        const { action } = request.body;
        const user = (request as { user?: { id: string } }).user;
        if (!user) return reply.status(401).send({ error: 'Unauthorized' });

        const lock = await prisma.workflowLock.findUnique({ where: { workflowId: id } });
        if (!lock || lock.userId !== user.id) return reply.status(400).send({ error: 'Invalid lock state' });

        if (action === 'ACCEPT' && lock.requestingUserId) {
            await prisma.workflowLock.update({
                where: { id: lock.id },
                data: {
                    userId: lock.requestingUserId,
                    requestingUserId: null,
                    requestingAt: null,
                    updatedAt: new Date()
                }
            });
            return { success: true, status: 'swapped' };
        } else {
            // Deny or no request
            await prisma.workflowLock.update({
                where: { id: lock.id },
                data: { requestingUserId: null, requestingAt: null }
            });
            return { success: true, status: 'denied' };
        }
    });

    // Unlock - release lock
    app.post<{ Params: { id: string } }>('/:id/unlock', async (request, reply) => {
        const { id } = request.params;
        const user = (request as { user?: { id: string } }).user;

        if (!user) return reply.status(401).send({ error: 'Unauthorized' });

        // Only delete if owned by user
        const lock = await prisma.workflowLock.findUnique({ where: { workflowId: id } });
        if (lock && lock.userId === user.id) {
            await prisma.workflowLock.delete({ where: { id: lock.id } });
        }
        return { success: true };
    });
};
