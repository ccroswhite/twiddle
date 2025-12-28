/**
 * Workflow version routes
 * Handles listing and retrieving workflow versions
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';

export const versionRoutes: FastifyPluginAsync = async (app) => {
    // Get all versions for a workflow
    app.get<{ Params: { id: string } }>('/:id/versions', async (request) => {
        const { id } = request.params;

        const versions = await prisma.workflowVersion.findMany({
            where: { workflowId: id },
            orderBy: { version: 'desc' },
            select: {
                id: true,
                version: true,
                createdAt: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                }
            }
        });
        return versions;
    });

    // Get a specific version
    app.get<{ Params: { id: string, versionId: string } }>('/:id/versions/:versionId', async (request, reply) => {
        const { id, versionId } = request.params;

        const version = await prisma.workflowVersion.findUnique({
            where: { id: versionId }
        });

        if (!version || version.workflowId !== id) {
            return reply.status(404).send({ error: 'Version not found' });
        }

        return version;
    });
};
