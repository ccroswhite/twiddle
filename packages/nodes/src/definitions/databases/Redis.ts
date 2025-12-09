import type { NodeDefinition } from '@twiddle/shared';

export const RedisNode: NodeDefinition = {
  type: 'twiddle.redis',
  displayName: 'Redis',
  description: 'Execute commands on Redis databases',
  icon: 'database',
  iconColor: '#dc382d',
  category: 'data',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'get',
      options: [
        { name: 'Get', value: 'get', description: 'Get a value by key' },
        { name: 'Set', value: 'set', description: 'Set a value' },
        { name: 'Delete', value: 'delete', description: 'Delete a key' },
        { name: 'Keys', value: 'keys', description: 'Find keys matching pattern' },
        { name: 'Hash Get', value: 'hget', description: 'Get hash field value' },
        { name: 'Hash Set', value: 'hset', description: 'Set hash field value' },
        { name: 'Hash Get All', value: 'hgetall', description: 'Get all hash fields' },
        { name: 'List Push', value: 'lpush', description: 'Push to list (left)' },
        { name: 'List Pop', value: 'lpop', description: 'Pop from list (left)' },
        { name: 'List Range', value: 'lrange', description: 'Get list range' },
        { name: 'Set Add', value: 'sadd', description: 'Add to set' },
        { name: 'Set Members', value: 'smembers', description: 'Get set members' },
        { name: 'Publish', value: 'publish', description: 'Publish to channel' },
        { name: 'Execute Command', value: 'executeCommand', description: 'Execute raw Redis command' },
      ],
      description: 'The operation to perform',
    },
    {
      name: 'key',
      displayName: 'Key',
      type: 'string',
      default: '',
      placeholder: 'my-key',
      description: 'The key to operate on',
      displayOptions: {
        hide: {
          operation: ['keys', 'executeCommand'],
        },
      },
      required: true,
    },
    {
      name: 'value',
      displayName: 'Value',
      type: 'string',
      default: '',
      description: 'The value to set',
      displayOptions: {
        show: {
          operation: ['set', 'lpush', 'sadd', 'publish'],
        },
      },
    },
    {
      name: 'field',
      displayName: 'Field',
      type: 'string',
      default: '',
      description: 'Hash field name',
      displayOptions: {
        show: {
          operation: ['hget', 'hset'],
        },
      },
    },
    {
      name: 'pattern',
      displayName: 'Pattern',
      type: 'string',
      default: '*',
      placeholder: 'user:*',
      description: 'Key pattern to match',
      displayOptions: {
        show: {
          operation: ['keys'],
        },
      },
    },
    {
      name: 'start',
      displayName: 'Start Index',
      type: 'number',
      default: 0,
      description: 'Start index for list range',
      displayOptions: {
        show: {
          operation: ['lrange'],
        },
      },
    },
    {
      name: 'stop',
      displayName: 'Stop Index',
      type: 'number',
      default: -1,
      description: 'Stop index for list range (-1 for end)',
      displayOptions: {
        show: {
          operation: ['lrange'],
        },
      },
    },
    {
      name: 'ttl',
      displayName: 'TTL (seconds)',
      type: 'number',
      default: 0,
      description: 'Time-to-live in seconds (0 = no expiry)',
      displayOptions: {
        show: {
          operation: ['set', 'hset'],
        },
      },
    },
    {
      name: 'command',
      displayName: 'Command',
      type: 'string',
      default: '',
      placeholder: 'INFO server',
      description: 'Raw Redis command to execute',
      displayOptions: {
        show: {
          operation: ['executeCommand'],
        },
      },
    },
    {
      name: 'database',
      displayName: 'Database Index',
      type: 'number',
      default: 0,
      description: 'Redis database index (0-15)',
    },
    {
      name: 'outputOptions',
      displayName: 'Output Options',
      type: 'options',
      default: 'return',
      options: [
        { name: 'Return Results', value: 'return' },
        { name: 'Save to File', value: 'file' },
      ],
      description: 'How to handle the results',
    },
    {
      name: 'outputFilePath',
      displayName: 'Output File Path',
      type: 'string',
      default: '',
      displayOptions: { show: { outputOptions: ['file'] } },
    },
    {
      name: 'timeout',
      displayName: 'Timeout (seconds)',
      type: 'number',
      default: 30,
      description: 'Command execution timeout in seconds',
    },
    {
      name: 'retryOnFailure',
      displayName: 'Retry on Failure',
      type: 'number',
      default: 0,
      description: 'Number of times to retry the command if it fails (0 = no retries)',
    },
    {
      name: 'retryDelay',
      displayName: 'Retry Delay (seconds)',
      type: 'number',
      default: 1,
      description: 'Delay between retry attempts in seconds',
      displayOptions: {
        show: {
          retryOnFailure: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        },
      },
    },
  ],
  credentials: [
    {
      name: 'redisCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}} {{$parameter["key"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/redis',
};
