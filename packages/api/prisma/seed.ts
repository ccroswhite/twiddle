
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create Default Admin User
    const adminEmail = 'admin@twiddle.com';
    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Admin User',
            password: 'password123', // In real app, hash this!
            isAdmin: true,
            emailVerified: true,
        },
    });
    console.log({ admin });

    // Create Default Group
    const defaultGroup = await prisma.group.upsert({
        where: { name: 'Engineering' },
        update: {},
        create: {
            name: 'Engineering',
            description: 'Default engineering group',
            isDefault: true,
            members: {
                create: {
                    userId: admin.id,
                    role: 'owner',
                },
            },
        },
    });
    console.log({ defaultGroup });

    // Create Sample Workflow (Optional)
    const sampleWorkflow = await prisma.workflow.create({
        data: {
            name: 'Sample Workflow',
            description: 'A sample workflow created by seed',
            createdById: admin.id,
            groupId: defaultGroup.id,
            nodes: [
                { id: '1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } },
                { id: '2', type: 'end', position: { x: 400, y: 100 }, data: { label: 'End' } }
            ],
            connections: [
                { sourceNodeId: '1', targetNodeId: '2', id: 'e1-2' }
            ],
            version: 1
        }
    });
    console.log({ sampleWorkflow });

    // Create Initial Version
    await prisma.workflowVersion.create({
        data: {
            workflowId: sampleWorkflow.id,
            version: 1,
            nodes: sampleWorkflow.nodes,
            connections: sampleWorkflow.connections,
            settings: sampleWorkflow.settings,
            createdById: admin.id
        }
    });

    // Create Public Workflow (No Group)
    const publicWorkflow = await prisma.workflow.create({
        data: {
            name: 'Public Example Workflow',
            description: 'Visible to everyone',
            createdById: admin.id,
            groupId: null, // Public
            nodes: [
                { id: '1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } },
                { id: '2', type: 'python', position: { x: 300, y: 100 }, data: { label: 'Process' } },
                { id: '3', type: 'end', position: { x: 500, y: 100 }, data: { label: 'End' } }
            ],
            connections: [
                { sourceNodeId: '1', targetNodeId: '2', id: 'e1-2' },
                { sourceNodeId: '2', targetNodeId: '3', id: 'e2-3' }
            ],
            version: 1
        }
    });
    console.log({ publicWorkflow });

    await prisma.workflowVersion.create({
        data: {
            workflowId: publicWorkflow.id,
            version: 1,
            nodes: publicWorkflow.nodes,
            connections: publicWorkflow.connections,
            settings: publicWorkflow.settings,
            createdById: admin.id
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
