import { logger } from '../../logger.js';
import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test MongoDB connection
 */
export async function testMongo(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 27017;
  const connectionInfo = { host: data.host, port, database: data.database, user: data.username };

  try {
    const { MongoClient } = await import('mongodb');

    // Build connection URI
    let uri: string;
    if (data.username && data.password) {
      const encodedUser = encodeURIComponent(data.username);
      const encodedPassword = encodeURIComponent(data.password);
      uri = `mongodb://${encodedUser}:${encodedPassword}@${data.host}:${port}`;
    } else {
      uri = `mongodb://${data.host}:${port}`;
    }

    // Add database to URI if specified
    if (data.database) {
      uri += `/${data.database}`;
    }

    logger.info({ host: data.host, port, database: data.database, useTls: data.useTls }, 'MongoDB connection attempt');

    // Configure MongoDB client options
    const clientOptions: {
      serverSelectionTimeoutMS: number;
      connectTimeoutMS: number;
      tls?: boolean;
      tlsAllowInvalidCertificates?: boolean;
    } = {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    };

    // Add TLS options if enabled
    if (data.useTls) {
      clientOptions.tls = true;
      if (data.allowSelfSigned) {
        clientOptions.tlsAllowInvalidCertificates = true;
      }
    }

    const client = new MongoClient(uri, clientOptions);

    await client.connect();

    // Run a simple command to verify connection
    const admin = client.db('admin');
    const serverInfo = await admin.command({ serverStatus: 1 });

    // Get version info
    const version = serverInfo.version || 'unknown';
    const host = serverInfo.host || data.host;

    await client.close();

    logger.info({ version, host }, 'MongoDB connection successful');

    return {
      success: true,
      message: `Successfully connected to MongoDB ${version}`,
      details: {
        version,
        serverHost: host,
        connectionInfo,
      },
    };
  } catch (error) {
    const err = error as Error;
    const rawMessage = err.message || String(error);

    logger.error({ rawMessage, connectionInfo }, 'MongoDB connection error');

    const details = {
      rawError: rawMessage,
      connectionInfo,
    };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that MongoDB is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (rawMessage.includes('ETIMEDOUT') || rawMessage.includes('Server selection timed out')) {
      return { success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details };
    }
    if (rawMessage.includes('authentication failed') || rawMessage.includes('Authentication failed')) {
      return { success: false, message: `Authentication failed for ${data.host}:${port}. Check username and password.`, details };
    }
    if (rawMessage.includes('certificate') || rawMessage.includes('SSL') || rawMessage.includes('TLS') || rawMessage.includes('CERT_')) {
      return { success: false, message: `SSL/TLS certificate error for ${data.host}:${port}. Enable "Allow Self-Signed Certificates".`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}: ${rawMessage}`, details };
  }
}
