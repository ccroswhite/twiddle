/**
 * Twiddle API Server
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { workflowRoutes } from './routes/workflows.js';
import { promotionRoutes } from './routes/promotions.js';
import { nodeRoutes } from './routes/nodes.js';
import { credentialRoutes } from './routes/credentials.js';
import { authRoutes } from './routes/auth.js';
import { localAuthRoutes } from './routes/localAuth.js';
import { groupRoutes } from './routes/groups.js';
import { userRoutes } from './routes/users.js';
import { githubRoutes } from './routes/github.js';
import { settingsRoutes } from './routes/settings.js';
import { folderRoutes } from './routes/folders.js';
import { getAuthConfig, optionalAuthMiddleware } from './lib/auth.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  const app = Fastify({
    logger: true,
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Twiddle API',
        description: 'Python Temporal workflow generator',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development server',
        },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Add authentication middleware to all API routes (except auth routes)
  // This sets request.user if a valid session exists
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth middleware for auth routes and health check
    if (request.url.startsWith('/api/auth') || request.url === '/health' || request.url.startsWith('/docs')) {
      return;
    }
    await optionalAuthMiddleware(request, reply);
  });

  // Register routes
  await app.register(localAuthRoutes, { prefix: '/api/auth/local' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(workflowRoutes, { prefix: '/api/workflows' });
  await app.register(promotionRoutes, { prefix: '/api/promotions' });
  await app.register(nodeRoutes, { prefix: '/api/nodes' });
  await app.register(credentialRoutes, { prefix: '/api/credentials' });
  await app.register(groupRoutes, { prefix: '/api/groups' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(githubRoutes, { prefix: '/api/github' });
  await app.register(settingsRoutes, { prefix: '/api/settings' });
  await app.register(folderRoutes, { prefix: '/api/folders' });

  // Log auth status
  const authConfig = getAuthConfig();
  if (authConfig.enabled) {
    console.log(`Authentication enabled: ${authConfig.provider}`);
  } else {
    console.log('Local authentication enabled');
  }

  // Start server
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Twiddle API server running at http://${HOST}:${PORT}`);
    console.log(`API documentation available at http://${HOST}:${PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
