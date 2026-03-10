import { logger } from '../../logger.js';
import type { TestResult } from '../types.js';
import type { DataSourceData } from '../types.js';

/**
 * Test Elasticsearch/OpenSearch connection using https module for proper SSL handling
 */
export async function testElasticsearch(data: DataSourceData): Promise<TestResult> {
  if (!data.host) {
    return { success: false, message: 'Host is required' };
  }

  const protocol = data.useTls ? 'https' : 'http';
  const port = data.port || 9200;
  const connectionInfo = { host: data.host, port, protocol, user: data.username };

  logger.info({
    host: data.host,
    port,
    user: data.username,
    useTls: data.useTls,
    allowSelfSigned: data.allowSelfSigned,
    skipHostnameVerification: data.skipHostnameVerification,
  }, 'OpenSearch/Elasticsearch connection attempt');

  return new Promise(async (resolve) => {
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
      }

      const requestOptions = {
        hostname: data.host,
        port,
        path: '/',
        method: 'GET',
        headers,
        rejectUnauthorized: !data.allowSelfSigned,
        // Skip hostname verification if requested
        checkServerIdentity: data.skipHostnameVerification
          ? (() => undefined) as () => undefined
          : undefined,
      };

      logger.info({
        rejectUnauthorized: requestOptions.rejectUnauthorized,
        hasCheckServerIdentity: !!requestOptions.checkServerIdentity,
      }, 'HTTPS request options');

      const httpModule = protocol === 'https'
        ? await import('https')
        : await import('http');

      const req = httpModule.request(requestOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          logger.info({ status: res.statusCode }, 'OpenSearch/Elasticsearch response');

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const info = JSON.parse(body) as {
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

              resolve({
                success: true,
                message: `Successfully connected to ${info.cluster_name || 'cluster'} (${info.version?.distribution || 'Elasticsearch'} ${info.version?.number || ''})`,
                details: {
                  name: info.name,
                  cluster_name: info.cluster_name,
                  version: info.version?.number,
                  distribution: info.version?.distribution,
                  connectionInfo,
                },
              });
            } catch (parseError) {
              resolve({
                success: false,
                message: `Failed to parse response from ${data.host}:${port}`,
                details: { rawError: 'JSON parse error', responseBody: body.substring(0, 500), connectionInfo },
              });
            }
          } else if (res.statusCode === 401) {
            resolve({
              success: false,
              message: `Authentication failed for ${data.host}:${port}. Check username and password.`,
              details: { rawError: `HTTP ${res.statusCode}`, responseBody: body.substring(0, 500), connectionInfo }
            });
          } else if (res.statusCode === 403) {
            resolve({
              success: false,
              message: `Access forbidden for ${data.host}:${port}. Check user permissions.`,
              details: { rawError: `HTTP ${res.statusCode}`, responseBody: body.substring(0, 500), connectionInfo }
            });
          } else {
            resolve({
              success: false,
              message: `Server at ${data.host}:${port} returned status ${res.statusCode}.`,
              details: { rawError: `HTTP ${res.statusCode}`, responseBody: body.substring(0, 500), connectionInfo }
            });
          }
        });
      });

      req.on('error', (error) => {
        const rawMessage = error.message;
        logger.error({ rawMessage, connectionInfo }, 'OpenSearch/Elasticsearch connection error');

        const details = { rawError: rawMessage, connectionInfo };

        if (rawMessage.includes('ECONNREFUSED')) {
          resolve({ success: false, message: `Connection refused to ${data.host}:${port}. Check that the server is running.`, details });
        } else if (rawMessage.includes('ENOTFOUND')) {
          resolve({ success: false, message: `Host not found: ${data.host}`, details });
        } else if (rawMessage.includes('ETIMEDOUT')) {
          resolve({ success: false, message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`, details });
        } else if (rawMessage.includes('unable to verify') || rawMessage.includes('certificate') || rawMessage.includes('self signed') || rawMessage.includes('CERT_')) {
          resolve({ success: false, message: `SSL/TLS certificate error for ${data.host}:${port}. Enable "Allow Self-Signed Certificates".`, details });
        } else if (rawMessage.includes('ECONNRESET')) {
          resolve({ success: false, message: `Connection reset by ${data.host}:${port}. The server closed the connection.`, details });
        } else {
          resolve({ success: false, message: `Connection failed to ${data.host}:${port}: ${rawMessage}`, details });
        }
      });

      // Set timeout
      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          success: false,
          message: `Connection timed out to ${data.host}:${port}. Check that the host is reachable.`,
          details: { rawError: 'Request timeout', connectionInfo }
        });
      });

      req.end();
    } catch (error) {
      const rawMessage = (error as Error).message;
      logger.error({ rawMessage, connectionInfo }, 'OpenSearch/Elasticsearch setup error');
      resolve({ success: false, message: `Connection failed to ${data.host}:${port}: ${rawMessage}`, details: { rawError: rawMessage, connectionInfo } });
    }
  });
}
