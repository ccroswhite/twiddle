/**
 * GitHub Integration Service
 * Handles repository operations for workflow version control
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface GitHubCredentials {
  token: string; // Personal Access Token
  username?: string;
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
  localPath: string;
  workflowPath?: string; // Subdirectory for this workflow
}

export interface CommitResult {
  success: boolean;
  commitSha?: string;
  message?: string;
  error?: string;
}

/**
 * Get the base directory for storing cloned repositories
 */
function getReposBaseDir(): string {
  return process.env.GITHUB_REPOS_DIR || path.join(os.homedir(), '.twiddle', 'repos');
}

/**
 * Ensure the repos directory exists
 */
async function ensureReposDir(): Promise<string> {
  const baseDir = getReposBaseDir();
  await fs.mkdir(baseDir, { recursive: true });
  return baseDir;
}

/**
 * Get the local path for a repository
 */
export function getRepoLocalPath(owner: string, repo: string): string {
  return path.join(getReposBaseDir(), owner, repo);
}

/**
 * Configure git credentials for a repository
 */
async function configureGitCredentials(
  localPath: string,
  credentials: GitHubCredentials,
): Promise<void> {
  const username = credentials.username || 'git';
  
  // Set credential helper to store the token
  await execAsync(
    `git config credential.helper store`,
    { cwd: localPath },
  );
  
  // Configure user for commits
  await execAsync(
    `git config user.email "twiddle@localhost"`,
    { cwd: localPath },
  );
  await execAsync(
    `git config user.name "Twiddle"`,
    { cwd: localPath },
  );
  
  // Set the remote URL with token
  const remoteUrl = await execAsync('git remote get-url origin', { cwd: localPath });
  const repoMatch = remoteUrl.stdout.trim().match(/github\.com[:/](.+?)(?:\.git)?$/);
  if (repoMatch) {
    const repoPath = repoMatch[1].replace(/\.git$/, '');
    await execAsync(
      `git remote set-url origin https://${username}:${credentials.token}@github.com/${repoPath}.git`,
      { cwd: localPath },
    );
  }
}

/**
 * Check if a GitHub repository exists
 */
export async function checkRepoExists(
  owner: string,
  repo: string,
  credentials: GitHubCredentials,
): Promise<boolean> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Create a new GitHub repository
 */
export async function createGitHubRepo(
  owner: string,
  repo: string,
  credentials: GitHubCredentials,
  options: {
    description?: string;
    isPrivate?: boolean;
  } = {},
): Promise<{ success: boolean; error?: string; cloneUrl?: string }> {
  try {
    // Check if creating for user or organization
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    const userData = await userResponse.json() as { login: string };
    const isUserRepo = userData.login === owner;
    
    const endpoint = isUserRepo
      ? 'https://api.github.com/user/repos'
      : `https://api.github.com/orgs/${owner}/repos`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repo,
        description: options.description || 'Twiddle workflow repository',
        private: options.isPrivate ?? true,
        auto_init: true, // Initialize with README
      }),
    });
    
    if (!response.ok) {
      const error = await response.json() as { message: string };
      return { success: false, error: error.message };
    }
    
    const repoData = await response.json() as { clone_url: string };
    return { success: true, cloneUrl: repoData.clone_url };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Clone a GitHub repository to local filesystem
 */
export async function cloneRepo(
  owner: string,
  repo: string,
  credentials: GitHubCredentials,
  branch = 'main',
): Promise<{ success: boolean; localPath?: string; error?: string }> {
  try {
    await ensureReposDir();
    const localPath = getRepoLocalPath(owner, repo);
    
    // Check if already cloned
    try {
      await fs.access(path.join(localPath, '.git'));
      // Already exists, pull latest
      await configureGitCredentials(localPath, credentials);
      await execAsync(`git fetch origin`, { cwd: localPath });
      await execAsync(`git checkout ${branch}`, { cwd: localPath });
      await execAsync(`git pull origin ${branch}`, { cwd: localPath });
      return { success: true, localPath };
    } catch {
      // Not cloned yet, proceed with clone
    }
    
    // Create parent directory
    await fs.mkdir(path.dirname(localPath), { recursive: true });
    
    // Clone the repository
    const username = credentials.username || 'git';
    const cloneUrl = `https://${username}:${credentials.token}@github.com/${owner}/${repo}.git`;
    
    await execAsync(`git clone -b ${branch} ${cloneUrl} "${localPath}"`);
    await configureGitCredentials(localPath, credentials);
    
    return { success: true, localPath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Write workflow files to the repository
 */
export async function writeWorkflowFiles(
  localPath: string,
  workflowPath: string,
  files: Record<string, string>,
): Promise<void> {
  const fullPath = path.join(localPath, workflowPath);
  await fs.mkdir(fullPath, { recursive: true });
  
  for (const [filename, content] of Object.entries(files)) {
    await fs.writeFile(path.join(fullPath, filename), content, 'utf-8');
  }
}

/**
 * Commit and push changes to GitHub
 */
export async function commitAndPush(
  localPath: string,
  message: string,
  branch = 'main',
): Promise<CommitResult> {
  try {
    // Add all changes
    await execAsync('git add -A', { cwd: localPath });
    
    // Check if there are changes to commit
    const { stdout: status } = await execAsync('git status --porcelain', { cwd: localPath });
    if (!status.trim()) {
      return { success: true, message: 'No changes to commit' };
    }
    
    // Commit
    await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: localPath });
    
    // Get commit SHA
    const { stdout: sha } = await execAsync('git rev-parse HEAD', { cwd: localPath });
    
    // Push
    await execAsync(`git push origin ${branch}`, { cwd: localPath });
    
    return {
      success: true,
      commitSha: sha.trim(),
      message: `Committed and pushed: ${sha.trim().substring(0, 7)}`,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get the current commit SHA
 */
export async function getCurrentCommitSha(localPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git rev-parse HEAD', { cwd: localPath });
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Pull latest changes from remote
 */
export async function pullLatest(
  localPath: string,
  branch = 'main',
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`git pull origin ${branch}`, { cwd: localPath });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get commit history for a path
 */
export async function getCommitHistory(
  localPath: string,
  filePath?: string,
  limit = 10,
): Promise<Array<{ sha: string; message: string; date: string; author: string }>> {
  try {
    const pathArg = filePath ? `-- "${filePath}"` : '';
    const { stdout } = await execAsync(
      `git log -${limit} --pretty=format:"%H|%s|%ai|%an" ${pathArg}`,
      { cwd: localPath },
    );
    
    return stdout.split('\n').filter(Boolean).map(line => {
      const [sha, message, date, author] = line.split('|');
      return { sha, message, date, author };
    });
  } catch {
    return [];
  }
}

/**
 * Initialize a new local repository and push to GitHub
 */
export async function initAndPushRepo(
  owner: string,
  repo: string,
  credentials: GitHubCredentials,
  initialFiles: Record<string, string>,
  options: {
    description?: string;
    isPrivate?: boolean;
    branch?: string;
  } = {},
): Promise<{ success: boolean; localPath?: string; error?: string }> {
  const branch = options.branch || 'main';
  
  // Create the GitHub repo first
  const createResult = await createGitHubRepo(owner, repo, credentials, options);
  if (!createResult.success) {
    return { success: false, error: createResult.error };
  }
  
  // Wait a moment for GitHub to initialize the repo
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clone the repo
  const cloneResult = await cloneRepo(owner, repo, credentials, branch);
  if (!cloneResult.success || !cloneResult.localPath) {
    return { success: false, error: cloneResult.error };
  }
  
  // Write initial files
  await writeWorkflowFiles(cloneResult.localPath, '', initialFiles);
  
  // Commit and push
  const commitResult = await commitAndPush(
    cloneResult.localPath,
    'Initial workflow commit from Twiddle',
    branch,
  );
  
  if (!commitResult.success) {
    return { success: false, error: commitResult.error };
  }
  
  return { success: true, localPath: cloneResult.localPath };
}
