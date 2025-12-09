import type { NodeParameter } from '@twiddle/shared';

/**
 * Common parameters shared across database nodes
 */
export const commonDatabaseParameters: NodeParameter[] = [
  {
    name: 'operation',
    displayName: 'Operation',
    type: 'options',
    default: 'executeQuery',
    options: [
      { name: 'Execute Query', value: 'executeQuery', description: 'Execute a SQL/query statement' },
      { name: 'Insert', value: 'insert', description: 'Insert data into a table' },
      { name: 'Update', value: 'update', description: 'Update existing records' },
      { name: 'Delete', value: 'delete', description: 'Delete records from a table' },
    ],
    description: 'The operation to perform',
  },
  {
    name: 'query',
    displayName: 'Query',
    type: 'string',
    default: '',
    placeholder: 'SELECT * FROM table_name',
    description: 'The query to execute',
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
    name: 'table',
    displayName: 'Table',
    type: 'string',
    default: '',
    placeholder: 'table_name',
    description: 'The table to operate on',
    displayOptions: {
      show: {
        operation: ['insert', 'update', 'delete'],
      },
    },
    required: true,
  },
  {
    name: 'columns',
    displayName: 'Columns',
    type: 'string',
    default: '',
    placeholder: 'col1, col2, col3',
    description: 'Columns to insert/update (comma-separated)',
    displayOptions: {
      show: {
        operation: ['insert', 'update'],
      },
    },
  },
  {
    name: 'values',
    displayName: 'Values',
    type: 'json',
    default: '[]',
    description: 'Values to insert/update as JSON array',
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
    placeholder: 'id = 1',
    description: 'WHERE clause for update/delete operations',
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
    description: 'Parameters for parameterized queries (as JSON array)',
  },
  {
    name: 'outputOptions',
    displayName: 'Output Options',
    type: 'options',
    default: 'return',
    options: [
      { name: 'Return Results', value: 'return', description: 'Return results to workflow' },
      { name: 'Save to File', value: 'file', description: 'Save results to a file' },
      { name: 'Export to Database', value: 'export', description: 'Export results to another database' },
    ],
    description: 'How to handle the query results',
  },
  {
    name: 'outputFilePath',
    displayName: 'Output File Path',
    type: 'string',
    default: '',
    placeholder: '/path/to/output.json',
    description: 'Path to save the output file',
    displayOptions: {
      show: {
        outputOptions: ['file'],
      },
    },
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
    description: 'Format for the output file',
    displayOptions: {
      show: {
        outputOptions: ['file'],
      },
    },
  },
  {
    name: 'exportCredentials',
    displayName: 'Export Database Credentials',
    type: 'string',
    default: '',
    description: 'Credential ID for the target database',
    displayOptions: {
      show: {
        outputOptions: ['export'],
      },
    },
  },
  {
    name: 'exportTable',
    displayName: 'Export Table',
    type: 'string',
    default: '',
    placeholder: 'target_table',
    description: 'Table name in the target database',
    displayOptions: {
      show: {
        outputOptions: ['export'],
      },
    },
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
];

/**
 * NoSQL-specific parameters (for Cassandra, Redis, etc.)
 */
export const noSqlParameters: NodeParameter[] = [
  {
    name: 'operation',
    displayName: 'Operation',
    type: 'options',
    default: 'executeQuery',
    options: [
      { name: 'Execute Query', value: 'executeQuery', description: 'Execute a query' },
      { name: 'Get', value: 'get', description: 'Get a value by key' },
      { name: 'Set', value: 'set', description: 'Set a value' },
      { name: 'Delete', value: 'delete', description: 'Delete a key/record' },
    ],
    description: 'The operation to perform',
  },
];

/**
 * Search engine parameters (for OpenSearch, Elasticsearch)
 */
export const searchEngineParameters: NodeParameter[] = [
  {
    name: 'operation',
    displayName: 'Operation',
    type: 'options',
    default: 'search',
    options: [
      { name: 'Search', value: 'search', description: 'Search documents' },
      { name: 'Index Document', value: 'index', description: 'Index a document' },
      { name: 'Get Document', value: 'get', description: 'Get a document by ID' },
      { name: 'Delete Document', value: 'delete', description: 'Delete a document' },
      { name: 'Bulk Operation', value: 'bulk', description: 'Perform bulk operations' },
    ],
    description: 'The operation to perform',
  },
  {
    name: 'index',
    displayName: 'Index',
    type: 'string',
    default: '',
    placeholder: 'my-index',
    description: 'The index to operate on',
    required: true,
  },
  {
    name: 'query',
    displayName: 'Query',
    type: 'json',
    default: '{"query": {"match_all": {}}}',
    description: 'Search query in JSON format',
    displayOptions: {
      show: {
        operation: ['search'],
      },
    },
    typeOptions: {
      rows: 10,
      editor: 'codeEditor',
      editorLanguage: 'json',
    },
  },
  {
    name: 'documentId',
    displayName: 'Document ID',
    type: 'string',
    default: '',
    description: 'Document ID for get/index/delete operations',
    displayOptions: {
      show: {
        operation: ['get', 'index', 'delete'],
      },
    },
  },
  {
    name: 'document',
    displayName: 'Document',
    type: 'json',
    default: '{}',
    description: 'Document to index',
    displayOptions: {
      show: {
        operation: ['index'],
      },
    },
  },
];
