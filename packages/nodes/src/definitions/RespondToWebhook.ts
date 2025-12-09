import type { NodeDefinition } from '@twiddle/shared';

export const RespondToWebhookNode: NodeDefinition = {
  type: 'twiddle.respondToWebhook',
  displayName: 'Respond to Webhook',
  description: 'Send a response back to an incoming webhook request',
  icon: 'reply',
  iconColor: '#ff6d00',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'respondWith',
      displayName: 'Respond With',
      type: 'options',
      default: 'firstIncomingItem',
      options: [
        { 
          name: 'First Incoming Item', 
          value: 'firstIncomingItem', 
          description: 'Respond with the first item from the input' 
        },
        { 
          name: 'All Incoming Items', 
          value: 'allIncomingItems', 
          description: 'Respond with all items from the input as an array' 
        },
        { 
          name: 'JSON', 
          value: 'json', 
          description: 'Respond with custom JSON data' 
        },
        { 
          name: 'Text', 
          value: 'text', 
          description: 'Respond with plain text' 
        },
        { 
          name: 'Binary', 
          value: 'binary', 
          description: 'Respond with binary data (file download)' 
        },
        { 
          name: 'No Data', 
          value: 'noData', 
          description: 'Respond with no body (just status code)' 
        },
        { 
          name: 'Redirect', 
          value: 'redirect', 
          description: 'Redirect to another URL' 
        },
      ],
      description: 'What data to send in the response',
    },
    // Status Code
    {
      name: 'statusCode',
      displayName: 'Status Code',
      type: 'options',
      default: '200',
      options: [
        { name: '200 OK', value: '200' },
        { name: '201 Created', value: '201' },
        { name: '202 Accepted', value: '202' },
        { name: '204 No Content', value: '204' },
        { name: '301 Moved Permanently', value: '301' },
        { name: '302 Found', value: '302' },
        { name: '304 Not Modified', value: '304' },
        { name: '400 Bad Request', value: '400' },
        { name: '401 Unauthorized', value: '401' },
        { name: '403 Forbidden', value: '403' },
        { name: '404 Not Found', value: '404' },
        { name: '405 Method Not Allowed', value: '405' },
        { name: '409 Conflict', value: '409' },
        { name: '422 Unprocessable Entity', value: '422' },
        { name: '429 Too Many Requests', value: '429' },
        { name: '500 Internal Server Error', value: '500' },
        { name: '502 Bad Gateway', value: '502' },
        { name: '503 Service Unavailable', value: '503' },
        { name: 'Custom', value: 'custom' },
      ],
      description: 'HTTP status code to return',
      displayOptions: {
        hide: {
          respondWith: ['redirect'],
        },
      },
    },
    {
      name: 'customStatusCode',
      displayName: 'Custom Status Code',
      type: 'number',
      default: 200,
      description: 'Custom HTTP status code',
      displayOptions: {
        show: {
          statusCode: ['custom'],
        },
      },
    },
    // JSON Response
    {
      name: 'responseBody',
      displayName: 'Response Body',
      type: 'json',
      default: '{}',
      description: 'JSON data to send in the response',
      displayOptions: {
        show: {
          respondWith: ['json'],
        },
      },
    },
    // Text Response
    {
      name: 'responseText',
      displayName: 'Response Text',
      type: 'string',
      default: '',
      description: 'Plain text to send in the response',
      typeOptions: {
        rows: 5,
      },
      displayOptions: {
        show: {
          respondWith: ['text'],
        },
      },
    },
    // Binary Response
    {
      name: 'binaryPropertyName',
      displayName: 'Binary Property',
      type: 'string',
      default: 'data',
      description: 'Name of the binary property containing the file data',
      displayOptions: {
        show: {
          respondWith: ['binary'],
        },
      },
    },
    {
      name: 'fileName',
      displayName: 'File Name',
      type: 'string',
      default: '',
      description: 'Name of the file for download (optional)',
      displayOptions: {
        show: {
          respondWith: ['binary'],
        },
      },
    },
    // Redirect
    {
      name: 'redirectUrl',
      displayName: 'Redirect URL',
      type: 'string',
      default: '',
      placeholder: 'https://example.com/redirect-target',
      description: 'URL to redirect to',
      displayOptions: {
        show: {
          respondWith: ['redirect'],
        },
      },
    },
    {
      name: 'redirectCode',
      displayName: 'Redirect Code',
      type: 'options',
      default: '302',
      options: [
        { name: '301 Moved Permanently', value: '301' },
        { name: '302 Found (Temporary)', value: '302' },
        { name: '303 See Other', value: '303' },
        { name: '307 Temporary Redirect', value: '307' },
        { name: '308 Permanent Redirect', value: '308' },
      ],
      description: 'HTTP redirect status code',
      displayOptions: {
        show: {
          respondWith: ['redirect'],
        },
      },
    },
    // Headers
    {
      name: 'responseHeaders',
      displayName: 'Response Headers',
      type: 'fixedCollection',
      default: {},
      description: 'Custom headers to include in the response',
      typeOptions: {
        multipleValues: true,
      },
    },
    // Content Type
    {
      name: 'contentType',
      displayName: 'Content Type',
      type: 'options',
      default: 'auto',
      options: [
        { name: 'Auto-detect', value: 'auto', description: 'Automatically set based on response type' },
        { name: 'application/json', value: 'application/json' },
        { name: 'text/plain', value: 'text/plain' },
        { name: 'text/html', value: 'text/html' },
        { name: 'text/xml', value: 'text/xml' },
        { name: 'application/xml', value: 'application/xml' },
        { name: 'application/octet-stream', value: 'application/octet-stream' },
        { name: 'Custom', value: 'custom' },
      ],
      description: 'Content-Type header for the response',
      displayOptions: {
        hide: {
          respondWith: ['noData', 'redirect'],
        },
      },
    },
    {
      name: 'customContentType',
      displayName: 'Custom Content Type',
      type: 'string',
      default: '',
      placeholder: 'application/custom+json',
      description: 'Custom Content-Type header value',
      displayOptions: {
        show: {
          contentType: ['custom'],
        },
      },
    },
    // Options
    {
      name: 'appendResponseData',
      displayName: 'Append Response Data',
      type: 'boolean',
      default: false,
      description: 'Whether to append the response data to the output for downstream nodes',
    },
    {
      name: 'prettyPrint',
      displayName: 'Pretty Print JSON',
      type: 'boolean',
      default: false,
      description: 'Format JSON response with indentation',
      displayOptions: {
        show: {
          respondWith: ['json', 'firstIncomingItem', 'allIncomingItems'],
        },
      },
    },
    {
      name: 'enableCors',
      displayName: 'Enable CORS',
      type: 'boolean',
      default: false,
      description: 'Add CORS headers to allow cross-origin requests',
    },
    {
      name: 'corsOrigin',
      displayName: 'CORS Origin',
      type: 'string',
      default: '*',
      description: 'Allowed origin for CORS (use * for any)',
      displayOptions: {
        show: {
          enableCors: [true],
        },
      },
    },
  ],
  subtitle: '={{$parameter["respondWith"]}} - {{$parameter["statusCode"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/respond-to-webhook',
};
