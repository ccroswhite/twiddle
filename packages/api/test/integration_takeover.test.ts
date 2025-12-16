
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { workflowRoutes } from '../src/routes/workflows';
import { optionalAuthMiddleware } from '../src/lib/auth';

describe('Workflow Locking Takeover Integration', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let userA: any;
    let userB: any;
    let workflowId: string;
    let cookieA: string;
    let cookieB: string;

    beforeAll(async () => {
        app = Fastify();
        prisma = new PrismaClient();

        // Setup Auth Middleware
        app.decorateRequest('user', null);
        app.addHook('preHandler', async (req, reply) => {
            await optionalAuthMiddleware(req, reply);
        });

        // Register routes
        app.register(workflowRoutes, { prefix: '/workflows' });

        // Create Users
        userA = await prisma.user.create({
            data: { email: `userA_takeover_${Date.now()}@example.com`, name: 'User A', password: 'password123' }
        });
        userB = await prisma.user.create({
            data: { email: `userB_takeover_${Date.now()}@example.com`, name: 'User B', password: 'password123' }
        });

        // Login User A & B - Simulate session
        // Since we don't have the login route mounted here (it's in authRoutes), we can manually create sessions
        const sessionA = await prisma.session.create({
            data: { userId: userA.id, token: `token_a_${Date.now()}`, expiresAt: new Date(Date.now() + 86400000) }
        });
        cookieA = `twiddle_session=${sessionA.token}`;

        const sessionB = await prisma.session.create({
            data: { userId: userB.id, token: `token_b_${Date.now()}`, expiresAt: new Date(Date.now() + 86400000) }
        });
        cookieB = `twiddle_session=${sessionB.token}`;

        // Create Workflow
        const wf = await prisma.workflow.create({
            data: { name: 'Takeover Test Workflow', createdById: userA.id }
        });
        workflowId = wf.id;
    });

    afterAll(async () => {
        if (workflowId) await prisma.workflow.deleteMany({ where: { id: workflowId } });
        if (userA && userB) await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
        await prisma.$disconnect();
        await app.close();
    });

    it('should allow User B to request lock from User A', async () => {
        // 1. User A acquires lock
        await app.inject({
            method: 'GET',
            url: `/workflows/${workflowId}`,
            headers: { cookie: cookieA }
        });

        // 2. User B tries to acquire (should fail/get read-only view)
        const resB = await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock`,
            headers: { cookie: cookieB }
        });
        expect(resB.statusCode).toBe(409);

        // 3. User B requests lock
        const req = await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock/request`,
            headers: { cookie: cookieB }
        });
        expect(req.json()).toEqual({ success: true, status: 'requested' });

        // 4. Verify DB state
        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock?.requestingUserId).toBe(userB.id);
    });

    it('should show User A the request in heartbeat', async () => {
        const hb = await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock`,
            headers: { cookie: cookieA }
        });
        const body = hb.json();
        expect(body.request).toBeDefined();
        expect(body.request.userId).toBe(userB.id);
    });

    it('should allow User A to ACCEPT the request', async () => {
        const resolve = await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock/resolve`,
            headers: { cookie: cookieA },
            payload: { action: 'ACCEPT' }
        });
        expect(resolve.json()).toEqual({ success: true, status: 'swapped' });

        // Verify User B has lock
        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock?.userId).toBe(userB.id);
        expect(lock?.requestingUserId).toBeNull();
    });

    it('should handle DENY flow', async () => {
        // 1. User B (now owner) has lock. User A requests it.
        await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock/request`,
            headers: { cookie: cookieA }
        });

        // 2. User B denies
        const deny = await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock/resolve`,
            headers: { cookie: cookieB },
            payload: { action: 'DENY' }
        });
        expect(deny.json()).toEqual({ success: true, status: 'denied' });

        // 3. Verify request cleared but lock remains with B
        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock?.userId).toBe(userB.id);
        expect(lock?.requestingUserId).toBeNull();
    });

    it('should perform forced swap on timeout', async () => {
        // 1. User A requests lock from User B
        await app.inject({
            method: 'POST',
            url: `/workflows/${workflowId}/lock/request`,
            headers: { cookie: cookieA }
        });

        // 2. Manually set requestingAt to > 1 minute ago
        await prisma.workflowLock.update({
            where: { workflowId },
            data: { requestingAt: new Date(Date.now() - 61 * 1000) }
        });

        // 3. Trigger check (via GET logic)
        const load = await app.inject({
            method: 'GET',
            url: `/workflows/${workflowId}`,
            headers: { cookie: cookieA }
        });
        expect(load.statusCode).toBe(200);
        const wf = load.json();

        // Should now be locked by A
        expect(wf.lockedBy.id).toBe(userA.id);
        expect(wf.lockedBy.isMe).toBe(true);

        // Verify DB
        const lock = await prisma.workflowLock.findUnique({ where: { workflowId } });
        expect(lock?.userId).toBe(userA.id);
    });
});
