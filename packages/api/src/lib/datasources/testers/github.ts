import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test GitHub credentials by calling the GitHub API
 */
export async function testGitHub(data: DataSourceData): Promise<TestResult> {
  if (!data.token) {
    return { success: false, message: 'Personal Access Token is required' };
  }

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${data.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Twiddle-Credential-Test',
      },
    });

    if (response.ok) {
      const user = await response.json() as { login: string; name: string };
      return {
        success: true,
        message: `Successfully authenticated as ${user.login}`,
        details: { login: user.login, name: user.name },
      };
    } else if (response.status === 401) {
      return { success: false, message: 'Invalid or expired token' };
    } else {
      return { success: false, message: `GitHub API returned status ${response.status}` };
    }
  } catch (error) {
    return { success: false, message: `Failed to connect to GitHub: ${(error as Error).message}` };
  }
}
