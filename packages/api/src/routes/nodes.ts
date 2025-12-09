import type { FastifyPluginAsync } from 'fastify';
import { getAllNodeDefinitions, getNodeDefinition, getNodeTypeInfoList } from '@twiddle/nodes';

export const nodeRoutes: FastifyPluginAsync = async (app) => {
  // List all available node types
  app.get('/', async () => {
    return getNodeTypeInfoList();
  });

  // Get full node definition
  app.get('/:type', async (request, reply) => {
    const { type } = request.params as { type: string };

    const definition = getNodeDefinition(type);
    if (!definition) {
      return reply.status(404).send({ error: 'Node type not found' });
    }

    return definition;
  });

  // Get all node definitions (full details)
  app.get('/definitions/all', async () => {
    return getAllNodeDefinitions();
  });

  // Search nodes by category
  app.get('/category/:category', async (request) => {
    const { category } = request.params as { category: string };

    const allNodes = getNodeTypeInfoList();
    return allNodes.filter((node) => node.category === category);
  });

  // Search nodes by name
  app.get('/search/:query', async (request) => {
    const { query } = request.params as { query: string };
    const lowerQuery = query.toLowerCase();

    const allNodes = getNodeTypeInfoList();
    return allNodes.filter(
      (node) =>
        node.displayName.toLowerCase().includes(lowerQuery) ||
        node.description.toLowerCase().includes(lowerQuery),
    );
  });
};
