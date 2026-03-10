import { logger } from '../../logger.js';
import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test PostgreSQL connection
 */
export async function testPostgreSQL(data: DataSourceData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.port || 5432;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  try {
    const pg = await import('pg');
    const client = new pg.default.Client({
      host: data.host,
      port: port,
      database: data.database || 'postgres',
      user: data.username,
      password: data.password,
      ssl: data.useTls ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    const result = await client.query('SELECT version()');
    await client.end();

    const version = result.rows[0]?.version || 'Unknown version';
    // Extract just the PostgreSQL version part
    const versionMatch = version.match(/PostgreSQL [\d.]+/);

    return {
      success: true,
      message: `Successfully connected to ${versionMatch ? versionMatch[0] : 'PostgreSQL'}`,
      details: { version },
    };
  } catch (error) {
    const err = error as Error & { code?: string };
    const rawMessage = err.message || String(error);
    const code = err.code || '';

    const connectionInfo = {
      host: data.host,
      port,
      user: data.username,
      database: data.database || 'postgres',
    };

    logger.error({ rawMessage, code, error }, 'PostgreSQL connection error');

    const details = {
      errorCode: code,
      rawError: rawMessage,
      connectionInfo,
    };

    if (code === 'ECONNREFUSED' || rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that PostgreSQL is running.`, details };
    }
    if (code === 'ENOTFOUND' || rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (code === 'ETIMEDOUT' || rawMessage.includes('ETIMEDOUT') || rawMessage.includes('timeout')) {
      return { success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details };
    }
    if (rawMessage.includes('password authentication failed')) {
      return { success: false, message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`, details };
    }
    if (rawMessage.includes('does not exist')) {
      return { success: false, message: rawMessage, details };
    }
    if (code === 'ECONNRESET' || rawMessage.includes('ECONNRESET')) {
      return { success: false, message: `Connection reset by ${data.host}:${port}.`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}
