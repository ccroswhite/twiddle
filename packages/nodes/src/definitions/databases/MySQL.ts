import type { NodeDefinition } from '@twiddle/shared';
import { commonDatabaseParameters } from './base.js';

export const MySQLNode: NodeDefinition = {
  type: 'twiddle.mysql',
  displayName: 'MySQL',
  description: 'Execute queries on MySQL/MariaDB databases',
  icon: 'database',
  iconColor: '#4479a1',
  category: 'Data Engines',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    ...commonDatabaseParameters,
    {
      name: 'ssl',
      displayName: 'Use SSL',
      type: 'boolean',
      default: false,
      description: 'Use SSL for connection',
    },
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'local',
      description: 'Timezone for date/time values',
    },
  ],
  credentials: [
    {
      name: 'mysqlDatasource',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/mysql',
};
