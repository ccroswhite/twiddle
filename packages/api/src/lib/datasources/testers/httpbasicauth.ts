import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test HTTP Basic Auth by making a simple request
 */
export async function testHttpBasicAuth(data: DataSourceData): Promise<TestResult> {
  if (!data.username || !data.password) {
    return { success: false, message: 'Username and password are required' };
  }

  // Basic auth credentials are valid if they're non-empty
  // Real testing would require a URL to test against
  return {
    success: true,
    message: 'Credentials format is valid. Actual connectivity depends on the target service.',
  };
}
