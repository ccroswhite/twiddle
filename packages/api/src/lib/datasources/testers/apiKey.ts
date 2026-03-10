import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test API Key
 */
export async function testApiKey(data: DataSourceData): Promise<TestResult> {
  if (!data.apiKey) {
    return { success: false, message: 'API Key is required' };
  }

  if (data.apiKey.length < 8) {
    return { success: false, message: 'API Key appears to be too short' };
  }

  return {
    success: true,
    message: 'API Key format is valid. Actual connectivity depends on the target service.',
  };
}
