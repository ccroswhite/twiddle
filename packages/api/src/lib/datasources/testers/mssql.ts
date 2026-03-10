import { logger } from '../../logger.js';
import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test MS SQL Server connection
 */
export async function testMSSQL(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 1433;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  // Determine authentication type from UI selector (stored in 'role' field)
  const authTypeSelection = data.role as string | undefined;
  const useEntraId = authTypeSelection === 'entra';
  const useWindowsAuth = authTypeSelection === 'windows';
  const useSqlAuth = authTypeSelection === 'sql' || !authTypeSelection;

  // Validate required fields based on auth type
  if (useEntraId && (!data.tenantId || !data.clientId || !data.clientSecret)) {
    return { success: false, message: 'Entra ID authentication requires Tenant ID, Client ID, and Client Secret.' };
  }
  if (useWindowsAuth && (!data.domain || !data.username || !data.password)) {
    return { success: false, message: 'Windows authentication requires Domain, Username, and Password.' };
  }
  if (useSqlAuth && (!data.username || !data.password)) {
    return { success: false, message: 'SQL Server authentication requires Username and Password.' };
  }

  const authType = useEntraId ? 'Entra ID' : useWindowsAuth ? 'Windows' : 'SQL Server';

  logger.info({
    host: data.host,
    port,
    database: data.database,
    authType,
    domain: data.domain,
    username: data.username,
    hasEntraCredentials: useEntraId,
  }, 'MSSQL connection attempt');

  try {
    const sql = await import('mssql');

    // Build base config
    const config: Parameters<typeof sql.default.connect>[0] = {
      server: data.host,
      port: port,
      database: data.database || 'master',
      options: {
        encrypt: data.useTls ?? false,
        trustServerCertificate: data.allowSelfSigned ?? true,
      },
      connectionTimeout: 10000,
      requestTimeout: 10000,
    };

    if (useEntraId) {
      // Azure Entra ID Authentication
      config.authentication = {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          tenantId: data.tenantId!,
          clientId: data.clientId!,
          clientSecret: data.clientSecret!,
        },
      };
    } else if (useWindowsAuth) {
      // Windows/Domain Authentication
      config.user = data.username;
      config.password = data.password;
      config.domain = data.domain;
    } else {
      // SQL Server Authentication
      config.user = data.username;
      config.password = data.password;
    }

    const pool = await sql.default.connect(config);
    const result = await pool.query('SELECT @@VERSION as version');
    await pool.close();

    const version = result.recordset[0]?.version || 'Unknown';
    // Extract just the version line
    const versionLine = version.split('\n')[0];

    return {
      success: true,
      message: `Successfully connected via ${authType} Auth to ${versionLine.substring(0, 50)}...`,
      details: {
        version: versionLine,
        authType,
        connectionInfo: { host: data.host, port, database: data.database || 'master' },
      },
    };
  } catch (error) {
    const err = error as Error & { code?: string };
    const rawMessage = err.message || String(error);
    const code = err.code || '';

    const connectionInfo = {
      host: data.host,
      port,
      user: data.username,
      database: data.database || 'master',
      authType,
    };

    const details = {
      errorCode: code,
      rawError: rawMessage,
      connectionInfo,
    };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that SQL Server is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (rawMessage.includes('Login failed')) {
      return { success: false, message: `${authType} authentication failed for ${data.host}:${port}.`, details };
    }
    if (rawMessage.includes('ETIMEDOUT')) {
      return { success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details };
    }
    if (rawMessage.includes('AADSTS') || rawMessage.includes('tenant') || rawMessage.includes('client')) {
      return { success: false, message: `Entra ID authentication error: ${rawMessage.substring(0, 100)}`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}: ${rawMessage.substring(0, 100)}`, details };
  }
}
