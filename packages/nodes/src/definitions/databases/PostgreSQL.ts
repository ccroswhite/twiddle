import type { NodeDefinition } from '@twiddle/shared';
import { commonDatabaseParameters } from './base.js';

export const PostgreSQLNode: NodeDefinition = {
  type: 'twiddle.postgresql',
  displayName: 'PostgreSQL',
  description: 'Execute queries on PostgreSQL databases',
  icon: 'database',
  iconColor: '#336791',
  category: 'data',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    ...commonDatabaseParameters,
    {
      name: 'schema',
      displayName: 'Schema',
      type: 'string',
      default: 'public',
      description: 'Database schema to use',
    },
    {
      name: 'sslMode',
      displayName: 'SSL Mode',
      type: 'options',
      default: 'prefer',
      options: [
        { name: 'Disable', value: 'disable' },
        { name: 'Allow', value: 'allow' },
        { name: 'Prefer', value: 'prefer' },
        { name: 'Require', value: 'require' },
        { name: 'Verify CA', value: 'verify-ca' },
        { name: 'Verify Full', value: 'verify-full' },
      ],
      description: 'SSL connection mode',
    },
  ],
  credentials: [
    {
      name: 'postgresqlCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/postgresql',
};
