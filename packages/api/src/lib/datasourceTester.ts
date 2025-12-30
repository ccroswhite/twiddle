/**
 * Credential testing utilities
 * Tests connectivity for various credential types
 */
import { logger } from './logger.js';


interface CredentialData {
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
}

interface TestResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Test credential connectivity based on type
 */
export async function testCredential(type: string, data: CredentialData): Promise<TestResult> {
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
async function testHttpBasicAuth(data: CredentialData): Promise<TestResult> {
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
async function testHttpBearerToken(data: CredentialData): Promise<TestResult> {
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
async function testApiKey(data: CredentialData): Promise<TestResult> {
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
async function testGitHub(data: CredentialData): Promise<TestResult> {
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
async function testPostgreSQL(data: CredentialData): Promise<TestResult> {
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
    const message = err.message || String(error);
    const code = err.code || '';

    logger.error({ message, code, error }, 'PostgreSQL connection error');

    // Provide more helpful error messages
    if (code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that PostgreSQL is running on ${data.host}:${port}` };
    }
    if (code === 'ENOTFOUND' || message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    if (code === 'ETIMEDOUT' || message.includes('ETIMEDOUT') || message.includes('timeout')) {
      return { success: false, message: `Connection timed out. Check that ${data.host}:${port} is reachable.` };
    }
    if (message.includes('password authentication failed')) {
      return { success: false, message: 'Authentication failed. Check username and password.' };
    }
    if (message.includes('does not exist')) {
      return { success: false, message: message };
    }
    if (code === 'ECONNRESET' || message.includes('ECONNRESET')) {
      return { success: false, message: `Connection reset. The server at ${data.host}:${port} closed the connection.` };
    }
    return { success: false, message: `Connection failed: ${message || code || 'Unknown error'}` };
  }
}

/**
 * Test MySQL connection
 */
async function testMySQL(data: CredentialData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.port || 3306;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  try {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection({
      host: data.host,
      port: port,
      user: data.username,
      password: data.password,
      database: data.database || undefined,
      connectTimeout: 10000,
      ssl: data.useTls ? { rejectUnauthorized: false } : undefined,
    });

    const [rows] = await connection.query('SELECT VERSION() as version');
    await connection.end();

    const version = (rows as Array<{ version: string }>)[0]?.version || 'Unknown';

    return {
      success: true,
      message: `Successfully connected to MySQL ${version}`,
      details: { version },
    };
  } catch (error) {
    const err = error as Error & { code?: string };
    const message = err.message || String(error);
    const code = err.code || '';

    if (code === 'ECONNREFUSED' || message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that MySQL is running on ${data.host}:${port}` };
    }
    if (code === 'ENOTFOUND' || message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    if (code === 'ER_ACCESS_DENIED_ERROR' || message.includes('Access denied')) {
      return { success: false, message: 'Authentication failed. Check username and password.' };
    }
    if (code === 'ETIMEDOUT' || message.includes('ETIMEDOUT')) {
      return { success: false, message: `Connection timed out. Check that ${data.host}:${port} is reachable.` };
    }
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Test MS SQL Server connection
 */
async function testMSSQL(data: CredentialData): Promise<TestResult> {
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
    const message = err.message || String(error);

    if (message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that SQL Server is running on ${data.host}:${port}` };
    }
    if (message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    if (message.includes('Login failed')) {
      return { success: false, message: 'Authentication failed. Check username and password.' };
    }
    if (message.includes('ETIMEDOUT')) {
      return { success: false, message: `Connection timed out. Check that ${data.host}:${port} is reachable.` };
    }
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Test Redis/Valkey connection
 */
async function testRedis(data: CredentialData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 6379;
  if (port < 1 || port > 65535) {
    return { success: false, message: 'Invalid port number' };
  }

  try {
    const { createClient } = await import('redis');

    const url = data.password
      ? `redis://:${data.password}@${data.host}:${port}`
      : `redis://${data.host}:${port}`;

    const client = createClient({
      url,
      socket: {
        connectTimeout: 10000,
      },
    });

    client.on('error', () => { }); // Suppress error events during test

    await client.connect();
    const pong = await client.ping();
    const info = await client.info('server');
    await client.quit();

    // Extract Redis version from info
    const versionMatch = info.match(/redis_version:([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return {
      success: true,
      message: `Successfully connected to Redis ${version}`,
      details: { ping: pong, version },
    };
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that Redis is running on ${data.host}:${port}` };
    }
    if (err.message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    if (err.message.includes('NOAUTH') || err.message.includes('AUTH')) {
      return { success: false, message: 'Authentication failed. Check password.' };
    }
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Test SSH connection
 */
async function testSSH(data: CredentialData): Promise<TestResult> {
  if (!data.host || !data.username) {
    return { success: false, message: 'Host and username are required' };
  }

  if (!data.password && !data.privateKey) {
    return { success: false, message: 'Either password or private key is required' };
  }

  const port = data.port || 22;

  try {
    const { Client } = await import('ssh2');

    return new Promise((resolve) => {
      const conn = new Client();
      const timeout = setTimeout(() => {
        conn.end();
        resolve({ success: false, message: `Connection timed out after 10 seconds` });
      }, 10000);

      conn.on('ready', () => {
        clearTimeout(timeout);
        conn.end();
        resolve({
          success: true,
          message: `Successfully connected to ${data.host}:${port} as ${data.username}`,
        });
      });

      conn.on('error', (err: Error) => {
        clearTimeout(timeout);
        const message = err.message || String(err);
        if (message.includes('ECONNREFUSED')) {
          resolve({ success: false, message: `Connection refused. Check that SSH is running on ${data.host}:${port}` });
        } else if (message.includes('ENOTFOUND')) {
          resolve({ success: false, message: `Host not found: ${data.host}` });
        } else if (message.includes('Authentication failed') || message.includes('All configured authentication methods failed')) {
          resolve({ success: false, message: 'Authentication failed. Check username and password/key.' });
        } else {
          resolve({ success: false, message: `Connection failed: ${message}` });
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
    return { success: false, message: `SSH connection failed: ${(error as Error).message}` };
  }
}

/**
 * Test Elasticsearch/OpenSearch connection
 */
async function testElasticsearch(data: CredentialData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  try {
    const protocol = data.useTls ? 'https' : 'http';
    const port = data.port || 9200;
    const url = `${protocol}://${data.host}:${port}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (data.username && data.password) {
      const auth = Buffer.from(`${data.username}:${data.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (data.apiKey) {
      headers['Authorization'] = `ApiKey ${data.apiKey}`;
    }

    const response = await fetch(url, {
      headers,
      // @ts-expect-error - Node fetch supports this
      rejectUnauthorized: false,
    });

    if (response.ok) {
      const info = await response.json() as {
        name?: string;
        cluster_name?: string;
        version?: { number?: string }
      };
      return {
        success: true,
        message: `Successfully connected to ${info.cluster_name || 'cluster'}`,
        details: {
          name: info.name,
          cluster_name: info.cluster_name,
          version: info.version?.number,
        },
      };
    } else if (response.status === 401) {
      return { success: false, message: 'Authentication failed' };
    } else {
      return { success: false, message: `Server returned status ${response.status}` };
    }
  } catch (error) {
    return { success: false, message: `Connection failed: ${(error as Error).message}` };
  }
}

/**
 * Test Cassandra connection
 */
async function testCassandra(data: CredentialData): Promise<TestResult> {
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
      details: { version },
    };
  } catch (error) {
    const err = error as Error;
    const message = err.message || String(error);

    if (message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that Cassandra is running on ${data.host}:${port}` };
    }
    if (message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    if (message.includes('Authentication') || message.includes('credentials')) {
      return { success: false, message: 'Authentication failed. Check username and password.' };
    }
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Test Oracle connection
 */
async function testOracle(data: CredentialData): Promise<TestResult> {
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
      details: { version },
    };
  } catch (error) {
    const err = error as Error & { errorNum?: number };
    const message = err.message || String(error);

    if (message.includes('TNS:no listener') || message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that Oracle is running on ${data.host}:${port}` };
    }
    if (message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    if (err.errorNum === 1017 || message.includes('ORA-01017')) {
      return { success: false, message: 'Authentication failed. Check username and password.' };
    }
    if (message.includes('ORA-12154') || message.includes('TNS:could not resolve')) {
      return { success: false, message: `Could not resolve service name: ${data.database || 'ORCL'}` };
    }
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Test Snowflake connection
 */
async function testSnowflake(data: CredentialData): Promise<TestResult> {
  if (!data.account || !data.username || !data.password) {
    return { success: false, message: 'Account, username, and password are required' };
  }

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
            resolve({ success: false, message: 'Authentication failed. Check username and password.' });
          } else if (message.includes('account') || message.includes('not found')) {
            resolve({ success: false, message: `Account not found: ${data.account}` });
          } else {
            resolve({ success: false, message: `Connection failed: ${message}` });
          }
          return;
        }

        // Run a simple query to verify connection
        connection.execute({
          sqlText: 'SELECT CURRENT_VERSION() as version',
          complete: (err2: Error | undefined, _stmt: unknown, rows: unknown) => {
            if (err2) {
              resolve({ success: false, message: `Query failed: ${err2.message}` });
              return;
            }
            const version = (rows as Array<{ VERSION: string }>)?.[0]?.VERSION || 'Unknown';
            connection.destroy(() => {
              resolve({
                success: true,
                message: `Successfully connected to Snowflake ${version}`,
                details: { version, account: data.account },
              });
            });
          },
        });
      });
    });
  } catch (error) {
    return { success: false, message: `Snowflake connection failed: ${(error as Error).message}` };
  }
}

/**
 * Test PrestoDB connection
 */
async function testPrestoDB(data: CredentialData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const port = data.port || 8080;
  const protocol = data.useTls ? 'https' : 'http';

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
        details: { version },
      };
    } else if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Authentication failed. Check username and password.' };
    } else {
      return { success: false, message: `Server returned status ${response.status}` };
    }
  } catch (error) {
    const message = (error as Error).message || String(error);
    if (message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that PrestoDB is running on ${data.host}:${port}` };
    }
    if (message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    return { success: false, message: `Connection failed: ${message}` };
  }
}

/**
 * Test WinRM connection
 */
async function testWinRM(data: CredentialData): Promise<TestResult> {
  if (!data.host || !data.username || !data.password) {
    return { success: false, message: 'Host, username, and password are required' };
  }

  const port = data.useHttps ? 5986 : 5985;
  const protocol = data.useHttps ? 'https' : 'http';

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
        details: { host: data.host, port },
      };
    } else if (response.status === 401) {
      return { success: false, message: 'Authentication failed. Check username, password, and domain.' };
    } else {
      return { success: false, message: `Server returned status ${response.status}` };
    }
  } catch (error) {
    const message = (error as Error).message || String(error);
    if (message.includes('ECONNREFUSED')) {
      return { success: false, message: `Connection refused. Check that WinRM is enabled on ${data.host}:${port}` };
    }
    if (message.includes('ENOTFOUND')) {
      return { success: false, message: `Host not found: ${data.host}` };
    }
    return { success: false, message: `Connection failed: ${message}` };
  }
}
