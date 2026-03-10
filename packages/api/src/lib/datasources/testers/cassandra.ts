import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test Cassandra connection
 */
export async function testCassandra(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 9042;

  try {
    const cassandra = await import('cassandra-driver');

    const authProvider = data.username && data.password
      ? new cassandra.auth.PlainTextAuthProvider(data.username, data.password)
      : undefined;

    const client = new cassandra.Client({
      contactPoints: [data.host],
      localDataCenter: 'datacenter1', // Default, may need to be configurable
      authProvider,
      protocolOptions: { port },
      socketOptions: {
        connectTimeout: 10000,
      },
    });

    await client.connect();
    const result = await client.execute('SELECT release_version FROM system.local');
    const version = result.rows[0]?.release_version || 'Unknown';
    await client.shutdown();

    return {
      success: true,
      message: `Successfully connected to Cassandra ${version}`,
      details: { version, connectionInfo: { host: data.host, port } },
    };
  } catch (error) {
    const err = error as Error;
    const rawMessage = err.message || String(error);
    const connectionInfo = { host: data.host, port, user: data.username };
    const details = { rawError: rawMessage, connectionInfo };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that Cassandra is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (rawMessage.includes('Authentication') || rawMessage.includes('credentials')) {
      return { success: false, message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}
