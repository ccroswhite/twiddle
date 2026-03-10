import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test Oracle connection
 */
export async function testOracle(data: DataSourceData): Promise<TestResult> {
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
    // oracledb returns rows as arrays by default, e.g. [['Oracle Database 19c...']]
    const rows = result.rows as Array<Array<string>> | undefined;
    const version = rows?.[0]?.[0] || 'Unknown';
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
