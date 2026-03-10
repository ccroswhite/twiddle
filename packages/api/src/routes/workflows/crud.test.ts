import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fastify from 'fastify';
import { crudRoutes } from './crud.js';
import { prisma } from '../../lib/prisma.js';

// Deep mock prisma so entire crud file doesn't fail on missing mocked tables
vi.mock('../../lib/prisma.js', () => ({
    prisma: {
        workflow: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn()
        },
        groupMember: { findMany: vi.fn(), findFirst: vi.fn() },
        workflowVersion: { findMany: vi.fn() },
        workflowLock: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() }
    }
}));

describe('Workflows CRUD API Routes', () => {
    let app: ReturnType<typeof fastify>;

    beforeEach(() => {
        app = fastify();
        // CRUD logic relies on session user auth decorating the request
        // We mock that simply with a preHandler for these isolating unit tests
        app.decorateRequest('user', null);
        app.addHook('preHandler', async (request) => {
            const authHeader = request.headers['authorization'];
            if (authHeader === 'user-a') {
                (request as any).user = { id: 'user-a' };
            } else if (authHeader === 'user-b') {
                (request as any).user = { id: 'user-b' };
            }
        });

        app.register(crudRoutes);
        vi.clearAllMocks();
    });

    afterEach(() => {
        app.close();
    });

    describe('GET /published-activities (Cross-Workflow Signals)', () => {
        it('Should collect all explicit published activities and implicit Node ID states', async () => {
            vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);

            const mockWorkflows = [
                {
                    nodes: [
                        {
                            id: 'node-alpha',
                            data: { parameters: { publishedActivity: ['Signal-X', 'Signal-Y'] } }
                        },
                        {
                            id: 'node-beta',
                            data: {} // No explicit parameters
                        }
                    ]
                },
                {
                    nodes: [
                        {
                            id: 'node-gamma',
                            data: { parameters: { publishedActivity: ['Signal-Z'] } }
                        }
                    ]
                }
            ];
            vi.mocked(prisma.workflow.findMany).mockResolvedValue(mockWorkflows as any);

            const response = await app.inject({
                method: 'GET',
                url: '/published-activities',
                headers: { authorization: 'user-a' }
            });

            expect(response.statusCode).toBe(200);
            const json = response.json();

            // We expect the array to be Alphabetized unique signals
            // Explicit: Signal-X, Signal-Y, Signal-Z
            // Implicit: node-alpha-OK, node-beta-OK, node-gamma-OK
            expect(json).toEqual([
                'Signal-X',
                'Signal-Y',
                'Signal-Z',
                'node-alpha-OK',
                'node-beta-OK',
                'node-gamma-OK'
            ].sort());
        });

        it('Should enforce RBAC isolation boundaries between users', async () => {
            // User A belongs to Group X
            vi.mocked(prisma.groupMember.findMany).mockResolvedValue([{ groupId: 'group-x' } as any]);
            vi.mocked(prisma.workflow.findMany).mockResolvedValue([]);

            await app.inject({
                method: 'GET',
                url: '/published-activities',
                headers: { authorization: 'user-a' }
            });

            // Assert that Prisma searched securely
            const whereClause = vi.mocked(prisma.workflow.findMany).mock.calls[0][0]?.where as any;

            expect(whereClause.OR).toBeDefined();
            expect(whereClause.OR).toContainEqual({ createdById: 'user-a' });
            expect(whereClause.OR).toContainEqual({ groupId: { in: ['group-x'] } });
            // Null groupId means global folder, everyone can read
            expect(whereClause.OR).toContainEqual({ groupId: null });
        });

        it('Should skip malformed data gracefully without crashing', async () => {
            vi.mocked(prisma.groupMember.findMany).mockResolvedValue([]);
            const mockWorkflows = [
                { nodes: null },
                // No .data property
                { nodes: [{ id: 'node1' }] },
                // .publishedActivity is a string, not array
                { nodes: [{ id: 'node2', data: { parameters: { publishedActivity: "Signal-Z" } } }] }
            ];
            vi.mocked(prisma.workflow.findMany).mockResolvedValue(mockWorkflows as any);

            const response = await app.inject({
                method: 'GET',
                url: '/published-activities',
                headers: { authorization: 'user-a' }
            });

            expect(response.statusCode).toBe(200);
            // Only the implicit IDs should survive the bad data
            expect(response.json()).toEqual(['node1-OK', 'node2-OK']);
        });
    });
});
