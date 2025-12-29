import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
    schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
    migrate: {
        schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
        url: process.env.DATABASE_URL,
        seed: 'tsx prisma/seed.ts',
    },
});
