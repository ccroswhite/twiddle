import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test Redis/Valkey connection
 */
export async function testRedis(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 6379;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  const connectionInfo = { host: data.host, port, user: data.username };

  try {
    const { createClient } = await import('redis');

    // Build Redis URL - supports ACL auth with username:password
    let url: string;
    if (data.username && data.password) {
      // ACL authentication: redis://username:password@host:port
      url = `redis://${encodeURIComponent(data.username)}:${encodeURIComponent(data.password)}@${data.host}:${port}`;
    } else if (data.password) {
      // Legacy password-only auth: redis://:password@host:port
      url = `redis://:${encodeURIComponent(data.password)}@${data.host}:${port}`;
    } else {
      // No authentication
      url = `redis://${data.host}:${port}`;
    }

    const client = createClient({
      url,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: false, // Don't try to reconnect during test
      },
    });

    // Track errors but don't suppress them completely
    let connectionError: Error | null = null;
    client.on('error', (err) => { connectionError = err; });

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timed out after 10 seconds')), 10000);
    });

    // Race between connection and timeout
    try {
      await Promise.race([client.connect(), timeoutPromise]);
    } catch (connectError) {
      // If there was a connection error, use that for better messaging
      const error = connectionError || connectError;
      throw error;
    }

    const pong = await client.ping();
    const info = await client.info('server');
    await client.quit();

    // Extract Redis/Valkey version from info
    const versionMatch = info.match(/redis_version:([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      success: true,
      message: `Successfully connected to Redis/Valkey ${version}`,
      details: { ping: pong, version, connectionInfo },
    };
  } catch (error) {
    const err = error as Error;
    const rawMessage = err.message || String(error);
    const details = { rawError: rawMessage, connectionInfo };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that Redis/Valkey is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (rawMessage.includes('NOAUTH') || rawMessage.includes('AUTH') || rawMessage.includes('WRONGPASS')) {
      return { success: false, message: `Authentication failed for ${data.host}:${port}. Check password.`, details };
    }
    if (rawMessage.includes('timed out') || rawMessage.includes('timeout')) {
      return { success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}
