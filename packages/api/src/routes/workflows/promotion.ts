/**
 * Workflow promotion/demotion routes
 * Handles environment transitions: DV -> UT -> LT -> PD
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';

// Environment promotion order
const PROMOTION_ORDER = ['DV', 'UT', 'LT', 'PD'] as const;
type Environment = typeof PROMOTION_ORDER[number];

export const promotionRoutes: FastifyPluginAsync = async (app) => {
    // Promote workflow to next environment
    // DV -> UT -> LT -> PD
    // Only admins can use this direct route (Force Promote)
    app.post<{
        Params: { id: string };
        Body: { targetEnvironment: 'UT' | 'LT' | 'PD' };
    }>('/:id/promote', async (request, reply) => {
        const { id } = request.params;
        const { targetEnvironment } = request.body;
        const user = (request as { user?: { id: string; isAdmin?: boolean } }).user;

        // Get current workflow
        const workflow = await prisma.workflow.findUnique({
            where: { id },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        // Validate promotion is sequential (can only promote to next stage)
        const currentIndex = PROMOTION_ORDER.indexOf(workflow.environment as Environment);
        const targetIndex = PROMOTION_ORDER.indexOf(targetEnvironment);

        if (targetIndex !== currentIndex + 1) {
            return reply.status(400).send({
                error: `Invalid promotion. Can only promote from ${workflow.environment} to ${PROMOTION_ORDER[currentIndex + 1] || 'nowhere (already at PD)'}`
            });
        }

        // Direct usage of this endpoint is now restricted to Admins (Force Promote)
        // Regular users must use the /promotions/request flow.
        if (!user?.isAdmin) {
            return reply.status(403).send({
                error: 'Direct promotion is restricted to administrators. Please use the Promotion Request workflow.'
            });
        }

        // Perform the promotion
        const updatedWorkflow = await prisma.workflow.update({
            where: { id },
            data: {
                environment: targetEnvironment,
                promotedAt: new Date(),
                promotedById: user?.id,
            },
            include: {
                group: {
                    select: { id: true, name: true },
                },
                createdBy: {
                    select: { id: true, email: true, name: true },
                },
            },
        });

        return updatedWorkflow;
    });

    // Demote workflow to previous environment (admin only)
    app.post<{
        Params: { id: string };
        Body: { targetEnvironment: 'DV' | 'UT' | 'LT' };
    }>('/:id/demote', async (request, reply) => {
        const { id } = request.params;
        const { targetEnvironment } = request.body;
        const user = (request as { user?: { id: string; isAdmin?: boolean } }).user;

        // Only admins can demote
        if (!user?.isAdmin) {
            return reply.status(403).send({
                error: 'Only administrators can demote workflows'
            });
        }

        // Get current workflow
        const workflow = await prisma.workflow.findUnique({
            where: { id },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        // Validate demotion is to a lower stage
        const currentIndex = PROMOTION_ORDER.indexOf(workflow.environment as Environment);
        const targetIndex = PROMOTION_ORDER.indexOf(targetEnvironment);

        if (targetIndex >= currentIndex) {
            return reply.status(400).send({
                error: `Invalid demotion. Target environment must be lower than current (${workflow.environment})`
            });
        }

        // Perform the demotion
        const updatedWorkflow = await prisma.workflow.update({
            where: { id },
            data: {
                environment: targetEnvironment,
                promotedAt: new Date(),
                promotedById: user?.id,
            },
            include: {
                group: {
                    select: { id: true, name: true },
                },
                createdBy: {
                    select: { id: true, email: true, name: true },
                },
            },
        });

        return updatedWorkflow;
    });
};
