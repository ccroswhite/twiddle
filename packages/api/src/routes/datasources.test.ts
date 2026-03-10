import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fastify from 'fastify';
import { credentialRoutes } from './datasources.js';
import { prisma } from '../lib/prisma.js';

vi.mock('../lib/prisma.js', () => ({
    prisma: {
        session: { findUnique: vi.fn() },
        groupMember: { findMany: vi.fn(), findFirst: vi.fn() },
        dataSource: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        },
    }
}));

// Mock the testDataSource utility function
vi.mock('../lib/datasources/registry.js', () => ({
    testDataSource: vi.fn().mockResolvedValue({ success: true, message: 'Mocked test success' })
}));

describe('DataSources API Routes (RBAC & Redaction)', () => {
    let app: ReturnType<typeof fastify>;

    beforeEach(() => {
        app = fastify();
        app.register(credentialRoutes);
        vi.clearAllMocks();
    });

    afterEach(() => {
        app.close();
    });

    const mockAdminUser = { id: 'admin-1', email: 'admin@test.com', isAdmin: true, isActive: true };
    const mockRegularUserA = { id: 'user-a', email: 'usera@test.com', isAdmin: false, isActive: true };
    const mockRegularUserB = { id: 'user-b', email: 'userb@test.com', isAdmin: false, isActive: true };

    const mockSession = (user: any) => {
        vi.mocked(prisma.session.findUnique).mockResolvedValue({
            id: 'session-1',
            token: 'valid-token',
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60),
            createdAt: new Date(),
            user
        } as any);
    };

    describe('GET / - List Data Sources (RBAC)', () => {
        it('Should return 401 if not authenticated', async () => {
            vi.mocked(prisma.session.findUnique).mockResolvedValue(null);
            const response = await app.inject({ method: 'GET', url: '/' });
            expect(response.statusCode).toBe(401);
        });

        it('Should allow System Admin to see all data sources including legacy (null owner)', async () => {
            mockSession(mockAdminUser);
            vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);

            const mockSources = [
                { id: '1', name: 'Legacy DB', createdById: null, permissions: [] },
                { id: '2', name: 'User B DB', createdById: 'user-b', permissions: [] }
            ];
            vi.mocked(prisma.dataSource.findMany).mockResolvedValue(mockSources as any);

            const response = await app.inject({
                method: 'GET',
                url: '/',
                headers: { cookie: 'twiddle_session=valid-token' }
            });

            expect(response.statusCode).toBe(200);
            const json = response.json();
            expect(json).toHaveLength(2);
            // Admin should be considered owner of legacy
            expect(json[0].isOwner).toBe(true);
            // Admin is not owner of User B's DB
            expect(json[1].isOwner).toBe(false);

            // Ensure the Prisma query was completely open
            expect(vi.mocked(prisma.dataSource.findMany).mock.calls[0][0]?.where).toEqual({});
        });

        it('Should allow Regular User to see only owned or shared data sources', async () => {
            mockSession(mockRegularUserA);
            // User A belongs to Group X
            vi.mocked(prisma.groupMember.findMany).mockResolvedValue([{ groupId: 'group-x' } as any]);

            vi.mocked(prisma.dataSource.findMany).mockResolvedValue([]);

            await app.inject({
                method: 'GET',
                url: '/',
                headers: { cookie: 'twiddle_session=valid-token' }
            });

            // Verify Prisma query structure for RBAC
            const whereClause = vi.mocked(prisma.dataSource.findMany).mock.calls[0][0]?.where as any;
            expect(whereClause.OR).toBeDefined();
            expect(whereClause.OR).toContainEqual({ createdById: 'user-a' });
            expect(whereClause.OR).toContainEqual({ permissions: { some: { groupId: { in: ['group-x'] } } } });
            expect(whereClause.OR).toContainEqual({ createdById: null }); // Legacy accessible
        });
    });

    describe('GET /:id/edit - Credential Redaction', () => {
        it('Should completely redact passwords before sending to client in Edit mode', async () => {
            mockSession(mockRegularUserA);

            // Setup mock data source owned by User A
            const rawDataSource = {
                id: 'db-1',
                name: 'Production DB',
                createdById: 'user-a',
                data: {
                    host: 'localhost',
                    port: 5432,
                    username: 'admin',
                    password: 'super-secret-password-1234',
                    clientSecret: 'secret-token-xyz'
                },
                permissions: []
            };

            vi.mocked(prisma.dataSource.findUnique).mockResolvedValue(rawDataSource as any);

            const response = await app.inject({
                method: 'GET',
                url: '/db-1/edit',
                headers: { cookie: 'twiddle_session=valid-token' }
            });

            expect(response.statusCode).toBe(200);
            const json = response.json();

            // Non-sensitive fields should remain
            expect(json.data.host).toBe('localhost');
            expect(json.data.username).toBe('admin');

            // Sensitive fields MUST be redacted
            expect(json.data.password).toBe('');
            expect(json.data.clientSecret).toBe('');

            // Original data should NOT be mutated
            expect(rawDataSource.data.password).toBe('super-secret-password-1234');
        });

        it('Should block access if User A tries to edit User B data source without permission', async () => {
            mockSession(mockRegularUserA);

            vi.mocked(prisma.dataSource.findUnique).mockResolvedValue({
                id: 'db-2',
                createdById: 'user-b',
                permissions: []
            } as any);

            const response = await app.inject({
                method: 'GET',
                url: '/db-2/edit',
                headers: { cookie: 'twiddle_session=valid-token' }
            });

            expect(response.statusCode).toBe(403);
        });
    });

    describe('PUT /:id - Shallow Credential Merging', () => {
        it('Should merge new non-sensitive data while preserving existing redacted passwords', async () => {
            mockSession(mockRegularUserA);

            // Existing profile in DB with a secret password
            vi.mocked(prisma.dataSource.findUnique).mockResolvedValue({
                id: 'db-3',
                createdById: 'user-a',
                data: {
                    host: 'old-host.com',
                    password: 'existing-secret'
                },
                permissions: []
            } as any);

            vi.mocked(prisma.dataSource.update).mockResolvedValue({
                id: 'db-3',
                permissions: []
            } as any);

            // Client sends an update with empty password (because it was redacted on fetching)
            await app.inject({
                method: 'PUT',
                url: '/db-3',
                headers: { cookie: 'twiddle_session=valid-token' },
                payload: {
                    name: 'Updated DB',
                    data: {
                        host: 'new-host.com'
                        // Password omitted
                    }
                }
            });

            // Verify the shallow merge logic in Prisma Update
            const updateArgs = vi.mocked(prisma.dataSource.update).mock.calls[0][0];
            const sentData = updateArgs.data?.data as any;

            // It should keep the existing password but update the host
            expect(sentData.host).toBe('new-host.com');
            expect(sentData.password).toBe('existing-secret');
        });
    });
});
