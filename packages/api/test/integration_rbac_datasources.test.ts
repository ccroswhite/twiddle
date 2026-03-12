import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { prisma, disconnectDatabase } from '../src/lib/prisma';
import { credentialRoutes } from '../src/routes/datasources';
import { optionalAuthMiddleware } from '../src/lib/auth';

describe('Data Source Explicit RBAC Integration', () => {
    let app: FastifyInstance;
    let userA: any; // User A is the owner/creator
    let userB_Read: any; // Member of group with READ access
    let userC_Write: any; // Member of group with WRITE access
    let userD_Admin: any; // Member of group with ADMIN access
    let userE_None: any; // Member of group with NO access

    let groupRead: any;
    let groupWrite: any;
    let groupAdmin: any;
    let groupNone: any;

    let dataSourceId: string;
    let cookieA: string;
    let cookieB_Read: string;
    let cookieC_Write: string;
    let cookieD_Admin: string;
    let cookieE_None: string;

    beforeAll(async () => {
        app = Fastify();
        app.decorateRequest('user', null);
        app.addHook('preHandler', async (req, reply) => {
            await optionalAuthMiddleware(req, reply);
        });
        app.register(credentialRoutes, { prefix: '/datasources' });

        // Create Users
        const timestamp = Date.now();
        userA = await prisma.user.create({ data: { email: `owner_${timestamp}@example.com`, name: 'Owner', password: 'pass' } });
        userB_Read = await prisma.user.create({ data: { email: `reader_${timestamp}@example.com`, name: 'Reader', password: 'pass' } });
        userC_Write = await prisma.user.create({ data: { email: `writer_${timestamp}@example.com`, name: 'Writer', password: 'pass' } });
        userD_Admin = await prisma.user.create({ data: { email: `admin_${timestamp}@example.com`, name: 'Admin', password: 'pass' } });
        userE_None = await prisma.user.create({ data: { email: `none_${timestamp}@example.com`, name: 'None', password: 'pass' } });

        // Sessions
        const sA = await prisma.session.create({ data: { userId: userA.id, token: `token_A_${timestamp}`, expiresAt: new Date(Date.now() + 86400000) } });
        const sB = await prisma.session.create({ data: { userId: userB_Read.id, token: `token_B_${timestamp}`, expiresAt: new Date(Date.now() + 86400000) } });
        const sC = await prisma.session.create({ data: { userId: userC_Write.id, token: `token_C_${timestamp}`, expiresAt: new Date(Date.now() + 86400000) } });
        const sD = await prisma.session.create({ data: { userId: userD_Admin.id, token: `token_D_${timestamp}`, expiresAt: new Date(Date.now() + 86400000) } });
        const sE = await prisma.session.create({ data: { userId: userE_None.id, token: `token_E_${timestamp}`, expiresAt: new Date(Date.now() + 86400000) } });

        cookieA = `twiddle_session=${sA.token}`;
        cookieB_Read = `twiddle_session=${sB.token}`;
        cookieC_Write = `twiddle_session=${sC.token}`;
        cookieD_Admin = `twiddle_session=${sD.token}`;
        cookieE_None = `twiddle_session=${sE.token}`;

        // Create Groups
        groupRead = await prisma.group.create({ data: { name: `Group Read ${timestamp}` } });
        groupWrite = await prisma.group.create({ data: { name: `Group Write ${timestamp}` } });
        groupAdmin = await prisma.group.create({ data: { name: `Group Admin ${timestamp}` } });
        groupNone = await prisma.group.create({ data: { name: `Group None ${timestamp}` } });

        // Add users to groups
        await prisma.groupMember.createMany({
            data: [
                { groupId: groupRead.id, userId: userB_Read.id, role: 'MEMBER' },
                { groupId: groupWrite.id, userId: userC_Write.id, role: 'MEMBER' },
                { groupId: groupAdmin.id, userId: userD_Admin.id, role: 'MEMBER' },
                { groupId: groupNone.id, userId: userE_None.id, role: 'MEMBER' },
                // Add owner to groups they intend to share with
                { groupId: groupRead.id, userId: userA.id, role: 'MEMBER' },
                { groupId: groupWrite.id, userId: userA.id, role: 'MEMBER' },
                { groupId: groupAdmin.id, userId: userA.id, role: 'MEMBER' },
                { groupId: groupNone.id, userId: userA.id, role: 'MEMBER' },
                // Add Admin to groups they intend to share with (required to validate payload)
                { groupId: groupRead.id, userId: userD_Admin.id, role: 'MEMBER' },
                { groupId: groupWrite.id, userId: userD_Admin.id, role: 'MEMBER' },
                { groupId: groupNone.id, userId: userD_Admin.id, role: 'MEMBER' }
            ]
        });
    });

    afterAll(async () => {
        if (dataSourceId) await prisma.dataSource.deleteMany({ where: { id: dataSourceId } });
        const userIds = [userA.id, userB_Read.id, userC_Write.id, userD_Admin.id, userE_None.id];
        const groupIds = [groupRead.id, groupWrite.id, groupAdmin.id, groupNone.id];

        await prisma.groupMember.deleteMany({ where: { userId: { in: userIds } } });
        await prisma.group.deleteMany({ where: { id: { in: groupIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await disconnectDatabase();
        await app.close();
    });

    it('should allow Owner to create a Data Source with explicit group permissions', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/datasources`,
            headers: { cookie: cookieA },
            payload: {
                name: 'Test DB Config',
                type: 'PostgreSQL',
                data: { host: 'localhost', port: 5432, password: 'secretpassword' },
                groupPermissions: [
                    { groupId: groupRead.id, permission: 'READ' },
                    { groupId: groupWrite.id, permission: 'WRITE' },
                    { groupId: groupAdmin.id, permission: 'ADMIN' }
                ]
            }
        });

        expect(res.statusCode).toBe(201);
        const body = res.json();
        dataSourceId = body.id;

        expect(body.permissions).toBeDefined();
        expect(body.permissions).toHaveLength(3);
        const perms = body.permissions?.map((p: any) => p.permission);
        expect(perms).toContain('READ');
        expect(perms).toContain('WRITE');
        expect(perms).toContain('ADMIN');
    });

    it('should allow user with NO permissions only if they are the owner (User E fails)', async () => {
        const resList = await app.inject({
            method: 'GET',
            url: `/datasources`,
            headers: { cookie: cookieE_None }
        });

        const list = resList.json();
        // User E should not see the data source in the list
        expect(list.find((d: any) => d.id === dataSourceId)).toBeUndefined();
    });

    it('should enforce READ permission limits (User B)', async () => {
        // Can LIST
        const resList = await app.inject({
            method: 'GET',
            url: `/datasources`,
            headers: { cookie: cookieB_Read }
        });
        expect(resList.json().find((d: any) => d.id === dataSourceId)).toBeDefined();

        // CANNOT UPDATE
        const resUpdate = await app.inject({
            method: 'PUT',
            url: `/datasources/${dataSourceId}`,
            headers: { cookie: cookieB_Read },
            payload: { name: 'DB Read Hack' }
        });
        expect(resUpdate.statusCode).toBe(403);

        // CANNOT TEST
        const resTest = await app.inject({
            method: 'POST',
            url: `/datasources/${dataSourceId}/test`,
            headers: { cookie: cookieB_Read }
        });
        expect(resTest.statusCode).toBe(403);

        // CANNOT DELETE
        const resDelete = await app.inject({
            method: 'DELETE',
            url: `/datasources/${dataSourceId}`,
            headers: { cookie: cookieB_Read }
        });
        expect(resDelete.statusCode).toBe(403);
    });

    it('should enforce WRITE permission limits (User C)', async () => {
        // Can LIST
        const resList = await app.inject({
            method: 'GET',
            url: `/datasources`,
            headers: { cookie: cookieC_Write }
        });
        expect(resList.json().find((d: any) => d.id === dataSourceId)).toBeDefined();

        // CAN UPDATE configurations (shallow put)
        const resUpdate = await app.inject({
            method: 'PUT',
            url: `/datasources/${dataSourceId}`,
            headers: { cookie: cookieC_Write },
            payload: { name: 'DB Write Valid', data: { host: 'remote-host' } }
        });
        expect(resUpdate.statusCode).toBe(200);

        // CAN TEST
        const resTest = await app.inject({
            method: 'POST',
            url: `/datasources/${dataSourceId}/test`,
            headers: { cookie: cookieC_Write }
        });
        // We expect either 200 or 500 depending on real connection success, but NOT 403
        expect(resTest.statusCode).not.toBe(403);

        // CANNOT DELETE
        const resDelete = await app.inject({
            method: 'DELETE',
            url: `/datasources/${dataSourceId}`,
            headers: { cookie: cookieC_Write }
        });
        expect(resDelete.statusCode).toBe(403);
    });

    it('should enforce ADMIN permission limits (User D)', async () => {
        // CAN UPDATE permissions
        const resUpdate = await app.inject({
            method: 'PUT',
            url: `/datasources/${dataSourceId}`,
            headers: { cookie: cookieD_Admin },
            payload: {
                name: 'DB Admin Valid',
                groupPermissions: [
                    { groupId: groupRead.id, permission: 'READ' },
                    { groupId: groupWrite.id, permission: 'WRITE' },
                    { groupId: groupAdmin.id, permission: 'ADMIN' },
                    { groupId: groupNone.id, permission: 'READ' }, // Granting read to None
                ]
            }
        });
        expect(resUpdate.statusCode).toBe(200);
        const body = resUpdate.json();
        expect(body.permissions).toHaveLength(4);

        // CAN DELETE
        const resDelete = await app.inject({
            method: 'DELETE',
            url: `/datasources/${dataSourceId}`,
            headers: { cookie: cookieD_Admin }
        });
        expect(resDelete.statusCode).toBe(204);
    });
});
