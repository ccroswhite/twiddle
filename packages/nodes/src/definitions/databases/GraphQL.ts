import type { NodeDefinition } from '@twiddle/shared';

export const GraphQLNode: NodeDefinition = {
  type: 'twiddle.graphql',
  displayName: 'GraphQL',
  description: 'Execute GraphQL queries and mutations against any GraphQL API',
  icon: 'share-2',
  iconColor: '#e535ab',
  category: 'data',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'endpoint',
      displayName: 'GraphQL Endpoint',
      type: 'string',
      default: '',
      placeholder: 'https://api.example.com/graphql',
      description: 'The GraphQL API endpoint URL',
      required: true,
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Bearer Token', value: 'bearerToken' },
        { name: 'Basic Auth', value: 'basicAuth' },
        { name: 'API Key Header', value: 'apiKey' },
        { name: 'Custom Headers', value: 'customHeaders' },
      ],
      description: 'Authentication method for the GraphQL endpoint',
    },
    {
      name: 'apiKeyHeader',
      displayName: 'API Key Header Name',
      type: 'string',
      default: 'X-API-Key',
      description: 'Name of the header to use for API key authentication',
      displayOptions: {
        show: {
          authentication: ['apiKey'],
        },
      },
    },
    {
      name: 'apiKeyValue',
      displayName: 'API Key Value',
      type: 'string',
      default: '',
      description: 'The API key value',
      displayOptions: {
        show: {
          authentication: ['apiKey'],
        },
      },
    },
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'query',
      options: [
        { name: 'Query', value: 'query', description: 'Execute a GraphQL query' },
        { name: 'Mutation', value: 'mutation', description: 'Execute a GraphQL mutation' },
        { name: 'Subscription', value: 'subscription', description: 'Subscribe to GraphQL events (one-time fetch)' },
        { name: 'Introspection', value: 'introspection', description: 'Fetch the GraphQL schema' },
      ],
      description: 'The type of GraphQL operation to perform',
    },
    {
      name: 'query',
      displayName: 'Query',
      type: 'string',
      default: '',
      placeholder: `query {
  users {
    id
    name
    email
  }
}`,
      description: 'The GraphQL query or mutation to execute',
      displayOptions: {
        show: {
          operation: ['query', 'mutation', 'subscription'],
        },
      },
      required: true,
      typeOptions: {
        rows: 10,
        editor: 'codeEditor',
        editorLanguage: 'graphql',
      },
    },
    {
      name: 'variables',
      displayName: 'Variables',
      type: 'json',
      default: '{}',
      placeholder: '{"userId": "123", "limit": 10}',
      description: 'Variables to pass to the GraphQL query',
      displayOptions: {
        show: {
          operation: ['query', 'mutation', 'subscription'],
        },
      },
      typeOptions: {
        rows: 5,
        editor: 'codeEditor',
        editorLanguage: 'json',
      },
    },
    {
      name: 'operationName',
      displayName: 'Operation Name',
      type: 'string',
      default: '',
      placeholder: 'GetUsers',
      description: 'Name of the operation to execute (required if query contains multiple operations)',
      displayOptions: {
        show: {
          operation: ['query', 'mutation'],
        },
      },
    },
    // Request Options
    {
      name: 'requestMethod',
      displayName: 'Request Method',
      type: 'options',
      default: 'POST',
      options: [
        { name: 'POST', value: 'POST', description: 'Send query in request body (recommended)' },
        { name: 'GET', value: 'GET', description: 'Send query as URL parameters (for simple queries)' },
      ],
      description: 'HTTP method to use for the request',
    },
    {
      name: 'headers',
      displayName: 'Additional Headers',
      type: 'fixedCollection',
      default: {},
      description: 'Additional headers to send with the request',
      typeOptions: {
        multipleValues: true,
      },
    },
    // Response Options
    {
      name: 'responseFormat',
      displayName: 'Response Format',
      type: 'options',
      default: 'data',
      options: [
        { name: 'Data Only', value: 'data', description: 'Return only the data field from the response' },
        { name: 'Full Response', value: 'full', description: 'Return the full GraphQL response including errors' },
        { name: 'Data with Errors', value: 'dataWithErrors', description: 'Return data and errors separately' },
      ],
      description: 'How to format the response',
    },
    {
      name: 'dataPath',
      displayName: 'Data Path',
      type: 'string',
      default: '',
      placeholder: 'users.edges',
      description: 'Dot-notation path to extract specific data from the response (e.g., "users.edges")',
      displayOptions: {
        show: {
          responseFormat: ['data'],
        },
      },
    },
    {
      name: 'errorHandling',
      displayName: 'Error Handling',
      type: 'options',
      default: 'throw',
      options: [
        { name: 'Throw Error', value: 'throw', description: 'Stop execution if GraphQL returns errors' },
        { name: 'Continue', value: 'continue', description: 'Continue execution and include errors in output' },
        { name: 'Output Error Branch', value: 'branch', description: 'Route to error output on GraphQL errors' },
      ],
      description: 'How to handle GraphQL errors in the response',
    },
    // Pagination
    {
      name: 'pagination',
      displayName: 'Enable Pagination',
      type: 'boolean',
      default: false,
      description: 'Automatically paginate through results',
    },
    {
      name: 'paginationType',
      displayName: 'Pagination Type',
      type: 'options',
      default: 'cursor',
      options: [
        { name: 'Cursor-based', value: 'cursor', description: 'Use cursor/after for pagination (Relay-style)' },
        { name: 'Offset-based', value: 'offset', description: 'Use offset/limit for pagination' },
        { name: 'Page-based', value: 'page', description: 'Use page number for pagination' },
      ],
      description: 'Type of pagination to use',
      displayOptions: {
        show: {
          pagination: [true],
        },
      },
    },
    {
      name: 'cursorPath',
      displayName: 'Cursor Path',
      type: 'string',
      default: 'pageInfo.endCursor',
      description: 'Path to the cursor in the response',
      displayOptions: {
        show: {
          pagination: [true],
          paginationType: ['cursor'],
        },
      },
    },
    {
      name: 'cursorVariable',
      displayName: 'Cursor Variable Name',
      type: 'string',
      default: 'after',
      description: 'Name of the variable to use for the cursor',
      displayOptions: {
        show: {
          pagination: [true],
          paginationType: ['cursor'],
        },
      },
    },
    {
      name: 'hasNextPagePath',
      displayName: 'Has Next Page Path',
      type: 'string',
      default: 'pageInfo.hasNextPage',
      description: 'Path to check if there are more pages',
      displayOptions: {
        show: {
          pagination: [true],
          paginationType: ['cursor'],
        },
      },
    },
    {
      name: 'maxPages',
      displayName: 'Max Pages',
      type: 'number',
      default: 10,
      description: 'Maximum number of pages to fetch (0 = unlimited)',
      displayOptions: {
        show: {
          pagination: [true],
        },
      },
    },
    // Batching
    {
      name: 'batchRequests',
      displayName: 'Batch Requests',
      type: 'boolean',
      default: false,
      description: 'Batch multiple queries into a single request',
    },
    // Timeout and Retry
    {
      name: 'timeout',
      displayName: 'Timeout (seconds)',
      type: 'number',
      default: 30,
      description: 'Request timeout in seconds',
    },
    {
      name: 'retryOnFailure',
      displayName: 'Retry on Failure',
      type: 'number',
      default: 0,
      description: 'Number of times to retry the request if it fails (0 = no retries)',
    },
    {
      name: 'retryDelay',
      displayName: 'Retry Delay (seconds)',
      type: 'number',
      default: 1,
      description: 'Delay between retry attempts in seconds',
      displayOptions: {
        show: {
          retryOnFailure: [1, 2, 3, 4, 5],
        },
      },
    },
    // Caching
    {
      name: 'cacheResponse',
      displayName: 'Cache Response',
      type: 'boolean',
      default: false,
      description: 'Cache the response for identical queries',
    },
    {
      name: 'cacheTTL',
      displayName: 'Cache TTL (seconds)',
      type: 'number',
      default: 300,
      description: 'How long to cache the response',
      displayOptions: {
        show: {
          cacheResponse: [true],
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
    {
      name: 'httpBearerToken',
      displayOptions: {
        show: {
          authentication: ['bearerToken'],
        },
      },
    },
  ],
  subtitle: '={{$parameter["operation"]}} {{$parameter["endpoint"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/graphql',
};
