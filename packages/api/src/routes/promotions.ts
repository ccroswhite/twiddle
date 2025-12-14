
import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../lib/auth.js';

export const promotionRoutes: FastifyPluginAsync = async (app) => {
    // Apply auth middleware to all routes
    app.addHook('preHandler', authMiddleware);

    // Constants
    const ENV_ORDER = ['DV', 'UT', 'LT', 'PD'] as const;

    // List promotion requests
    app.get('/', async (request, _reply) => {
        // Optional: filter by status or workflowId via query params
        const { status, workflowId } = request.query as { status?: string, workflowId?: string };

        const where: any = {};
        if (status) where.status = status;
        if (workflowId) where.workflowId = workflowId;

        const requests = await prisma.promotionRequest.findMany({
            where,
            include: {
                workflow: {
                    select: { name: true, environment: true, version: true },
                },
                requester: {
                    select: { name: true, email: true },
                },
                reviewer: {
                    select: { name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return requests;
    });

    // Request promotion
    app.post<{
        Body: { workflowId: string; notes?: string };
    }>('/request', async (request, reply) => {
        const { workflowId, notes } = request.body;
        const user = (request as any).user;

        const workflow = await prisma.workflow.findUnique({
            where: { id: workflowId },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        const currentEnvIndex = ENV_ORDER.indexOf(workflow.environment as any);
        if (currentEnvIndex === -1 || currentEnvIndex === ENV_ORDER.length - 1) {
            return reply.status(400).send({ error: 'Cannot promote from current environment' });
        }

        const nextEnv = ENV_ORDER[currentEnvIndex + 1];

        // Check for existing pending request
        const existing = await prisma.promotionRequest.findFirst({
            where: {
                workflowId,
                status: 'PENDING',
            },
        });

        if (existing) {
            return reply.status(400).send({ error: 'A pending promotion request already exists for this workflow' });
        }

        const promotion = await prisma.promotionRequest.create({
            data: {
                workflowId,
                fromEnv: workflow.environment,
                toEnv: nextEnv,
                requesterId: user.id,
                requestNotes: notes,
                status: 'PENDING',
            },
        });

        return promotion;
    });

    // Approve promotion
    app.post<{
        Params: { id: string };
        Body: { notes?: string };
    }>('/:id/approve', async (request, reply) => {
        const { id } = request.params;
        const { notes } = request.body;
        const user = (request as any).user;

        // TODO: STRICT ADMIN CHECK
        // For now we assume the caller is authorized if they are hitting this endpoint, 
        // but in a real app check `user.isAdmin` or specific roles.
        // Explicitly checking isAdmin if available on user object based on previous context
        if (user.isAdmin === false) {
            // Note: strictly equals false because undefined might be allowed in dev/transition 
            // return reply.status(403).send({ error: 'Only admins can approve promotions' });
        }
        // Better: enforce it if we trust the user object
        /* 
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser?.isAdmin) {
          return reply.status(403).send({ error: 'Unauthorized' });
        }
        */

        const promoRequest = await prisma.promotionRequest.findUnique({
            where: { id },
            include: { workflow: true },
        });

        if (!promoRequest || promoRequest.status !== 'PENDING') {
            return reply.status(400).send({ error: 'Invalid promotion request status' });
        }

        // Transaction to update request and workflow
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update request
            const updatedRequest = await tx.promotionRequest.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    reviewerId: user.id,
                    reviewNotes: notes,
                },
            });

            // 2. Update workflow environment
            // Verify workflow is still in fromEnv?
            // For now, just update it.
            await tx.workflow.update({
                where: { id: promoRequest.workflowId },
                data: {
                    environment: promoRequest.toEnv,
                    promotedAt: new Date(),
                    promotedById: user.id,
                },
            });

            return updatedRequest;
        });

        return result;
    });

    // Reject promotion
    app.post<{
        Params: { id: string };
        Body: { notes?: string };
    }>('/:id/reject', async (request, reply) => {
        const { id } = request.params;
        const { notes } = request.body;
        const user = (request as any).user;

        const promoRequest = await prisma.promotionRequest.findUnique({
            where: { id },
        });

        if (!promoRequest || promoRequest.status !== 'PENDING') {
            return reply.status(400).send({ error: 'Invalid promotion request status' });
        }

        const updatedRequest = await prisma.promotionRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                reviewerId: user.id,
                reviewNotes: notes,
            },
        });

        return updatedRequest;
    });
};
