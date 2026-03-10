import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load environment variables from the workspace root
dotenv.config({ path: path.join(import.meta.dirname, '../../.env') });

export default defineConfig({
    schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
    datasource: {
        url: process.env.DATABASE_URL
    }
});
