
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { prisma } from '../src/lib/prisma';
import { workflowRoutes } from '../src/routes/workflows';
import { optionalAuthMiddleware } from '../src/lib/auth';

describe('Workflow Locking Integration', () => {
    const app = Fastify();

    // Setup Auth Middleware
    // We need to decorate the request with 'user' because optionalAuthMiddleware assigns to it
    app.decorateRequest('user', null);

    app.addHook('preHandler', async (req, reply) => {
        await optionalAuthMiddleware(req, reply);
    });

    app.register(workflowRoutes, { prefix: '/api/workflows' });

    let userAId: string;
    let userBId: string;
    let tokenA: string;
    let tokenB: string;
    let workflowId: string;

    beforeAll(async () => {
        // Create users
        const userA = await prisma.user.create({
            data: { email: `lock_user_a_${Date.now()}@example.com`, name: 'User A' }
        });
        userAId = userA.id;

        const sessionA = await prisma.session.create({
            data: { userId: userA.id, token: `token_a_${Date.now()}`, expiresAt: new Date(Date.now() + 86400000) }
        });
        tokenA = sessionA.token;

        const userB = await prisma.user.create({
            data: { email: `lock_user_b_${Date.now()}@example.com`, name: 'User B' }
        });
        userBId = userB.id;

        const sessionB = await prisma.session.create({
            data: { userId: userB.id, token: `token_b_${Date.now()}`, expiresAt: new Date(Date.now() + 86400000) }
        });
        tokenB = sessionB.token;

        // Create workflow (owned by A)
        const wf = await prisma.workflow.create({
            data: {
                name: 'Locking Test Workflow',
                createdById: userA.id
            }
        });
        workflowId = wf.id;
    });

    afterAll(async () => {
        await prisma.workflow.deleteMany({ where: { id: workflowId } }); // Cascade deletes lock
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
        await app.close();
    });

    it('should acquire lock for User A when opening unlocked workflow', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/workflows/${workflowId}`,
            headers: {
                cookie: `twiddle_session=${tokenA}`
            }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.lockedBy).toBeDefined();
        expect(body.lockedBy.id).toBe(userAId);
        expect(body.lockedBy.isMe).toBe(true);

        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock).toBeDefined();
        expect(lock?.userId).toBe(userAId);
    });

    it('should show lock held by User A when User B opens it', async () => {
        const response = await app.inject({
            method: 'GET',
            url: `/api/workflows/${workflowId}`,
            headers: {
                cookie: `twiddle_session=${tokenB}`
            }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.lockedBy).toBeDefined();
        expect(body.lockedBy.id).toBe(userAId); // Still locked by A
        expect(body.lockedBy.isMe).toBe(false);
        expect(body.lockedBy.name).toBe('User A');
    });

    it('should prevent User B from acquiring lock explicitly', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/api/workflows/${workflowId}/lock`,
            headers: {
                cookie: `twiddle_session=${tokenB}`
            }
        });
        expect(response.statusCode).toBe(409);
    });

    it('should refresh lock for User A', async () => {
        // Sleep 100ms to ensure updatedAt changes
        await new Promise(r => setTimeout(r, 100));

        const beforeLock = await prisma.workflowLock.findUnique({ where: { workflowId } });

        const response = await app.inject({
            method: 'POST',
            url: `/api/workflows/${workflowId}/lock`,
            headers: {
                cookie: `twiddle_session=${tokenA}`
            }
        });
        expect(response.statusCode).toBe(200);

        const afterLock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(afterLock!.updatedAt.getTime()).toBeGreaterThan(beforeLock!.updatedAt.getTime());
    });

    it('should allow User B to take over STALE lock', async () => {
        // Manually age the lock
        await prisma.workflowLock.update({
            where: { workflowId },
            data: { updatedAt: new Date(Date.now() - 5 * 60 * 1000) } // 5 mins ago
        });

        // User B tries to lock
        const response = await app.inject({
            method: 'POST',
            url: `/api/workflows/${workflowId}/lock`,
            headers: {
                cookie: `twiddle_session=${tokenB}`
            }
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.status).toBe('taken_over');

        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock?.userId).toBe(userBId);
    });

    it('should allow User B to unlock', async () => {
        const response = await app.inject({
            method: 'POST',
            url: `/api/workflows/${workflowId}/unlock`,
            headers: {
                cookie: `twiddle_session=${tokenB}`
            }
        });
        expect(response.statusCode).toBe(200);

        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock).toBeNull();
    });
});
