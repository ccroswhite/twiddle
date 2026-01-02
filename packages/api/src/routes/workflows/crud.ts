/**
 * Workflow CRUD routes
 * Handles List, Get (with locking), Create, Update, Delete operations
 */
import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { generatePythonCode } from '../../lib/export/temporal-python/index.js';
import { commitWorkflowToGitHub } from './helpers.js';
import type { WorkflowCreateInput, WorkflowUpdateInput } from '@twiddle/shared';
import {
    createSchedule,
    updateSchedule,
    deleteSchedule,
    pauseSchedule,
    resumeSchedule,
    scheduleExists,
    type ScheduleSpec,
} from '../../lib/temporal-client.js';

// Lock timeout in milliseconds (2 minutes)
const LOCK_TIMEOUT = 2 * 60 * 1000;
// Request timeout in milliseconds (1 minute)
const REQUEST_TIMEOUT = 1 * 60 * 1000;

// Helper to convert workflow name to task queue
function toTaskQueue(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/^(\d)/, '_$1') || 'workflow';
}

// Extract interval/cron from workflow nodes
interface WorkflowNode {
    type?: string;
    parameters?: {
        cron?: string;
        interval?: number;
    };
}

function extractScheduleSpec(nodes: WorkflowNode[]): ScheduleSpec | null {
    const intervalNode = nodes.find((n) => n.type === 'twiddle.interval');
    if (!intervalNode) return null;

    const params = intervalNode.parameters || {};
    if (params.cron) {
        return { cron: params.cron };
    }
    if (params.interval) {
        // Interval is in minutes, convert to seconds
        return { intervalSeconds: params.interval * 60 };
    }
    return null;
}

export const crudRoutes: FastifyPluginAsync = async (app) => {
    // List all workflows (filtered by group membership if authenticated)
    app.get<{
        Querystring: { groupId?: string };
    }>('/', async (request, _reply) => {
        const userId = (request as { user?: { id: string } }).user?.id;
        const { groupId } = request.query;

        // Build where clause based on authentication and group filter
        let whereClause: Prisma.WorkflowWhereInput = {};

        if (groupId) {
            // Filter by specific group
            whereClause.groupId = groupId;
        } else if (userId) {
            // Get user's group IDs
            const memberships = await prisma.groupMember.findMany({
                where: { userId },
                select: { groupId: true },
            });
            const userGroupIds = memberships.map((m: typeof memberships[number]) => m.groupId);

            // Show workflows in user's groups OR created by user OR with no group
            whereClause = {
                OR: [
                    { groupId: { in: userGroupIds } },
                    { createdById: userId },
                    { groupId: null },
                ],
            };
        }
        // If not authenticated, show all workflows (for development)

        const workflows = await prisma.workflow.findMany({
            where: whereClause,
            orderBy: { updatedAt: 'desc' },
            include: {
                group: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return workflows;
    });

    // Get a single workflow with locking logic
    app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const { id } = request.params;
        const user = (request as { user?: { id: string; name?: string; email: string } }).user;

        // 1. Fetch workflow with current lock
        let workflow = await prisma.workflow.findUnique({
            where: { id },
            include: {
                lock: {
                    include: { user: true },
                },
            },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        // 2. Handle Lock Logic
        let lockedByObject = null;
        const now = new Date();

        // Check for stale lock
        if (workflow.lock) {
            if (now.getTime() - new Date(workflow.lock.updatedAt).getTime() > LOCK_TIMEOUT) {
                // Stale lock - delete it
                try {
                    await prisma.workflowLock.delete({ where: { id: workflow.lock.id } });
                    workflow.lock = null; // Clear from memory object
                } catch (e) {
                    // Ignore delete errors (race condition)
                }
            } else if (workflow.lock.requestingAt) {
                // Check for request timeout
                if (now.getTime() - new Date(workflow.lock.requestingAt).getTime() > REQUEST_TIMEOUT) {
                    // Forced Swap
                    try {
                        await prisma.workflowLock.update({
                            where: { id: workflow.lock.id },
                            data: {
                                userId: workflow.lock.requestingUserId!,
                                requestingUserId: null,
                                requestingAt: null,
                                updatedAt: new Date()
                            }
                        });
                        // Update memory object for response
                        workflow.lock.userId = workflow.lock.requestingUserId!;
                        workflow.lock.requestingUserId = null;
                    } catch (e) {
                        // Race condition
                    }
                }
            }
        }

        if (workflow.lock) {
            // Logic for existing lock
            if (user && workflow.lock.userId === user.id) {
                // Locked by current user - refresh heartbeat
                try {
                    await prisma.workflowLock.update({
                        where: { id: workflow.lock.id },
                        data: { updatedAt: new Date() },
                    });
                    lockedByObject = { id: user.id, name: user.name || user.email, email: user.email, isMe: true };
                } catch (e) {
                    // Lock might have been deleted by race condition, treat as lost
                    lockedByObject = null;
                }
            } else {
                // Locked by someone else
                lockedByObject = {
                    id: workflow.lock.userId,
                    name: workflow.lock.user.name || workflow.lock.user.email,
                    email: workflow.lock.user.email,
                    isMe: false,
                };
            }
        }

        if (lockedByObject) {
            // Add request info if present
            if (workflow.lock?.requestingUserId) {
                const requestingUser = await prisma.user.findUnique({ where: { id: workflow.lock.requestingUserId } });
                if (requestingUser) {
                    (lockedByObject as { request?: unknown }).request = {
                        userId: requestingUser.id,
                        name: requestingUser.name || requestingUser.email,
                        email: requestingUser.email,
                        requestedAt: workflow.lock.requestingAt
                    };
                }
            }
        }

        // if still unlocked and user is present, acquire lock
        if (!workflow.lock && !lockedByObject && user) {
            try {
                await prisma.workflowLock.create({
                    data: {
                        workflowId: id,
                        userId: user.id,
                    },
                    include: { user: true },
                });
                lockedByObject = { id: user.id, name: user.name || user.email, email: user.email, isMe: true };
            } catch (e) {
                // Race condition - someone else locked it
                const raceLock = await prisma.workflowLock.findUnique({ where: { workflowId: id }, include: { user: true } });
                if (raceLock) {
                    lockedByObject = {
                        id: raceLock.userId,
                        name: raceLock.user.name || raceLock.user.email,
                        email: raceLock.user.email,
                        isMe: false
                    };
                }
            }
        }

        return { ...workflow, lockedBy: lockedByObject };
    });

    // Create a new workflow
    app.post<{ Body: WorkflowCreateInput & { groupId?: string; folderId?: string } }>('/', async (request, reply) => {
        const { name, description, nodes, connections, settings, tags, groupId, folderId, properties, schedule } = request.body;
        const userId = (request as { user?: { id: string } }).user?.id;

        // Generate Python code from workflow definition
        const workflowNodes = (nodes || []) as unknown[];
        const workflowConnections = (connections || []) as unknown[];

        const pythonCode = generatePythonCode({
            id: 'new',
            name: name || 'Untitled Workflow',
            description: description || undefined,
            nodes: workflowNodes,
            connections: workflowConnections,
        } as Parameters<typeof generatePythonCode>[0]);

        const workflow = await prisma.workflow.create({
            data: {
                name,
                description,
                nodes: (nodes || []) as unknown as Prisma.InputJsonValue,
                connections: (connections || []) as unknown as Prisma.InputJsonValue,
                settings: (settings || {}) as unknown as Prisma.InputJsonValue,
                tags: tags || [],
                createdById: userId,
                groupId,
                folderId,
                // Store generated Python code
                pythonWorkflow: pythonCode.pythonWorkflow,
                pythonActivities: pythonCode.pythonActivities,
                pythonRequirements: pythonCode.pythonRequirements,
                // Store properties and schedule
                properties: (properties || []) as unknown as Prisma.InputJsonValue,
                schedule: (schedule || null) as unknown as Prisma.InputJsonValue,
            },
            include: {
                group: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                folder: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Sync schedule with Temporal if workflow has interval trigger
        const workflowNodesForSchedule = nodes as WorkflowNode[] | undefined;
        if (workflowNodesForSchedule) {
            const scheduleSpec = extractScheduleSpec(workflowNodesForSchedule);
            if (scheduleSpec) {
                // Create schedule asynchronously - don't block workflow creation
                void (async () => {
                    try {
                        const taskQueue = toTaskQueue(workflow.name);
                        const workflowType = `${taskQueue.charAt(0).toUpperCase()}${taskQueue.slice(1)}Workflow`;
                        await createSchedule(
                            workflow.id,
                            workflowType,
                            taskQueue,
                            scheduleSpec,
                            [{}],
                            { workflowId: workflow.id, workflowName: workflow.name }
                        );
                        console.log(`Created Temporal schedule for workflow ${workflow.id}`);
                    } catch (error) {
                        console.error(`Failed to create schedule for workflow ${workflow.id}:`, error);
                    }
                })();
            }
        }

        return reply.status(201).send(workflow);
    });

    // Update a workflow
    app.put<{ Params: { id: string }; Body: WorkflowUpdateInput }>(
        '/:id',
        async (request, _reply) => {
            const { id } = request.params;
            const { name, description, nodes, connections, settings, active, tags, properties, schedule } = request.body;

            // Get existing workflow to merge with updates
            const existing = await prisma.workflow.findUnique({ where: { id } });
            if (!existing) {
                throw new Error('Workflow not found');
            }

            // Regenerate Python code if nodes or connections changed
            let pythonCodeUpdate = {};
            if (nodes !== undefined || connections !== undefined || name !== undefined) {
                const workflowNodes = (nodes ?? existing.nodes) as unknown[];
                const workflowConnections = (connections ?? existing.connections) as unknown[];

                const pythonCode = generatePythonCode({
                    id,
                    name: name ?? existing.name,
                    description: (description ?? existing.description) || undefined,
                    nodes: workflowNodes,
                    connections: workflowConnections,
                } as Parameters<typeof generatePythonCode>[0]);

                pythonCodeUpdate = {
                    pythonWorkflow: pythonCode.pythonWorkflow,
                    pythonActivities: pythonCode.pythonActivities,
                    pythonRequirements: pythonCode.pythonRequirements,
                };
            }

            const workflow = await prisma.workflow.update({
                where: { id },
                data: {
                    // Increment version on every save
                    version: { increment: 1 },
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                    ...(nodes !== undefined && { nodes: nodes as unknown as Prisma.InputJsonValue }),
                    ...(connections !== undefined && { connections: connections as unknown as Prisma.InputJsonValue }),
                    ...(settings !== undefined && { settings: settings as unknown as Prisma.InputJsonValue }),
                    ...(active !== undefined && { active }),
                    ...(tags !== undefined && { tags }),
                    ...(properties !== undefined && { properties: properties as unknown as Prisma.InputJsonValue }),
                    ...(schedule !== undefined && { schedule: schedule as unknown as Prisma.InputJsonValue }),
                    ...pythonCodeUpdate,
                },
            });

            // Create a version snapshot
            const userId = (request as { user?: { id: string } }).user?.id;
            await prisma.workflowVersion.create({
                data: {
                    workflowId: id,
                    version: workflow.version,
                    nodes: workflow.nodes as Prisma.InputJsonValue,
                    connections: workflow.connections as Prisma.InputJsonValue,
                    settings: workflow.settings as Prisma.InputJsonValue,
                    createdById: userId
                }
            });

            // Commit to GitHub if configured
            if (workflow.githubRepo && workflow.localPath) {
                const gitResult = await commitWorkflowToGitHub(workflow);
                if (!gitResult.success) {
                    request.log.error({ error: gitResult.error }, 'GitHub commit failed');
                    // Don't fail the save, just log the error
                }
            }

            // Sync Temporal schedule if nodes changed or active status changed
            void (async () => {
                try {
                    const updatedNodes = (workflow.nodes as WorkflowNode[]) || [];
                    const scheduleSpec = extractScheduleSpec(updatedNodes);
                    const hasSchedule = await scheduleExists(id);

                    if (scheduleSpec) {
                        // Workflow has interval trigger
                        if (hasSchedule) {
                            // Update existing schedule
                            await updateSchedule(id, scheduleSpec);
                            console.log(`Updated Temporal schedule for workflow ${id}`);
                        } else {
                            // Create new schedule
                            const taskQueue = toTaskQueue(workflow.name);
                            const workflowType = `${taskQueue.charAt(0).toUpperCase()}${taskQueue.slice(1)}Workflow`;
                            await createSchedule(
                                id,
                                workflowType,
                                taskQueue,
                                scheduleSpec,
                                [{}],
                                { workflowId: id, workflowName: workflow.name }
                            );
                            console.log(`Created Temporal schedule for workflow ${id}`);
                        }

                        // Handle pause/resume based on active status
                        if (active !== undefined) {
                            if (active) {
                                await resumeSchedule(id);
                                console.log(`Resumed Temporal schedule for workflow ${id}`);
                            } else {
                                await pauseSchedule(id);
                                console.log(`Paused Temporal schedule for workflow ${id}`);
                            }
                        }
                    } else if (hasSchedule) {
                        // Interval trigger removed - delete schedule
                        await deleteSchedule(id);
                        console.log(`Deleted Temporal schedule for workflow ${id} (interval trigger removed)`);
                    }
                } catch (error) {
                    console.error(`Failed to sync schedule for workflow ${id}:`, error);
                }
            })();

            return workflow;
        },
    );

    // Delete a workflow
    app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
        const { id } = request.params;

        // Delete Temporal schedule if it exists (async, don't block)
        void (async () => {
            try {
                await deleteSchedule(id);
                console.log(`Deleted Temporal schedule for workflow ${id}`);
            } catch (error) {
                // Ignore errors - schedule may not exist
                console.log(`No schedule to delete for workflow ${id}`);
            }
        })();

        await prisma.workflow.delete({
            where: { id },
        });

        return reply.status(204).send();
    });
};
