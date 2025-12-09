import { useState, useEffect } from 'react';
import { Github, Link2, Unlink, ExternalLink, GitBranch, FolderGit2 } from 'lucide-react';
import { githubApi, credentialsApi } from '@/lib/api';

interface GitHubSettingsProps {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}

interface Credential {
  id: string;
  name: string;
  type: string;
}

interface GitHubStatus {
  connected: boolean;
  repo?: string;
  branch?: string;
  path?: string;
  localPath?: string;
  lastCommitSha?: string;
  repoUrl?: string;
}

export function GitHubSettings({ workflowId, workflowName, onClose }: GitHubSettingsProps) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedCredential, setSelectedCredential] = useState('');
  const [repoMode, setRepoMode] = useState<'new' | 'existing'>('new');
  const [owner, setOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [isPrivate, setIsPrivate] = useState(true);

  useEffect(() => {
    loadData();
  }, [workflowId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load GitHub status
      const statusData = await githubApi.getStatus(workflowId);
      setStatus(statusData);

      // Load GitHub credentials
      const allCreds = await credentialsApi.list();
      const githubCreds = allCreds.filter((c: Credential) => c.type === 'github');
      setCredentials(githubCreds);

      // Set default repo name from workflow name
      if (!repoName) {
        setRepoName(workflowName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!selectedCredential || !owner || !repoName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (repoMode === 'new') {
        // Create new repo and initialize with workflow
        const result = await githubApi.initRepo({
          owner,
          repo: repoName,
          credentialId: selectedCredential,
          workflowId,
          description: `Twiddle workflow: ${workflowName}`,
          isPrivate,
          branch,
        });

        if (!result.success) {
          setError(result.error || 'Failed to create repository');
          return;
        }
      } else {
        // Connect to existing repo
        const result = await githubApi.connectRepo({
          workflowId,
          owner,
          repo: repoName,
          credentialId: selectedCredential,
          branch,
        });

        if (!result.success) {
          setError(result.error || 'Failed to connect to repository');
          return;
        }
      }

      // Reload status
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect from GitHub?')) return;

    try {
      setSaving(true);
      await githubApi.disconnectRepo(workflowId);
      await loadData();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-slate-900">GitHub Integration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {status?.connected ? (
            // Connected state
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <Link2 className="w-4 h-4" />
                  Connected to GitHub
                </div>
                <div className="space-y-2 text-sm text-green-600">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4" />
                    <a
                      href={status.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      {status.repo}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    {status.branch}
                  </div>
                  {status.lastCommitSha && (
                    <div className="text-xs text-green-500">
                      Last commit: {status.lastCommitSha.substring(0, 7)}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-500">
                Saving this workflow will automatically commit changes to GitHub.
              </p>

              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <Unlink className="w-4 h-4" />
                Disconnect from GitHub
              </button>
            </div>
          ) : (
            // Not connected state
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  GitHub Credential
                </label>
                {credentials.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No GitHub credentials found.{' '}
                    <a href="/credentials" className="text-primary-600 hover:underline">
                      Add one first
                    </a>
                  </p>
                ) : (
                  <select
                    value={selectedCredential}
                    onChange={(e) => setSelectedCredential(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select credential...</option>
                    {credentials.map((cred) => (
                      <option key={cred.id} value={cred.id}>
                        {cred.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Repository
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setRepoMode('new')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      repoMode === 'new'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Create New
                  </button>
                  <button
                    onClick={() => setRepoMode('existing')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      repoMode === 'existing'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Use Existing
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Owner / Organization
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="my-workflow"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Branch
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {repoMode === 'new' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-slate-700">
                    Private repository
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {!status?.connected && credentials.length > 0 && (
            <button
              onClick={handleConnect}
              disabled={saving || !selectedCredential || !owner || !repoName}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              <Github className="w-4 h-4" />
              {saving ? 'Connecting...' : repoMode === 'new' ? 'Create & Connect' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
