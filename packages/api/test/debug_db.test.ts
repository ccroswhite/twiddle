
import { describe, it } from 'vitest';
import { prisma, disconnectDatabase } from '../src/lib/prisma';

describe('Debug DB', () => {
    it('should list counts', async () => {
        const wfCount = await prisma.workflow.count();
        const userCount = await prisma.user.count();
        console.log(`DEBUG_COUNTS: Workflows=${wfCount}, Users=${userCount}`);
        await disconnectDatabase();
    });
});
