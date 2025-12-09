import type { NodeDefinition } from '@twiddle/shared';
import { commonDatabaseParameters } from './base.js';

export const MSSqlNode: NodeDefinition = {
  type: 'twiddle.mssql',
  displayName: 'Microsoft SQL Server',
  description: 'Execute queries on Microsoft SQL Server databases',
  icon: 'database',
  iconColor: '#cc2927',
  category: 'data',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    ...commonDatabaseParameters,
    {
      name: 'trustServerCertificate',
      displayName: 'Trust Server Certificate',
      type: 'boolean',
      default: false,
      description: 'Trust the server certificate without validation',
    },
    {
      name: 'encrypt',
      displayName: 'Encrypt Connection',
      type: 'boolean',
      default: true,
      description: 'Use encrypted connection',
    },
  ],
  credentials: [
    {
      name: 'mssqlCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/mssql',
};
