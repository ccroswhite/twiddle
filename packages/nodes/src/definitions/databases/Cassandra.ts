import type { NodeDefinition } from '@twiddle/shared';

export const CassandraNode: NodeDefinition = {
  type: 'twiddle.cassandra',
  displayName: 'Cassandra',
  description: 'Execute queries on Apache Cassandra databases',
  icon: 'database',
  iconColor: '#1287b1',
  category: 'Data Engines',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'executeQuery',
      options: [
        { name: 'Execute Query', value: 'executeQuery', description: 'Execute a CQL query' },
        { name: 'Insert', value: 'insert', description: 'Insert data into a table' },
        { name: 'Update', value: 'update', description: 'Update existing records' },
        { name: 'Delete', value: 'delete', description: 'Delete records' },
      ],
      description: 'The operation to perform',
    },
    {
      name: 'query',
      displayName: 'CQL Query',
      type: 'string',
      default: '',
      placeholder: 'SELECT * FROM keyspace.table',
      description: 'The CQL query to execute',
      displayOptions: {
        show: {
          operation: ['executeQuery'],
        },
      },
      required: true,
      typeOptions: {
        rows: 5,
        editor: 'codeEditor',
        editorLanguage: 'sql',
      },
    },
    {
      name: 'keyspace',
      displayName: 'Keyspace',
      type: 'string',
      default: '',
      placeholder: 'my_keyspace',
      description: 'The keyspace to use',
    },
    {
      name: 'table',
      displayName: 'Table',
      type: 'string',
      default: '',
      placeholder: 'my_table',
      description: 'The table to operate on',
      displayOptions: {
        show: {
          operation: ['insert', 'update', 'delete'],
        },
      },
    },
    {
      name: 'values',
      displayName: 'Values',
      type: 'json',
      default: '{}',
      description: 'Values to insert/update as JSON object',
      displayOptions: {
        show: {
          operation: ['insert', 'update'],
        },
      },
    },
    {
      name: 'whereClause',
      displayName: 'WHERE Clause',
      type: 'string',
      default: '',
      placeholder: 'id = ?',
      description: 'WHERE clause for update/delete',
      displayOptions: {
        show: {
          operation: ['update', 'delete'],
        },
      },
    },
    {
      name: 'queryParameters',
      displayName: 'Query Parameters',
      type: 'json',
      default: '[]',
      description: 'Parameters for parameterized queries',
    },
    {
      name: 'consistencyLevel',
      displayName: 'Consistency Level',
      type: 'options',
      default: 'localQuorum',
      options: [
        { name: 'Any', value: 'any' },
        { name: 'One', value: 'one' },
        { name: 'Two', value: 'two' },
        { name: 'Three', value: 'three' },
        { name: 'Quorum', value: 'quorum' },
        { name: 'All', value: 'all' },
        { name: 'Local Quorum', value: 'localQuorum' },
        { name: 'Each Quorum', value: 'eachQuorum' },
        { name: 'Local One', value: 'localOne' },
      ],
      description: 'Consistency level for the query',
    },
    {
      name: 'ttl',
      displayName: 'TTL (seconds)',
      type: 'number',
      default: 0,
      description: 'Time-to-live for inserted/updated data (0 = no expiry)',
      displayOptions: {
        show: {
          operation: ['insert', 'update'],
        },
      },
    },
    {
      name: 'outputOptions',
      displayName: 'Output Options',
      type: 'options',
      default: 'return',
      options: [
        { name: 'Return Results', value: 'return' },
        { name: 'Save to File', value: 'file' },
        { name: 'Export to Database', value: 'export' },
      ],
      description: 'How to handle the query results',
    },
    {
      name: 'outputFilePath',
      displayName: 'Output File Path',
      type: 'string',
      default: '',
      displayOptions: { show: { outputOptions: ['file'] } },
    },
    {
      name: 'outputFileFormat',
      displayName: 'Output File Format',
      type: 'options',
      default: 'json',
      options: [
        { name: 'JSON', value: 'json' },
        { name: 'CSV', value: 'csv' },
        { name: 'NDJSON', value: 'ndjson' },
      ],
      displayOptions: { show: { outputOptions: ['file'] } },
    },
    {
      name: 'timeout',
      displayName: 'Timeout (seconds)',
      type: 'number',
      default: 30,
      description: 'Query execution timeout in seconds',
    },
    {
      name: 'retryOnFailure',
      displayName: 'Retry on Failure',
      type: 'number',
      default: 0,
      description: 'Number of times to retry the query if it fails (0 = no retries)',
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
      name: 'cassandraDatasource',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/cassandra',
};
