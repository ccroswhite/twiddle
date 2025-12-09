/**
 * GitHub Integration Routes
 * API endpoints for GitHub repository operations
 */
import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  checkRepoExists,
  createGitHubRepo,
  cloneRepo,
  initAndPushRepo,
  type GitHubCredentials,
} from '../lib/github.js';

export const githubRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Validate GitHub credentials
   */
  app.post<{
    Body: { token: string };
  }>('/validate', async (request, reply) => {
    const { token } = request.body;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return reply.status(401).send({ valid: false, error: 'Invalid token' });
      }

      const user = await response.json() as { login: string; name: string; avatar_url: string };
      return {
        valid: true,
        user: {
          login: user.login,
          name: user.name,
          avatarUrl: user.avatar_url,
        },
      };
    } catch (err) {
      return reply.status(500).send({ valid: false, error: (err as Error).message });
    }
  });

  /**
   * Check if a repository exists
   */
  app.get<{
    Querystring: { owner: string; repo: string; credentialId: string };
  }>('/repos/check', async (request, reply) => {
    const { owner, repo, credentialId } = request.query;

    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== 'github') {
      return reply.status(400).send({ error: 'Invalid GitHub credential' });
    }

    const credData = credential.data as { token: string };
    const exists = await checkRepoExists(owner, repo, { token: credData.token });

    return { exists, owner, repo };
  });

  /**
   * Create a new GitHub repository
   */
  app.post<{
    Body: {
      owner: string;
      repo: string;
      credentialId: string;
      description?: string;
      isPrivate?: boolean;
    };
  }>('/repos/create', async (request, reply) => {
    const { owner, repo, credentialId, description, isPrivate } = request.body;

    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== 'github') {
      return reply.status(400).send({ error: 'Invalid GitHub credential' });
    }

    const credData = credential.data as { token: string; username?: string };
    const credentials: GitHubCredentials = {
      token: credData.token,
      username: credData.username,
    };

    const result = await createGitHubRepo(owner, repo, credentials, {
      description,
      isPrivate,
    });

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return {
      success: true,
      cloneUrl: result.cloneUrl,
      repoUrl: `https://github.com/${owner}/${repo}`,
    };
  });

  /**
   * Clone a repository to local filesystem
   */
  app.post<{
    Body: {
      owner: string;
      repo: string;
      credentialId: string;
      branch?: string;
    };
  }>('/repos/clone', async (request, reply) => {
    const { owner, repo, credentialId, branch = 'main' } = request.body;

    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== 'github') {
      return reply.status(400).send({ error: 'Invalid GitHub credential' });
    }

    const credData = credential.data as { token: string; username?: string };
    const credentials: GitHubCredentials = {
      token: credData.token,
      username: credData.username,
    };

    const result = await cloneRepo(owner, repo, credentials, branch);

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    return {
      success: true,
      localPath: result.localPath,
    };
  });

  /**
   * Initialize a new repository with workflow files
   */
  app.post<{
    Body: {
      owner: string;
      repo: string;
      credentialId: string;
      workflowId: string;
      description?: string;
      isPrivate?: boolean;
      branch?: string;
    };
  }>('/repos/init', async (request, reply) => {
    const { owner, repo, credentialId, workflowId, description, isPrivate, branch = 'main' } = request.body;

    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== 'github') {
      return reply.status(400).send({ error: 'Invalid GitHub credential' });
    }

    // Get workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    if (!workflow.pythonWorkflow) {
      return reply.status(400).send({ error: 'Workflow has no generated Python code. Save the workflow first.' });
    }

    const credData = credential.data as { token: string; username?: string };
    const credentials: GitHubCredentials = {
      token: credData.token,
      username: credData.username,
    };

    // Prepare workflow files
    const files: Record<string, string> = {
      'workflow.py': workflow.pythonWorkflow,
      'activities.py': workflow.pythonActivities || '',
      'worker.py': workflow.pythonWorker || '',
      'requirements.txt': workflow.pythonRequirements || '',
      'README.md': `# ${workflow.name}\n\n${workflow.description || 'A Twiddle workflow.'}\n\nGenerated by Twiddle.`,
      '.gitignore': `__pycache__/\n*.py[cod]\n*$py.class\n.env\nvenv/\n.venv/\n`,
    };

    const result = await initAndPushRepo(owner, repo, credentials, files, {
      description: description || `Twiddle workflow: ${workflow.name}`,
      isPrivate,
      branch,
    });

    if (!result.success) {
      return reply.status(400).send({ error: result.error });
    }

    // Update workflow with GitHub settings
    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        githubRepo: `${owner}/${repo}`,
        githubBranch: branch,
        githubPath: '',
        localPath: result.localPath,
        githubCredentialId: credentialId,
      },
    });

    return {
      success: true,
      localPath: result.localPath,
      repoUrl: `https://github.com/${owner}/${repo}`,
    };
  });

  /**
   * Connect an existing repository to a workflow
   */
  app.post<{
    Body: {
      workflowId: string;
      owner: string;
      repo: string;
      credentialId: string;
      branch?: string;
      path?: string;
    };
  }>('/repos/connect', async (request, reply) => {
    const { workflowId, owner, repo, credentialId, branch = 'main', path = '' } = request.body;

    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== 'github') {
      return reply.status(400).send({ error: 'Invalid GitHub credential' });
    }

    const credData = credential.data as { token: string; username?: string };
    const credentials: GitHubCredentials = {
      token: credData.token,
      username: credData.username,
    };

    // Check if repo exists
    const exists = await checkRepoExists(owner, repo, credentials);
    if (!exists) {
      return reply.status(404).send({ error: 'Repository not found' });
    }

    // Clone the repository
    const cloneResult = await cloneRepo(owner, repo, credentials, branch);
    if (!cloneResult.success) {
      return reply.status(400).send({ error: cloneResult.error });
    }

    // Update workflow with GitHub settings
    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        githubRepo: `${owner}/${repo}`,
        githubBranch: branch,
        githubPath: path,
        localPath: cloneResult.localPath,
        githubCredentialId: credentialId,
      },
    });

    return {
      success: true,
      localPath: cloneResult.localPath,
      workflow,
    };
  });

  /**
   * Disconnect GitHub from a workflow
   */
  app.post<{
    Body: { workflowId: string };
  }>('/repos/disconnect', async (request, _reply) => {
    const { workflowId } = request.body;

    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        githubRepo: null,
        githubBranch: null,
        githubPath: null,
        localPath: null,
        githubCredentialId: null,
        lastCommitSha: null,
      },
    });

    return { success: true, workflow };
  });

  /**
   * Get GitHub status for a workflow
   */
  app.get<{
    Params: { workflowId: string };
  }>('/workflows/:workflowId/status', async (request, reply) => {
    const { workflowId } = request.params;

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      return reply.status(404).send({ error: 'Workflow not found' });
    }

    if (!workflow.githubRepo) {
      return {
        connected: false,
      };
    }

    return {
      connected: true,
      repo: workflow.githubRepo,
      branch: workflow.githubBranch,
      path: workflow.githubPath,
      localPath: workflow.localPath,
      lastCommitSha: workflow.lastCommitSha,
      repoUrl: `https://github.com/${workflow.githubRepo}`,
    };
  });

  /**
   * List user's GitHub repositories
   */
  app.get<{
    Querystring: { credentialId: string };
  }>('/repos', async (request, reply) => {
    const { credentialId } = request.query;

    // Get credentials
    const credential = await prisma.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential || credential.type !== 'github') {
      return reply.status(400).send({ error: 'Invalid GitHub credential' });
    }

    const credData = credential.data as { token: string };

    try {
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          Authorization: `Bearer ${credData.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return reply.status(400).send({ error: 'Failed to fetch repositories' });
      }

      const repos = await response.json() as Array<{
        full_name: string;
        name: string;
        private: boolean;
        description: string;
        default_branch: string;
        html_url: string;
      }>;

      return repos.map(r => ({
        fullName: r.full_name,
        name: r.name,
        isPrivate: r.private,
        description: r.description,
        defaultBranch: r.default_branch,
        url: r.html_url,
      }));
    } catch (err) {
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
};
