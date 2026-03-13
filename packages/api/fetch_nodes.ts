import { PrismaClient } from './src/generated/prisma/index.js';

const prisma = new PrismaClient();

async function main() {
    const wfs = await prisma.workflow.findMany({
        where: { name: { contains: 'Test' } },
        orderBy: { updatedAt: 'desc' },
        take: 1
    });

    if (wfs.length > 0) {
        console.log("Found workflow:", wfs[0].name);
        console.log("NODES:");
        console.log(JSON.stringify(wfs[0].nodes, null, 2));
        console.log("CONNECTIONS:");
        console.log(JSON.stringify(wfs[0].connections, null, 2));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
