
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { workflowRoutes } from '../src/routes/workflows';
import { optionalAuthMiddleware } from '../src/lib/auth';

describe('Workflow Versioning Integration', () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let user: any;
    let workflowId: string;
    let cookie: string;

    beforeAll(async () => {
        app = Fastify();
        prisma = new PrismaClient();

        app.decorateRequest('user', null);
        app.addHook('preHandler', async (req, reply) => {
            await optionalAuthMiddleware(req, reply);
        });

        app.register(workflowRoutes, { prefix: '/workflows' });

        // Create User
        user = await prisma.user.create({
            data: { email: `user_ver_${Date.now()}@example.com`, name: 'Version User', password: 'password123' }
        });

        // Create Session
        const session = await prisma.session.create({
            data: { userId: user.id, token: `token_ver_${Date.now()}`, expiresAt: new Date(Date.now() + 86400000) }
        });
        cookie = `twiddle_session=${session.token}`;

        // Create Workflow
        const wf = await prisma.workflow.create({
            data: { name: 'Versioning Test', createdById: user.id, version: 1 }
        });
        workflowId = wf.id;
    });

    afterAll(async () => {
        if (workflowId) await prisma.workflow.deleteMany({ where: { id: workflowId } });
        if (user) await prisma.user.delete({ where: { id: user.id } });
        await prisma.$disconnect();
        await app.close();
    });

    it('should create version snapshot on save', async () => {
        // Update workflow (v1 -> v2)
        const res = await app.inject({
            method: 'PUT',
            url: `/workflows/${workflowId}`,
            headers: { cookie },
            payload: {
                name: 'Versioning Test Updated',
                nodes: [{ id: '1', type: 'start' }],
                connections: []
            }
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.version).toBe(2);

        // Check if DB has version record
        const versions = await prisma.workflowVersion.findMany({ where: { workflowId } });
        expect(versions).toHaveLength(1);
        expect(versions[0].version).toBe(2);
        expect(versions[0].nodes).toEqual([{ id: '1', type: 'start' }]);
    });

    it('should list versions', async () => {
        // Save again (v2 -> v3)
        await app.inject({
            method: 'PUT',
            url: `/workflows/${workflowId}`,
            headers: { cookie },
            payload: {
                description: 'Another update',
                nodes: [{ id: '1', type: 'start' }, { id: '2', type: 'end' }]
            }
        });

        // Get list
        const res = await app.inject({
            method: 'GET',
            url: `/workflows/${workflowId}/versions`,
            headers: { cookie }
        });
        expect(res.statusCode).toBe(200);
        const list = res.json();

        // Should have v3 and v2
        expect(list).toHaveLength(2);
        expect(list[0].version).toBe(3);
        expect(list[1].version).toBe(2);
    });

    it('should retrieve specific version', async () => {
        // Get versions list
        const resList = await app.inject({
            method: 'GET',
            url: `/workflows/${workflowId}/versions`,
            headers: { cookie }
        });
        const list = resList.json();
        const v2Id = list.find((v: any) => v.version === 2).id;

        // Get V2 details
        const resV2 = await app.inject({
            method: 'GET',
            url: `/workflows/${workflowId}/versions/${v2Id}`,
            headers: { cookie }
        });
        expect(resV2.statusCode).toBe(200);
        const v2 = resV2.json();

        expect(v2.version).toBe(2);
        expect(v2.nodes).toEqual([{ id: '1', type: 'start' }]); // V2 had 1 node
    });
});
