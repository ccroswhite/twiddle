
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { promotionRoutes } from '../src/routes/promotions';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

// Mock auth middleware for now, or use real user object?
// Since we are unit testing the route, we can inject a user into the request via `decorateRequest`?
// But `promotionRoutes` uses `authMiddleware` hook which verifies session/JWT.
// Easier: Just register a preHandler that sets `request.user`.

describe('Promotions Workflow Integration', () => {
    const app = Fastify();

    // Setup Mock User for Request Context
    const mockUser = {
        id: 'promo-tester-id',
        email: 'promo@twiddle.com',
        isAdmin: true, // We need admin for approval
        name: 'Promo Tester'
    };

    // Middleware to fake authentication
    app.addHook('preHandler', async (req) => {
        (req as any).user = mockUser;
    });

    app.register(promotionRoutes);

    let workflowId: string;

    beforeAll(async () => {
        // Create user in DB so relations work
        await prisma.user.upsert({
            where: { id: mockUser.id },
            update: {},
            create: {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                password: 'hashed',
                provider: 'local',
                isAdmin: true,
                isActive: true
            }
        });

        // Create a DV workflow
        const wf = await prisma.workflow.create({
            data: {
                name: 'Test Promotion Workflow',
                environment: 'DV',
                version: 1,
                nodes: [],
                connections: [],
                createdById: mockUser.id
            }
        });
        workflowId = wf.id;
    });

    afterAll(async () => {
        // Cleanup
        await prisma.promotionRequest.deleteMany({ where: { workflowId } });
        await prisma.workflow.delete({ where: { id: workflowId } });
        await prisma.user.delete({ where: { id: mockUser.id } });
        await prisma.$disconnect();
    });

    it('should allow requesting a promotion from DV to UT', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/request',
            payload: {
                workflowId,
                notes: 'Ready for UT'
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('PENDING');
        expect(body.fromEnv).toBe('DV');
        expect(body.toEnv).toBe('UT');
        expect(body.id).toBeDefined();

        // Verify in DB
        const inDb = await prisma.promotionRequest.findUnique({ where: { id: body.id } });
        expect(inDb).toBeTruthy();
    });

    it('should fail if creating duplicate pending request', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/request',
            payload: {
                workflowId,
                notes: 'Duplicate request'
            }
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toContain('pending promotion request already exists');
    });

    it('should allow admin to approve the request', async () => {
        // Find the pending request
        const request = await prisma.promotionRequest.findFirst({
            where: { workflowId, status: 'PENDING' }
        });

        expect(request).toBeDefined();

        const response = await app.inject({
            method: 'POST',
            url: `/${request!.id}/approve`,
            payload: {
                notes: 'LGTM'
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('APPROVED');
        expect(body.reviewerId).toBe(mockUser.id);

        // Verify workflow environment updated
        const wf = await prisma.workflow.findUnique({ where: { id: workflowId } });
        expect(wf?.environment).toBe('UT');
    });
});
