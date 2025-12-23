import type { NodeDefinition } from '@twiddle/shared';
import { commonDatabaseParameters } from './base.js';

export const SnowflakeNode: NodeDefinition = {
  type: 'twiddle.snowflake',
  displayName: 'Snowflake',
  description: 'Execute queries on Snowflake data warehouse',
  icon: 'database',
  iconColor: '#29b5e8',
  category: 'Data Engines',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    ...commonDatabaseParameters,
    {
      name: 'warehouse',
      displayName: 'Warehouse',
      type: 'string',
      default: '',
      placeholder: 'COMPUTE_WH',
      description: 'Snowflake warehouse to use',
    },
    {
      name: 'database',
      displayName: 'Database',
      type: 'string',
      default: '',
      placeholder: 'MY_DATABASE',
      description: 'Database to connect to',
    },
    {
      name: 'schema',
      displayName: 'Schema',
      type: 'string',
      default: 'PUBLIC',
      description: 'Schema to use',
    },
    {
      name: 'role',
      displayName: 'Role',
      type: 'string',
      default: '',
      placeholder: 'ACCOUNTADMIN',
      description: 'Role to use for the session',
    },
  ],
  credentials: [
    {
      name: 'snowflakeCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/snowflake',
};
