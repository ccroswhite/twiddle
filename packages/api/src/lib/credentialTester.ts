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
      case 'githubCredentials':
        return testGitHub(data);
      case 'postgresqlCredentials':
        return testPostgreSQL(data);
      case 'mysqlCredentials':
        return testMySQL(data);
      case 'mssqlCredentials':
        return testMSSQL(data);
      case 'redisCredentials':
      case 'valkeyCredentials':
        return testRedis(data);
      case 'sshCredentials':
        return testSSH(data);
      case 'opensearchCredentials':
      case 'elasticsearchCredentials':
        return testElasticsearch(data);
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

  return {
    success: true,
    message: `Credentials validated for ${data.host}:${port}/${data.database || ''}. Install 'mysql2' package for actual connectivity testing.`,
  };
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

  return {
    success: true,
    message: `Credentials validated for ${data.host}:${port}/${data.database || 'master'}. Install 'mssql' package for actual connectivity testing.`,
  };
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

  // SSH testing requires the ssh2 library which may not be installed
  // For now, just validate the credentials format
  return {
    success: true,
    message: 'SSH credentials format is valid. Install ssh2 package for actual connectivity testing.',
  };
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
