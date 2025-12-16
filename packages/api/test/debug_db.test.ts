
import { describe, it } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Debug DB', () => {
    it('should list counts', async () => {
        const prisma = new PrismaClient();
        const wfCount = await prisma.workflow.count();
        const userCount = await prisma.user.count();
        console.log(`DEBUG_COUNTS: Workflows=${wfCount}, Users=${userCount}`);
        await prisma.$disconnect();
    });
});
