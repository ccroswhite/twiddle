import type { NodeDefinition } from '@twiddle/shared';
import { commonDatabaseParameters } from './base.js';

export const PrestoDBNode: NodeDefinition = {
  type: 'twiddle.prestodb',
  displayName: 'PrestoDB',
  description: 'Execute queries on PrestoDB/Trino distributed SQL engine',
  icon: 'database',
  iconColor: '#5890ff',
  category: 'data',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    ...commonDatabaseParameters,
    {
      name: 'catalog',
      displayName: 'Catalog',
      type: 'string',
      default: '',
      placeholder: 'hive',
      description: 'Presto catalog to use',
    },
    {
      name: 'schema',
      displayName: 'Schema',
      type: 'string',
      default: 'default',
      description: 'Schema to use',
    },
    {
      name: 'source',
      displayName: 'Source',
      type: 'string',
      default: 'twiddle',
      description: 'Source identifier for query tracking',
    },
  ],
  credentials: [
    {
      name: 'prestodbCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/prestodb',
};
