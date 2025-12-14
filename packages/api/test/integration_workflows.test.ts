
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { workflowRoutes } from '../src/routes/workflows';
import { prisma } from '../src/lib/prisma';

describe('Workflow CRUD Integration', () => {
    const app = Fastify();

    // Mock user for auth context
    const mockUser = {
        id: 'wf-test-user',
        email: 'wf-test@twiddle.com',
        name: 'Workflow Tester',
        isAdmin: false
    };

    app.addHook('preHandler', async (req) => {
        (req as any).user = mockUser;
    });

    app.register(workflowRoutes);

    beforeAll(async () => {
        // Create mock user
        await prisma.user.upsert({
            where: { id: mockUser.id },
            update: {},
            create: {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                password: 'hashed',
                provider: 'local',
                isActive: true
            }
        });
    });

    afterAll(async () => {
        // Cleanup
        await prisma.workflow.deleteMany({ where: { createdById: mockUser.id } });
        await prisma.user.delete({ where: { id: mockUser.id } });
        await prisma.$disconnect();
    });

    let createdWorkflowId: string;

    it('should create a new workflow', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/',
            payload: {
                name: 'Integration Test Workflow',
                description: 'Created by tests',
                nodes: [],
                connections: []
            }
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.id).toBeDefined();
        expect(body.name).toBe('Integration Test Workflow');
        expect(body.environment).toBe('DV');

        createdWorkflowId = body.id;
    });

    it('should list workflows', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(Array.isArray(body)).toBe(true);
        const found = body.find((w: any) => w.id === createdWorkflowId);
        expect(found).toBeDefined();
    });

    it('should update the workflow', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: `/${createdWorkflowId}`,
            payload: {
                name: 'Updated Workflow Name',
                nodes: [{ id: '1', type: 'start' }], // Dummy node update
                connections: []
            }
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.name).toBe('Updated Workflow Name');

        // Verify DB persistence
        const inDb = await prisma.workflow.findUnique({ where: { id: createdWorkflowId } });
        expect(inDb?.name).toBe('Updated Workflow Name');
    });

    it('should delete the workflow', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/${createdWorkflowId}`
        });

        expect(response.statusCode).toBe(204); // Or 204? Route usually returns deleted object or 204.

        // Verify gone from DB
        const inDb = await prisma.workflow.findUnique({ where: { id: createdWorkflowId } });
        expect(inDb).toBeNull();
    });
});
