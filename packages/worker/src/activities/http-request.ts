/**
 * HTTP Request activity implementation
 */
import type { WorkflowNode } from '@twiddle/shared';

interface HttpRequestParams {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  queryParameters?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  followRedirects?: boolean;
}

export async function executeHttpRequest(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<unknown> {
  const params = node.parameters as HttpRequestParams;
  const method = params.method || 'GET';
  const url = params.url || '';
  const headers = params.headers || {};
  const timeout = params.timeout || 30000;

  if (!url) {
    throw new Error('URL is required for HTTP Request node');
  }

  // Build URL with query parameters
  const urlObj = new URL(url);
  if (params.queryParameters) {
    for (const [key, value] of Object.entries(params.queryParameters)) {
      urlObj.searchParams.set(key, value);
    }
  }

  // Prepare request options
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: AbortSignal.timeout(timeout),
    redirect: params.followRedirects !== false ? 'follow' : 'manual',
  };

  // Add body for methods that support it
  if (['POST', 'PUT', 'PATCH'].includes(method) && params.body) {
    requestInit.body = JSON.stringify(params.body);
  }

  try {
    const response = await fetch(urlObj.toString(), requestInit);

    // Parse response
    const contentType = response.headers.get('content-type') || '';
    let data: unknown;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      statusCode: response.status,
      statusMessage: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      ok: response.ok,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`HTTP Request failed: ${message}`);
  }
}
