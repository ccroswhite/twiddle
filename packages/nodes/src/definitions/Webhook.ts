import type { NodeDefinition } from '@twiddle/shared';

export const WebhookNode: NodeDefinition = {
  type: 'twiddle.webhook',
  displayName: 'Webhook',
  description: 'Trigger workflow execution when an HTTP request is received',
  icon: 'webhook',
  iconColor: '#885577',
  category: 'core',
  version: 1,
  inputs: [],
  outputs: ['main'],
  parameters: [
    {
      name: 'httpMethod',
      displayName: 'HTTP Method',
      type: 'options',
      default: 'POST',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'PATCH', value: 'PATCH' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'HEAD', value: 'HEAD' },
        { name: 'OPTIONS', value: 'OPTIONS' },
      ],
      description: 'HTTP method to listen for',
    },
    {
      name: 'path',
      displayName: 'Path',
      type: 'string',
      default: '',
      placeholder: 'my-webhook',
      description: 'The webhook path (appended to the base webhook URL)',
      required: true,
    },
    // Authentication
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none', description: 'No authentication required' },
        { name: 'Basic Auth', value: 'basicAuth', description: 'HTTP Basic Authentication' },
        { name: 'Header Auth', value: 'headerAuth', description: 'Custom header authentication' },
        { name: 'JWT', value: 'jwt', description: 'JSON Web Token authentication' },
        { name: 'Query Parameter', value: 'queryParam', description: 'API key in query parameter' },
      ],
      description: 'Authentication method for incoming requests',
    },
    {
      name: 'headerAuthName',
      displayName: 'Header Name',
      type: 'string',
      default: 'X-API-Key',
      description: 'Name of the authentication header',
      displayOptions: {
        show: {
          authentication: ['headerAuth'],
        },
      },
    },
    {
      name: 'headerAuthValue',
      displayName: 'Header Value',
      type: 'string',
      default: '',
      description: 'Expected value of the authentication header',
      displayOptions: {
        show: {
          authentication: ['headerAuth'],
        },
      },
    },
    {
      name: 'queryParamName',
      displayName: 'Query Parameter Name',
      type: 'string',
      default: 'api_key',
      description: 'Name of the query parameter for authentication',
      displayOptions: {
        show: {
          authentication: ['queryParam'],
        },
      },
    },
    {
      name: 'queryParamValue',
      displayName: 'Query Parameter Value',
      type: 'string',
      default: '',
      description: 'Expected value of the query parameter',
      displayOptions: {
        show: {
          authentication: ['queryParam'],
        },
      },
    },
    {
      name: 'jwtSecret',
      displayName: 'JWT Secret',
      type: 'string',
      default: '',
      description: 'Secret key for JWT verification',
      displayOptions: {
        show: {
          authentication: ['jwt'],
        },
      },
    },
    {
      name: 'jwtAlgorithm',
      displayName: 'JWT Algorithm',
      type: 'options',
      default: 'HS256',
      options: [
        { name: 'HS256', value: 'HS256' },
        { name: 'HS384', value: 'HS384' },
        { name: 'HS512', value: 'HS512' },
        { name: 'RS256', value: 'RS256' },
        { name: 'RS384', value: 'RS384' },
        { name: 'RS512', value: 'RS512' },
      ],
      description: 'Algorithm used for JWT signing',
      displayOptions: {
        show: {
          authentication: ['jwt'],
        },
      },
    },
    // Response Configuration
    {
      name: 'responseMode',
      displayName: 'Response Mode',
      type: 'options',
      default: 'onReceived',
      options: [
        { name: 'When Received', value: 'onReceived', description: 'Respond immediately when webhook is received' },
        { name: 'When Last Node Finishes', value: 'lastNode', description: 'Respond after workflow completes' },
        { name: 'Using Respond to Webhook Node', value: 'responseNode', description: 'Use a Respond to Webhook node' },
      ],
      description: 'When to send the HTTP response',
    },
    {
      name: 'responseCode',
      displayName: 'Response Code',
      type: 'number',
      default: 200,
      description: 'HTTP status code to return',
      displayOptions: {
        show: {
          responseMode: ['onReceived'],
        },
      },
    },
    {
      name: 'responseData',
      displayName: 'Response Data',
      type: 'options',
      default: 'noData',
      options: [
        { name: 'No Response Body', value: 'noData' },
        { name: 'First Entry JSON', value: 'firstEntryJson' },
        { name: 'All Entries JSON', value: 'allEntriesJson' },
        { name: 'Custom JSON', value: 'customJson' },
        { name: 'Custom Text', value: 'customText' },
      ],
      description: 'Data to include in the response',
      displayOptions: {
        show: {
          responseMode: ['onReceived', 'lastNode'],
        },
      },
    },
    {
      name: 'customResponseBody',
      displayName: 'Response Body',
      type: 'string',
      default: '',
      description: 'Custom response body',
      displayOptions: {
        show: {
          responseData: ['customJson', 'customText'],
        },
      },
      typeOptions: {
        rows: 5,
      },
    },
    {
      name: 'responseContentType',
      displayName: 'Response Content-Type',
      type: 'options',
      default: 'application/json',
      options: [
        { name: 'application/json', value: 'application/json' },
        { name: 'text/plain', value: 'text/plain' },
        { name: 'text/html', value: 'text/html' },
        { name: 'application/xml', value: 'application/xml' },
        { name: 'Custom', value: 'custom' },
      ],
      description: 'Content-Type header for the response',
      displayOptions: {
        show: {
          responseMode: ['onReceived', 'lastNode'],
        },
      },
    },
    {
      name: 'customContentType',
      displayName: 'Custom Content-Type',
      type: 'string',
      default: '',
      placeholder: 'application/custom+json',
      description: 'Custom Content-Type value',
      displayOptions: {
        show: {
          responseContentType: ['custom'],
        },
      },
    },
    {
      name: 'responseHeaders',
      displayName: 'Response Headers',
      type: 'fixedCollection',
      default: {},
      description: 'Additional headers to include in the response',
      typeOptions: {
        multipleValues: true,
      },
    },
    // Request Handling
    {
      name: 'rawBody',
      displayName: 'Raw Body',
      type: 'boolean',
      default: false,
      description: 'Include the raw request body in the output',
    },
    {
      name: 'binaryData',
      displayName: 'Binary Data',
      type: 'boolean',
      default: false,
      description: 'Expect and handle binary data in the request',
    },
    {
      name: 'binaryPropertyName',
      displayName: 'Binary Property',
      type: 'string',
      default: 'data',
      description: 'Name of the binary property to store file data',
      displayOptions: {
        show: {
          binaryData: [true],
        },
      },
    },
    // IP Filtering
    {
      name: 'ipWhitelist',
      displayName: 'IP Whitelist',
      type: 'string',
      default: '',
      placeholder: '192.168.1.1, 10.0.0.0/8',
      description: 'Comma-separated list of allowed IP addresses or CIDR ranges (empty = allow all)',
    },
    // Rate Limiting
    {
      name: 'rateLimit',
      displayName: 'Enable Rate Limiting',
      type: 'boolean',
      default: false,
      description: 'Limit the number of requests per time period',
    },
    {
      name: 'rateLimitCount',
      displayName: 'Max Requests',
      type: 'number',
      default: 100,
      description: 'Maximum number of requests allowed',
      displayOptions: {
        show: {
          rateLimit: [true],
        },
      },
    },
    {
      name: 'rateLimitWindow',
      displayName: 'Time Window (seconds)',
      type: 'number',
      default: 60,
      description: 'Time window for rate limiting in seconds',
      displayOptions: {
        show: {
          rateLimit: [true],
        },
      },
    },
    // CORS
    {
      name: 'cors',
      displayName: 'Enable CORS',
      type: 'boolean',
      default: false,
      description: 'Enable Cross-Origin Resource Sharing',
    },
    {
      name: 'corsOrigin',
      displayName: 'Allowed Origins',
      type: 'string',
      default: '*',
      placeholder: 'https://example.com, https://app.example.com',
      description: 'Allowed origins (comma-separated, or * for all)',
      displayOptions: {
        show: {
          cors: [true],
        },
      },
    },
    {
      name: 'corsMethods',
      displayName: 'Allowed Methods',
      type: 'string',
      default: 'GET, POST, PUT, DELETE, OPTIONS',
      description: 'Allowed HTTP methods for CORS',
      displayOptions: {
        show: {
          cors: [true],
        },
      },
    },
    {
      name: 'corsHeaders',
      displayName: 'Allowed Headers',
      type: 'string',
      default: 'Content-Type, Authorization',
      description: 'Allowed headers for CORS',
      displayOptions: {
        show: {
          cors: [true],
        },
      },
    },
    // Output Options
    {
      name: 'includeHeaders',
      displayName: 'Include Request Headers',
      type: 'boolean',
      default: false,
      description: 'Include request headers in the output',
    },
    {
      name: 'includeQuery',
      displayName: 'Include Query Parameters',
      type: 'boolean',
      default: true,
      description: 'Include query parameters in the output',
    },
    {
      name: 'includeBody',
      displayName: 'Include Body',
      type: 'boolean',
      default: true,
      description: 'Include request body in the output',
    },
    {
      name: 'includeMetadata',
      displayName: 'Include Metadata',
      type: 'boolean',
      default: false,
      description: 'Include request metadata (IP, timestamp, etc.)',
    },
    // Validation
    {
      name: 'validateBody',
      displayName: 'Validate Request Body',
      type: 'boolean',
      default: false,
      description: 'Validate the request body against a JSON schema',
    },
    {
      name: 'bodySchema',
      displayName: 'JSON Schema',
      type: 'json',
      default: '{}',
      description: 'JSON Schema for request body validation',
      displayOptions: {
        show: {
          validateBody: [true],
        },
      },
      typeOptions: {
        rows: 10,
      },
    },
    {
      name: 'rejectInvalid',
      displayName: 'Reject Invalid Requests',
      type: 'boolean',
      default: true,
      description: 'Return 400 error for invalid requests',
      displayOptions: {
        show: {
          validateBody: [true],
        },
      },
    },
  ],
  credentials: [
    {
      name: 'httpBasicAuth',
      displayOptions: {
        show: {
          authentication: ['basicAuth'],
        },
      },
    },
  ],
  subtitle: '={{$parameter["httpMethod"]}} {{$parameter["path"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/webhook',
};
