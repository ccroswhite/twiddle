/**
 * Data Source testing utilities
 * Tests connectivity for various data source types
 */
import { logger } from './logger.js';


interface DataSourceData {
  // Common fields
  username?: string;
  password?: string;
  host?: string;
  port?: number;
  database?: string;
  token?: string;
  apiKey?: string;
  useTls?: boolean;
  // SSH specific
  privateKey?: string;
  passphrase?: string;
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  // Snowflake
  account?: string;
  warehouse?: string;
  role?: string;
  // WinRM
  domain?: string;
  useHttps?: boolean;
  // SSL/TLS options
  allowSelfSigned?: boolean;
  skipHostnameVerification?: boolean;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Test data source connectivity based on type
 */
export async function testDataSource(type: string, data: DataSourceData): Promise<TestResult> {
  try {
    switch (type) {
      case 'httpBasicAuth':
        return testHttpBasicAuth(data);
      case 'httpBearerToken':
        return testHttpBearerToken(data);
      case 'apiKey':
        return testApiKey(data);
      case 'githubDatasource':
        return testGitHub(data);
      case 'postgresqlDatasource':
        return testPostgreSQL(data);
      case 'mysqlDatasource':
        return testMySQL(data);
      case 'mssqlDatasource':
        return testMSSQL(data);
      case 'redisDatasource':
      case 'valkeyDatasource':
        return testRedis(data);
      case 'sshDatasource':
        return testSSH(data);
      case 'opensearchDatasource':
      case 'elasticsearchDatasource':
        return testElasticsearch(data);
      case 'cassandraDatasource':
        return testCassandra(data);
      case 'oracleDatasource':
        return testOracle(data);
      case 'snowflakeDatasource':
        return testSnowflake(data);
      case 'prestodbDatasource':
        return testPrestoDB(data);
      case 'winrmDatasource':
        return testWinRM(data);
      default:
        return {
          success: false,
          message: `Testing not implemented for credential type: ${type}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Test failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Test HTTP Basic Auth by making a simple request
 */
async function testHttpBasicAuth(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test HTTP Bearer Token
 */
async function testHttpBearerToken(data: DataSourceData): Promise<TestResult> {
  if (!data.token) {
    return { success: false, message: 'Token is required' };
  }

  // Check token format (basic validation)
  if (data.token.length < 10) {
    return { success: false, message: 'Token appears to be too short' };
  }

  return {
    success: true,
    message: 'Token format is valid. Actual connectivity depends on the target service.',
  };
}

/**
 * Test API Key
 */
async function testApiKey(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test GitHub credentials by calling the GitHub API
 */
async function testGitHub(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test PostgreSQL connection
 */
async function testPostgreSQL(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test MySQL connection
 */
async function testMySQL(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test MS SQL Server connection
 */
async function testMSSQL(data: DataSourceData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.port || 1433;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  try {
    const sql = await import('mssql');

    const config = {
      server: data.host,
      port: port,
      user: data.username,
      password: data.password,
      database: data.database || 'master',
      options: {
        encrypt: data.useTls ?? false,
        trustServerCertificate: true,
      },
      connectionTimeout: 10000,
      requestTimeout: 10000,
    } satisfies Parameters<typeof sql.default.connect>[0];

    const pool = await sql.default.connect(config);
    const result = await pool.query('SELECT @@VERSION as version');
    await pool.close();

    const version = result.recordset[0]?.version || 'Unknown';
    // Extract just the version line
    const versionLine = version.split('\n')[0];

    return {
      success: true,
      message: `Successfully connected to ${versionLine.substring(0, 50)}...`,
      details: { version: versionLine },
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
      return { success: false, message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`, details };
    }
    if (rawMessage.includes('ETIMEDOUT')) {
      return { success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}

/**
 * Test Redis/Valkey connection
 */
async function testRedis(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test SSH connection
 */
async function testSSH(data: DataSourceData): Promise<TestResult> {
  if (!data.host || !data.username) {
    return { success: false, message: 'Host and username are required' };
  }

  if (!data.password && !data.privateKey) {
    return { success: false, message: 'Either password or private key is required' };
  }

  const port = data.port || 22;

  const connectionInfo = {
    host: data.host,
    port,
    user: data.username,
    authMethod: data.privateKey ? 'privateKey' : 'password',
  };

  try {
    const { Client } = await import('ssh2');

    return new Promise((resolve) => {
      const conn = new Client();
      const timeout = setTimeout(() => {
        conn.end();
        resolve({
          success: false,
          message: `Connection timed out to ${data.host}:${port} after 10 seconds.`,
          details: { rawError: 'Connection timeout', connectionInfo },
        });
      }, 10000);

      conn.on('ready', () => {
        clearTimeout(timeout);
        conn.end();
        resolve({
          success: true,
          message: `Successfully connected to ${data.host}:${port} as ${data.username}`,
          details: { connectionInfo },
        });
      });

      conn.on('error', (err: Error) => {
        clearTimeout(timeout);
        const rawMessage = err.message || String(err);
        const details = { rawError: rawMessage, connectionInfo };

        if (rawMessage.includes('ECONNREFUSED')) {
          resolve({ success: false, message: `Connection refused to ${data.host}:${port}. Check that SSH is running.`, details });
        } else if (rawMessage.includes('ENOTFOUND')) {
          resolve({ success: false, message: `Host not found: ${data.host}`, details });
        } else if (rawMessage.includes('Authentication failed') || rawMessage.includes('All configured authentication methods failed')) {
          resolve({ success: false, message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`, details });
        } else {
          resolve({ success: false, message: `Connection failed to ${data.host}:${port}.`, details });
        }
      });

      const connectConfig: Parameters<typeof conn.connect>[0] = {
        host: data.host,
        port: port,
        username: data.username,
        readyTimeout: 10000,
      };

      if (data.privateKey) {
        connectConfig.privateKey = data.privateKey;
        if (data.passphrase) {
          connectConfig.passphrase = data.passphrase;
        }
      } else {
        connectConfig.password = data.password;
      }

      conn.connect(connectConfig);
    });
  } catch (error) {
    const rawMessage = (error as Error).message;
    return {
      success: false,
      message: `SSH connection failed to ${data.host}:${port}.`,
      details: { rawError: rawMessage, connectionInfo },
    };
  }
}

/**
 * Test Elasticsearch/OpenSearch connection
 */
async function testElasticsearch(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const protocol = data.useTls ? 'https' : 'http';
  const port = data.port || 9200;
  const url = `${protocol}://${data.host}:${port}`;
  const connectionInfo = { host: data.host, port, protocol, user: data.username };

  logger.info({ url, user: data.username, useTls: data.useTls }, 'OpenSearch/Elasticsearch connection attempt');

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (data.username && data.password) {
      const auth = Buffer.from(`${data.username}:${data.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
      logger.debug({ user: data.username }, 'Using Basic auth');
    } else if (data.apiKey) {
      headers['Authorization'] = `ApiKey ${data.apiKey}`;
      logger.debug('Using API Key auth');
    } else {
      logger.debug('No authentication configured');
    }

    logger.debug({ url, headers: { ...headers, Authorization: headers.Authorization ? '***' : undefined } }, 'Fetching URL');

    // For HTTPS connections, optionally allow self-signed certificates and skip hostname verification
    const fetchOptions: RequestInit & { agent?: unknown } = { headers };
    if (data.useTls) {
      const https = await import('https');
      const agent = new https.Agent({
        rejectUnauthorized: !data.allowSelfSigned,
        // Skip hostname verification if requested
        checkServerIdentity: data.skipHostnameVerification ? () => undefined : undefined,
      });
      fetchOptions.agent = agent;
      logger.debug({ allowSelfSigned: data.allowSelfSigned, skipHostnameVerification: data.skipHostnameVerification }, 'Using HTTPS agent');
    }

    const response = await fetch(url, fetchOptions);

    logger.info({ status: response.status, statusText: response.statusText }, 'OpenSearch/Elasticsearch response');

    if (response.ok) {
      const info = await response.json() as {
        name?: string;
        cluster_name?: string;
        version?: { number?: string; distribution?: string }
      };

      logger.info({
        name: info.name,
        cluster_name: info.cluster_name,
        version: info.version?.number,
        distribution: info.version?.distribution,
      }, 'OpenSearch/Elasticsearch connection successful');

      return {
        success: true,
        message: `Successfully connected to ${info.cluster_name || 'cluster'} (${info.version?.distribution || 'Elasticsearch'} ${info.version?.number || ''})`,
        details: {
          name: info.name,
          cluster_name: info.cluster_name,
          version: info.version?.number,
          distribution: info.version?.distribution,
          connectionInfo,
        },
      };
    } else {
      // Try to get error body
      let errorBody = '';
      try {
        errorBody = await response.text();
        logger.error({ status: response.status, body: errorBody }, 'OpenSearch/Elasticsearch error response');
      } catch {
        // Ignore body read error
      }

      const details = {
        rawError: `HTTP ${response.status}: ${response.statusText}`,
        responseBody: errorBody.substring(0, 500),
        connectionInfo
      };

      if (response.status === 401) {
        return { success: false, message: `Authentication failed for ${data.host}:${port}. Check username and password.`, details };
      }
      if (response.status === 403) {
        return { success: false, message: `Access forbidden for ${data.host}:${port}. Check user permissions.`, details };
      }
      return { success: false, message: `Server at ${data.host}:${port} returned status ${response.status}.`, details };
    }
  } catch (error) {
    const err = error as Error & { cause?: Error };
    // Node fetch wraps errors - extract the underlying cause
    const underlyingError = err.cause || err;
    const rawMessage = underlyingError.message || err.message;
    const stack = underlyingError.stack || err.stack;

    logger.error({
      message: err.message,
      causeMessage: err.cause?.message,
      rawMessage,
      stack,
      connectionInfo
    }, 'OpenSearch/Elasticsearch connection error');

    const details = {
      rawError: rawMessage,
      outerError: err.message !== rawMessage ? err.message : undefined,
      connectionInfo
    };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that the server is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (rawMessage.includes('ETIMEDOUT')) {
      return { success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details };
    }
    if (rawMessage.includes('unable to verify') || rawMessage.includes('certificate') || rawMessage.includes('self signed') || rawMessage.includes('CERT_')) {
      return { success: false, message: `SSL/TLS certificate error for ${data.host}:${port}. Try enabling/disabling TLS or the server may have a self-signed certificate.`, details };
    }
    if (rawMessage.includes('ECONNRESET')) {
      return { success: false, message: `Connection reset by ${data.host}:${port}. The server closed the connection.`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}: ${rawMessage}`, details };
  }
}

/**
 * Test Cassandra connection
 */
async function testCassandra(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test Oracle connection
 */
async function testOracle(data: DataSourceData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.port || 1521;

  try {
    const oracledb = await import('oracledb');

    // Connection string format: host:port/service_name
    const connectString = `${data.host}:${port}/${data.database || 'ORCL'}`;

    const connection = await oracledb.default.getConnection({
      user: data.username,
      password: data.password,
      connectString,
    });

    const result = await connection.execute(
      'SELECT BANNER FROM v$version WHERE ROWNUM = 1'
    );
    const rows = result.rows as Array<{ BANNER: string }> | undefined;
    const version = rows?.[0]?.BANNER || 'Unknown';
    await connection.close();

    return {
      success: true,
      message: `Successfully connected to Oracle`,
      details: { version, connectionInfo: { host: data.host, port, database: data.database || 'ORCL' } },
    };
  } catch (error) {
    const err = error as Error & { errorNum?: number };
    const rawMessage = err.message || String(error);
    const connectionInfo = { host: data.host, port, user: data.username, database: data.database || 'ORCL' };
    const details = { rawError: rawMessage, connectionInfo, errorNum: err.errorNum };

    if (rawMessage.includes('TNS:no listener') || rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that Oracle is running.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    if (err.errorNum === 1017 || rawMessage.includes('ORA-01017')) {
      return { success: false, message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`, details };
    }
    if (rawMessage.includes('ORA-12154') || rawMessage.includes('TNS:could not resolve')) {
      return { success: false, message: `Could not resolve service name: ${data.database || 'ORCL'}`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}

/**
 * Test Snowflake connection
 */
async function testSnowflake(data: DataSourceData): Promise<TestResult> {
  if (!data.account || !data.username || !data.password) {
    return { success: false, message: 'Account, username, and password are required' };
  }

  const connectionInfo = {
    account: data.account,
    user: data.username,
    warehouse: data.warehouse,
    database: data.database,
    role: data.role,
  };

  try {
    const snowflake = await import('snowflake-sdk');

    return new Promise((resolve) => {
      const connection = snowflake.createConnection({
        account: data.account!,
        username: data.username!,
        password: data.password!,
        warehouse: data.warehouse,
        database: data.database,
        role: data.role,
      });

      connection.connect((err: Error | undefined) => {
        if (err) {
          const message = err.message || String(err);
          if (message.includes('Incorrect username or password')) {
            resolve({
              success: false,
              message: `Authentication failed for user '${data.username}'@'${data.account}'.`,
              details: { rawError: message, connectionInfo },
            });
          } else if (message.includes('account') || message.includes('not found')) {
            resolve({
              success: false,
              message: `Account not found: ${data.account}`,
              details: { rawError: message, connectionInfo },
            });
          } else {
            resolve({
              success: false,
              message: `Connection failed to Snowflake account '${data.account}'.`,
              details: { rawError: message, connectionInfo },
            });
          }
          return;
        }

        // Run a simple query to verify connection
        connection.execute({
          sqlText: 'SELECT CURRENT_VERSION() as version',
          complete: (err2: Error | undefined, _stmt: unknown, rows: unknown) => {
            if (err2) {
              resolve({
                success: false,
                message: `Query failed on Snowflake account '${data.account}'.`,
                details: { rawError: err2.message, connectionInfo },
              });
              return;
            }
            const version = (rows as Array<{ VERSION: string }>)?.[0]?.VERSION || 'Unknown';
            connection.destroy(() => {
              resolve({
                success: true,
                message: `Successfully connected to Snowflake ${version}`,
                details: { version, connectionInfo },
              });
            });
          },
        });
      });
    });
  } catch (error) {
    const rawMessage = (error as Error).message;
    return {
      success: false,
      message: `Snowflake connection failed.`,
      details: { rawError: rawMessage, connectionInfo },
    };
  }
}

/**
 * Test PrestoDB connection
 */
async function testPrestoDB(data: DataSourceData): Promise<TestResult> {
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

/**
 * Test WinRM connection
 */
async function testWinRM(data: DataSourceData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.useHttps ? 5986 : 5985;
  const protocol = data.useHttps ? 'https' : 'http';
  const connectionInfo = { host: data.host, port, protocol, user: data.username, domain: data.domain };

  try {
    // WinRM uses HTTP SOAP protocol - we'll just test the endpoint is reachable
    const url = `${protocol}://${data.host}:${port}/wsman`;

    const auth = Buffer.from(`${data.domain ? data.domain + '\\' : ''}${data.username}:${data.password}`).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml;charset=UTF-8',
        'Authorization': `Basic ${auth}`,
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">
  <env:Body>
    <n:Identify xmlns:n="http://schemas.dmtf.org/wbem/wsman/identify/1/wsmanidentity.xsd"/>
  </env:Body>
</env:Envelope>`,
      // @ts-expect-error - Node fetch supports this
      rejectUnauthorized: false,
    });

    if (response.ok) {
      return {
        success: true,
        message: `Successfully connected to WinRM on ${data.host}:${port}`,
        details: { connectionInfo },
      };
    } else {
      const details = { rawError: `HTTP ${response.status}`, connectionInfo };
      if (response.status === 401) {
        return { success: false, message: `Authentication failed for user '${data.username}'@'${data.host}:${port}'.`, details };
      }
      return { success: false, message: `Server at ${data.host}:${port} returned status ${response.status}.`, details };
    }
  } catch (error) {
    const rawMessage = (error as Error).message || String(error);
    const details = { rawError: rawMessage, connectionInfo };

    if (rawMessage.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused to ${data.host}:${port}. Check that WinRM is enabled.`, details };
    }
    if (rawMessage.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}`, details };
    }
    return { success: false, message: `Connection failed to ${data.host}:${port}.`, details };
  }
}
