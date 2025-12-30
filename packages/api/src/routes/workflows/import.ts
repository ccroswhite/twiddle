/**
 * Workflow import route
 * Handles importing workflows from exported JSON
 */
import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { generatePythonCode } from '../../lib/export/temporal-python/index.js';

/**
 * Import request body
 */
interface ImportBody {
    workflowName?: string;
    workflowDescription?: string;
    definition: {
        nodes: unknown[];
        connections: unknown[];
        settings?: unknown;
        tags?: string[];
    };
    groupId?: string;
}

export const importRoutes: FastifyPluginAsync = async (app) => {
    // Import workflow from exported JSON
    app.post<{ Body: ImportBody }>('/import', async (request, reply) => {
        const { workflowName, workflowDescription, definition, groupId } = request.body;
        const userId = (request as { user?: { id: string } }).user?.id;

        if (!definition || !definition.nodes) {
            return reply.status(400).send({ error: 'Invalid import data: missing definition.nodes' });
        }

        const name = workflowName || 'Imported Workflow';
        const nodes = definition.nodes || [];
        const connections = definition.connections || [];

        // Generate Python code from imported workflow
        const pythonCode = generatePythonCode({
            id: 'imported',
            name,
            description: workflowDescription || undefined,
            nodes: nodes as unknown[],
            connections: connections as unknown[],
        } as Parameters<typeof generatePythonCode>[0]);

        const workflow = await prisma.workflow.create({
            data: {
                name,
                description: workflowDescription,
                nodes: nodes as unknown as Prisma.InputJsonValue,
                connections: connections as unknown as Prisma.InputJsonValue,
                settings: (definition.settings || {}) as unknown as Prisma.InputJsonValue,
                tags: definition.tags || [],
                createdById: userId,
                groupId,
                pythonWorkflow: pythonCode.pythonWorkflow,
                pythonActivities: pythonCode.pythonActivities,
                pythonRequirements: pythonCode.pythonRequirements,
            },
            include: {
                group: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return reply.status(201).send(workflow);
    });
};
