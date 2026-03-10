import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test WinRM connection
 */
export async function testWinRM(data: DataSourceData): Promise<TestResult> {
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
