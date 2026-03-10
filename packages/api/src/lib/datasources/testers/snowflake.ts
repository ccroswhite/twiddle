import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test Snowflake connection
 */
export async function testSnowflake(data: DataSourceData): Promise<TestResult> {
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
