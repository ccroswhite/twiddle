
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { localAuthRoutes } from '../src/routes/localAuth';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

describe('Local Auth Integration', () => {
    const app = Fastify();

    // Register the routes
    // Note: We need to register with the prefix expected by the internal logic if any, 
    // but here we are unit testing the plugin registration effectively.
    // The real app registers it with prefix '/api/auth/local'.
    // If the plugin uses relative paths, we can mount it at root for testing.
    app.register(localAuthRoutes);

    const testUser = {
        email: 'integration-test-trim@twiddle.com',
        password: 'password123',
        name: 'Integration Test User'
    };

    beforeAll(async () => {
        // cleanup just in case
        await prisma.user.deleteMany({
            where: { email: testUser.email }
        });

        // Create user
        const hashed = await hashPassword(testUser.password);
        await prisma.user.create({
            data: {
                email: testUser.email,
                password: hashed,
                name: testUser.name,
                provider: 'local',
                isActive: true
            }
        });
    });

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { email: testUser.email }
        });
        await prisma.$disconnect();
    });

    it('should successfully login with untrimmed credentials (whitespace)', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/login', // Mounted at root of this fastify instance
            payload: {
                email: `  ${testUser.email}  `,
                password: `  ${testUser.password}  `,
            },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.success).toBe(true);
        expect(body.user.email).toBe(testUser.email);
    });

    it('should fail with incorrect password', async () => {
        const response = await app.inject({
            method: 'POST',
            url: '/login',
            payload: {
                email: testUser.email,
                password: 'wrongpassword',
            },
        });

        expect(response.statusCode).toBe(401);
    });
});
