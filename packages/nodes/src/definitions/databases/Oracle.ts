import type { NodeDefinition } from '@twiddle/shared';
import { commonDatabaseParameters } from './base.js';

export const OracleNode: NodeDefinition = {
  type: 'twiddle.oracle',
  displayName: 'Oracle DB',
  description: 'Execute queries on Oracle databases',
  icon: 'database',
  iconColor: '#f80000',
  category: 'Data Engines',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    ...commonDatabaseParameters,
    {
      name: 'connectionType',
      displayName: 'Connection Type',
      type: 'options',
      default: 'serviceName',
      options: [
        { name: 'Service Name', value: 'serviceName', description: 'Connect using Oracle service name' },
        { name: 'SID', value: 'sid', description: 'Connect using Oracle SID' },
        { name: 'TNS', value: 'tns', description: 'Connect using TNS alias' },
        { name: 'Connection String', value: 'connectionString', description: 'Use full connection string' },
      ],
      description: 'How to connect to the Oracle database',
    },
    {
      name: 'serviceName',
      displayName: 'Service Name',
      type: 'string',
      default: '',
      placeholder: 'ORCL',
      description: 'Oracle service name',
      displayOptions: {
        show: {
          connectionType: ['serviceName'],
        },
      },
    },
    {
      name: 'sid',
      displayName: 'SID',
      type: 'string',
      default: '',
      placeholder: 'ORCL',
      description: 'Oracle System Identifier (SID)',
      displayOptions: {
        show: {
          connectionType: ['sid'],
        },
      },
    },
    {
      name: 'tnsAlias',
      displayName: 'TNS Alias',
      type: 'string',
      default: '',
      placeholder: 'MYDB',
      description: 'TNS alias from tnsnames.ora',
      displayOptions: {
        show: {
          connectionType: ['tns'],
        },
      },
    },
    {
      name: 'connectionString',
      displayName: 'Connection String',
      type: 'string',
      default: '',
      placeholder: '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ORCL)))',
      description: 'Full Oracle connection string',
      displayOptions: {
        show: {
          connectionType: ['connectionString'],
        },
      },
    },
    {
      name: 'schema',
      displayName: 'Schema',
      type: 'string',
      default: '',
      placeholder: 'MY_SCHEMA',
      description: 'Default schema to use (leave empty for user default)',
    },
    {
      name: 'edition',
      displayName: 'Edition',
      type: 'string',
      default: '',
      description: 'Oracle edition name (for Edition-Based Redefinition)',
    },
    {
      name: 'fetchArraySize',
      displayName: 'Fetch Array Size',
      type: 'number',
      default: 100,
      description: 'Number of rows to fetch at a time (affects performance)',
    },
    {
      name: 'prefetchRows',
      displayName: 'Prefetch Rows',
      type: 'number',
      default: 100,
      description: 'Number of rows to prefetch from the database',
    },
    {
      name: 'maxRows',
      displayName: 'Max Rows',
      type: 'number',
      default: 0,
      description: 'Maximum number of rows to return (0 = unlimited)',
    },
    {
      name: 'autoCommit',
      displayName: 'Auto Commit',
      type: 'boolean',
      default: true,
      description: 'Automatically commit after each statement',
    },
    {
      name: 'outFormat',
      displayName: 'Output Format',
      type: 'options',
      default: 'object',
      options: [
        { name: 'Object', value: 'object', description: 'Return rows as objects with column names' },
        { name: 'Array', value: 'array', description: 'Return rows as arrays' },
      ],
      description: 'Format of returned rows',
    },
    {
      name: 'extendedMetaData',
      displayName: 'Include Metadata',
      type: 'boolean',
      default: false,
      description: 'Include column metadata in the output',
    },
    {
      name: 'lobAsString',
      displayName: 'LOB as String',
      type: 'boolean',
      default: true,
      description: 'Return CLOB/BLOB data as strings (vs streams)',
    },
    {
      name: 'fetchTypeHandler',
      displayName: 'Date Handling',
      type: 'options',
      default: 'date',
      options: [
        { name: 'JavaScript Date', value: 'date', description: 'Return as JavaScript Date objects' },
        { name: 'ISO String', value: 'isoString', description: 'Return as ISO 8601 strings' },
        { name: 'Timestamp', value: 'timestamp', description: 'Return as Unix timestamps' },
      ],
      description: 'How to handle DATE and TIMESTAMP columns',
    },
    {
      name: 'bindVariables',
      displayName: 'Bind Variables',
      type: 'json',
      default: '{}',
      description: 'Named bind variables for the query (e.g., {"id": 123, "name": "test"})',
    },
    {
      name: 'plsqlBlock',
      displayName: 'Execute as PL/SQL Block',
      type: 'boolean',
      default: false,
      description: 'Execute the query as an anonymous PL/SQL block',
      displayOptions: {
        show: {
          operation: ['executeQuery'],
        },
      },
    },
    {
      name: 'outBinds',
      displayName: 'Output Bind Variables',
      type: 'json',
      default: '{}',
      description: 'Output bind variable definitions for PL/SQL (e.g., {"result": {"type": "NUMBER", "dir": "OUT"}})',
      displayOptions: {
        show: {
          plsqlBlock: [true],
        },
      },
    },
    {
      name: 'poolMin',
      displayName: 'Pool Min Connections',
      type: 'number',
      default: 0,
      description: 'Minimum number of connections in the pool',
    },
    {
      name: 'poolMax',
      displayName: 'Pool Max Connections',
      type: 'number',
      default: 4,
      description: 'Maximum number of connections in the pool',
    },
    {
      name: 'poolIncrement',
      displayName: 'Pool Increment',
      type: 'number',
      default: 1,
      description: 'Number of connections to add when pool needs to grow',
    },
    {
      name: 'poolTimeout',
      displayName: 'Pool Timeout (seconds)',
      type: 'number',
      default: 60,
      description: 'Time before idle connections are removed from pool',
    },
  ],
  credentials: [
    {
      name: 'oracleCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/oracle',
};
