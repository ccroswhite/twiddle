import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test SSH connection
 */
export async function testSSH(data: DataSourceData): Promise<TestResult> {
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
