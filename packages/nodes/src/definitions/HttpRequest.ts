import type { NodeDefinition } from '@twiddle/shared';

export const HttpRequestNode: NodeDefinition = {
  type: 'twiddle.httpRequest',
  displayName: 'HTTP Request',
  description: 'Make HTTP requests to any URL',
  icon: 'globe',
  iconColor: '#0066ff',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'method',
      displayName: 'Method',
      type: 'options',
      default: 'GET',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'PATCH', value: 'PATCH' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'HEAD', value: 'HEAD' },
        { name: 'OPTIONS', value: 'OPTIONS' },
      ],
      description: 'The HTTP method to use',
    },
    {
      name: 'url',
      displayName: 'URL',
      type: 'string',
      default: '',
      placeholder: 'https://api.example.com/endpoint',
      description: 'The URL to make the request to',
      required: true,
    },
    {
      name: 'authentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basicAuth' },
        { name: 'Bearer Token', value: 'bearerToken' },
        { name: 'Custom Headers', value: 'customHeaders' },
      ],
      description: 'The authentication method to use',
    },
    {
      name: 'headers',
      displayName: 'Headers',
      type: 'fixedCollection',
      default: {},
      description: 'Custom headers to send with the request',
      typeOptions: {
        multipleValues: true,
      },
    },
    {
      name: 'queryParameters',
      displayName: 'Query Parameters',
      type: 'fixedCollection',
      default: {},
      description: 'Query parameters to append to the URL',
      typeOptions: {
        multipleValues: true,
      },
    },
    {
      name: 'body',
      displayName: 'Body',
      type: 'json',
      default: '',
      description: 'The request body (for POST, PUT, PATCH)',
      displayOptions: {
        show: {
          method: ['POST', 'PUT', 'PATCH'],
        },
      },
    },
    {
      name: 'timeout',
      displayName: 'Timeout',
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
    {
      name: 'followRedirects',
      displayName: 'Follow Redirects',
      type: 'boolean',
      default: true,
      description: 'Whether to follow HTTP redirects',
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
  subtitle: '={{$parameter["method"]}} {{$parameter["url"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/http-request',
};
