import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { prisma, disconnectDatabase } from '../src/lib/prisma';
import { folderRoutes } from '../src/routes/folders';
import { workflowRoutes } from '../src/routes/workflows';
import { executionRoutes } from '../src/routes/executions';
import { optionalAuthMiddleware } from '../src/lib/auth';

describe('Folder Explicit RBAC Integration', () => {
    let app: FastifyInstance;
    let userOwner: any;
    let userViewer: any;
    let userOperator: any;
    let userEditor: any;
    let userAdmin: any;
    let userNone: any;

    let groupViewer: any;
    let groupOperator: any;
    let groupEditor: any;
    let groupAdmin: any;

    let folderId: string;
    let workflowId: string;

    let cookieOwner: string;
    let cookieViewer: string;
    let cookieOperator: string;
    let cookieEditor: string;
    let cookieAdmin: string;
    let cookieNone: string;

    beforeAll(async () => {
        app = Fastify();
        app.decorateRequest('user', null);
        app.addHook('preHandler', async (req, reply) => {
            await optionalAuthMiddleware(req, reply);
        });

        // Register API routes
        app.register(folderRoutes, { prefix: '/folders' });
        app.register(workflowRoutes, { prefix: '/workflows' });
        app.register(executionRoutes, { prefix: '/executions' });

        const ts = Date.now();
        userOwner = await prisma.user.create({ data: { email: `f_owner_${ts}@test.com`, name: 'Owner', password: 'pass' } });
        userViewer = await prisma.user.create({ data: { email: `f_viewer_${ts}@test.com`, name: 'Viewer', password: 'pass' } });
        userOperator = await prisma.user.create({ data: { email: `f_operator_${ts}@test.com`, name: 'Operator', password: 'pass' } });
        userEditor = await prisma.user.create({ data: { email: `f_editor_${ts}@test.com`, name: 'Editor', password: 'pass' } });
        userAdmin = await prisma.user.create({ data: { email: `f_admin_${ts}@test.com`, name: 'Admin', password: 'pass' } });
        userNone = await prisma.user.create({ data: { email: `f_none_${ts}@test.com`, name: 'None', password: 'pass' } });

        const createSession = async (userId: string) => {
            const s = await prisma.session.create({ data: { userId, token: `token_${userId}_${ts}`, expiresAt: new Date(ts + 86400000) } });
            return `twiddle_session=${s.token}`;
        };

        cookieOwner = await createSession(userOwner.id);
        cookieViewer = await createSession(userViewer.id);
        cookieOperator = await createSession(userOperator.id);
        cookieEditor = await createSession(userEditor.id);
        cookieAdmin = await createSession(userAdmin.id);
        cookieNone = await createSession(userNone.id);

        groupViewer = await prisma.group.create({ data: { name: `Folder Group Viewer ${ts}` } });
        groupOperator = await prisma.group.create({ data: { name: `Folder Group Operator ${ts}` } });
        groupEditor = await prisma.group.create({ data: { name: `Folder Group Editor ${ts}` } });
        groupAdmin = await prisma.group.create({ data: { name: `Folder Group Admin ${ts}` } });

        await prisma.groupMember.createMany({
            data: [
                { groupId: groupViewer.id, userId: userViewer.id, role: 'MEMBER' },
                { groupId: groupOperator.id, userId: userOperator.id, role: 'MEMBER' },
                { groupId: groupEditor.id, userId: userEditor.id, role: 'MEMBER' },
                { groupId: groupAdmin.id, userId: userAdmin.id, role: 'MEMBER' },
                // Owner must be in the groups to grant access
                { groupId: groupViewer.id, userId: userOwner.id, role: 'MEMBER' },
                { groupId: groupOperator.id, userId: userOwner.id, role: 'MEMBER' },
                { groupId: groupEditor.id, userId: userOwner.id, role: 'MEMBER' },
                { groupId: groupAdmin.id, userId: userOwner.id, role: 'MEMBER' },
            ]
        });
    });

    afterAll(async () => {
        if (workflowId) await prisma.workflow.deleteMany({ where: { id: workflowId } });
        if (folderId) await prisma.folder.deleteMany({ where: { id: folderId } });

        const userIds = [userOwner.id, userViewer.id, userOperator.id, userEditor.id, userAdmin.id, userNone.id];
        const groupIds = [groupViewer.id, groupOperator.id, groupEditor.id, groupAdmin.id];

        await prisma.groupMember.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await disconnectDatabase();
        await app.close();
    });

    it('should create Folder with nested Workflow and configure permissions', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/folders`,
            headers: { cookie: cookieOwner },
            payload: { name: 'Production Workflows' }
        });

        expect(res.statusCode).toBe(200);
        const folder = res.json();
        folderId = folder.id;

        // Apply permissions individually
        for (const p of [
            { groupId: groupViewer.id, permission: 'READ' },
            { groupId: groupOperator.id, permission: 'OPERATOR' },
            { groupId: groupEditor.id, permission: 'WRITE' },
            { groupId: groupAdmin.id, permission: 'ADMIN' }
        ]) {
            const permRes = await app.inject({
                method: 'POST',
                url: `/folders/${folderId}/permissions`,
                headers: { cookie: cookieOwner },
                payload: p
            });
            expect(permRes.statusCode).toBe(201);
        }

        const folderWithPermissions = await app.inject({ method: 'GET', url: `/folders/${folderId}`, headers: { cookie: cookieOwner } });
        expect(folderWithPermissions.statusCode).toBe(200);
        expect(folderWithPermissions.json().permissions).toHaveLength(4);

        const wfRes = await app.inject({
            method: 'POST',
            url: '/workflows',
            headers: { cookie: cookieOwner },
            payload: { name: 'Billing Pipeline', folderId }
        });
        expect(wfRes.statusCode).toBe(201);
        workflowId = wfRes.json().id;
    });

    it('enforces completely private isolation for unassigned users', async () => {
        const list = await app.inject({ method: 'GET', url: `/folders`, headers: { cookie: cookieNone } });
        expect(list.json().find((f: any) => f.id === folderId)).toBeUndefined();
    });

    it('enforces VIEWER limits (read-only)', async () => {
        const wfReq = await app.inject({ method: 'GET', url: `/workflows/${workflowId}`, headers: { cookie: cookieViewer } });
        expect(wfReq.statusCode).toBe(200);

        const modReq = await app.inject({ method: 'PUT', url: `/workflows/${workflowId}`, headers: { cookie: cookieViewer }, payload: { name: 'Hacked' } });
        expect(modReq.statusCode).toBe(403);

        const execReq = await app.inject({ method: 'GET', url: `/workflows/${workflowId}/export/python?format=json`, headers: { cookie: cookieViewer } });
        expect(execReq.statusCode).toBe(403);
    });

    it('allows OPERATOR to view and execute, but not edit', async () => {
        const wfReq = await app.inject({ method: 'GET', url: `/workflows/${workflowId}`, headers: { cookie: cookieOperator } });
        expect(wfReq.statusCode).toBe(200);

        const modReq = await app.inject({ method: 'PUT', url: `/workflows/${workflowId}`, headers: { cookie: cookieOperator }, payload: { name: 'Hacked' } });
        expect(modReq.statusCode).toBe(403);

        // Can access the code generation/export endpoint
        const execReq = await app.inject({ method: 'GET', url: `/workflows/${workflowId}/export/python?format=json`, headers: { cookie: cookieOperator } });
        expect(execReq.statusCode).toBe(200);
    });

    it('allows EDITOR to modify, but not manage permissions', async () => {
        const modReq = await app.inject({ method: 'PUT', url: `/workflows/${workflowId}`, headers: { cookie: cookieEditor }, payload: { name: 'Pipeline V2' } });
        expect(modReq.statusCode).toBe(200);
        expect(modReq.json().name).toBe('Pipeline V2');

        const shareReq = await app.inject({ method: 'POST', url: `/folders/${folderId}/permissions`, headers: { cookie: cookieEditor }, payload: { groupId: groupAdmin.id, permission: 'ADMIN' } });
        expect(shareReq.statusCode).toBe(403);
    });

    it('allows ADMIN to manage folder permissions', async () => {
        const shareReq = await app.inject({
            method: 'POST',
            url: `/folders/${folderId}/permissions`,
            headers: { cookie: cookieAdmin },
            payload: { userId: userViewer.id, permission: 'WRITE' }
        });
        expect(shareReq.statusCode).toBe(201);
    });
});
