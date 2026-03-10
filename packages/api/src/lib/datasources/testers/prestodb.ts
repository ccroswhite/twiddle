import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test PrestoDB connection
 */
export async function testPrestoDB(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 8080;
  const protocol = data.useTls ? 'https' : 'http';
  const connectionInfo = { host: data.host, port, protocol, user: data.username };

  try {
    // PrestoDB uses HTTP REST API
    const url = `${protocol}://${data.host}:${port}/v1/info`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (data.username) {
      headers['X-Presto-User'] = data.username;
    }
    if (data.password) {
      const auth = Buffer.from(`${data.username || ''}:${data.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const response = await fetch(url, { headers });

    if (response.ok) {
      const info = await response.json() as { nodeVersion?: { version?: string } };
      const version = info.nodeVersion?.version || 'Unknown';
      return {
        success: true,
        message: `Successfully connected to PrestoDB ${version}`,
        details: { version, connectionInfo },
      };
    } else {
      const details = { rawError: `HTTP ${response.status}`, connectionInfo };
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: `Authentication failed for ${data.host}:${port}.`, details };
      }
      return { success: false, message: `Server at ${data.host}:${port} returned status ${response.status}.`, details };
    }
  } catch (error) {
    const rawMessage = (error as Error).message || String(error);
    const details = { rawError: rawMessage, connectionInfo };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that PrestoDB is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}
