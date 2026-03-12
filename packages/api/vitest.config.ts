import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the root `.env` for testing
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: [],
    },
});
