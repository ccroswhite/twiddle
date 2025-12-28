/**
 * Workflow Routes
 * 
 * This file serves as the entry point that composes all workflow route modules.
 * Individual route implementations are in the ./workflows/ directory:
 * - crud.ts: List, Get, Create, Update, Delete
 * - lock.ts: Lock acquisition, refresh, request, resolve, unlock
 * - promotion.ts: Promote/Demote between environments
 * - export.ts: Export to Python/Temporal, Airflow, IR
 * - versions.ts: Version history
 * - import.ts: Import from exported JSON
 */
import type { FastifyPluginAsync } from 'fastify';
import {
  crudRoutes,
  lockRoutes,
  promotionRoutes,
  exportRoutes,
  versionRoutes,
  importRoutes,
} from './workflows/index.js';

/**
 * Combined workflow routes plugin
 * Registers all workflow-related routes under the workflows prefix
 */
export const workflowRoutes: FastifyPluginAsync = async (app) => {
  // Register all route modules
  // Note: Order matters for route matching. More specific routes should be registered first.

  // CRUD operations (/, /:id)
  await app.register(crudRoutes);

  // Locking operations (/:id/lock, /:id/lock/request, /:id/lock/resolve, /:id/unlock)
  await app.register(lockRoutes);

  // Promotion operations (/:id/promote, /:id/demote)
  await app.register(promotionRoutes);

  // Export operations (/:id/export/python, /:id/export/airflow, /:id/export/ir)
  await app.register(exportRoutes);

  // Version operations (/:id/versions, /:id/versions/:versionId)
  await app.register(versionRoutes);

  // Import operations (/import)
  await app.register(importRoutes);
};
