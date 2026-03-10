import { logger } from '../../logger.js';
import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test MySQL connection
 */
export async function testMySQL(data: DataSourceData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.port || 3306;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  logger.info({
    host: data.host,
    port,
    user: data.username,
    database: data.database || '(none)',
    useTls: !!data.useTls
  }, 'MySQL connection attempt');

  try {
    const mysql = await import('mysql2/promise');

    const connectionConfig = {
      host: data.host,
      port: port,
      user: data.username,
      password: data.password,
      database: data.database || undefined,
      connectTimeout: 10000,
      ssl: data.useTls ? { rejectUnauthorized: false } : undefined,
    };

    logger.debug({ config: { ...connectionConfig, password: '***' } }, 'MySQL connection config');

    const connection = await mysql.createConnection(connectionConfig);

    const [rows] = await connection.query('SELECT VERSION() as version');
    await connection.end();

    const version = (rows as Array<{ version: string }>)[0]?.version || 'Unknown';

    logger.info({ version }, 'MySQL connection successful');

    return {
      success: true,
      message: `Successfully connected to MySQL ${version}`,
      details: { version },
    };
  } catch (error) {
    const err = error as Error & { code?: string; errno?: number; sqlState?: string; sqlMessage?: string };
    const rawMessage = err.message || String(error);
    const code = err.code || '';

    const connectionInfo = {
      host: data.host,
      port,
      user: data.username,
      database: data.database,
    };

    logger.error({
      rawMessage,
      code,
      errno: err.errno,
      sqlState: err.sqlState,
      sqlMessage: err.sqlMessage,
      stack: err.stack,
      error
    }, 'MySQL connection error');

    // Create base details object for all errors
    const details = {
      errorCode: code,
      rawError: rawMessage,
      connectionInfo,
      errno: err.errno,
      sqlState: err.sqlState,
    };

    // Return user-friendly message with full details
    if (code === 'ECONNREFUSED' || rawMessage.includes('ECONNREFUSED')) {
      return {
        success: false,
        message: `Connection refused to ${data.host}:${port}. Check that MySQL is running.`,
        details,
      };
    }
    if (code === 'ENOTFOUND' || rawMessage.includes('ENOTFOUND')) {
      return {
        success: false,
        message: `Host not found: ${data.host}`,
        details,
      };
    }
    if (code === 'ER_ACCESS_DENIED_ERROR' || rawMessage.includes('Access denied')) {
      return {
        success: false,
        message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`,
        details,
      };
    }
    if (code === 'ETIMEDOUT' || rawMessage.includes('ETIMEDOUT')) {
      return {
        success: false,
        message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`,
        details,
      };
    }
    if (code === 'ECONNRESET' || rawMessage.includes('ECONNRESET')) {
      return {
        success: false,
        message: `Connection reset by ${data.host}:${port}. Try enabling TLS or check server configuration.`,
        details,
      };
    }
    if (code === 'ER_NOT_SUPPORTED_AUTH_MODE' || rawMessage.includes('caching_sha2_password')) {
      return {
        success: false,
        message: `Authentication plugin not supported. Try using mysql_native_password or enabling TLS.`,
        details,
      };
    }
    // For any other error
    return {
      success: false,
      message: `Connection failed to ${data.host}:${port}.`,
      details,
    };
  }
}
