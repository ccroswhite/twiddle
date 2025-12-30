import type { NodeDefinition } from '@twiddle/shared';

export const OpenSearchNode: NodeDefinition = {
  type: 'twiddle.opensearch',
  displayName: 'OpenSearch',
  description: 'Search and manage data in OpenSearch clusters',
  icon: 'search',
  iconColor: '#005eb8',
  category: 'Data Engines',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'search',
      options: [
        { name: 'Search', value: 'search', description: 'Search documents' },
        { name: 'Index Document', value: 'index', description: 'Index a document' },
        { name: 'Get Document', value: 'get', description: 'Get document by ID' },
        { name: 'Update Document', value: 'update', description: 'Update a document' },
        { name: 'Delete Document', value: 'delete', description: 'Delete a document' },
        { name: 'Bulk Operation', value: 'bulk', description: 'Perform bulk operations' },
        { name: 'Create Index', value: 'createIndex', description: 'Create an index' },
        { name: 'Delete Index', value: 'deleteIndex', description: 'Delete an index' },
        { name: 'SQL Query', value: 'sql', description: 'Execute SQL query' },
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
      default: '{\n  "query": {\n    "match_all": {}\n  }\n}',
      description: 'Search query in OpenSearch Query DSL',
      displayOptions: {
        show: {
          operation: ['search'],
        },
      },
      typeOptions: {
        rows: 15,
        editor: 'codeEditor',
        editorLanguage: 'json',
      },
    },
    {
      name: 'sqlQuery',
      displayName: 'SQL Query',
      type: 'string',
      default: '',
      placeholder: 'SELECT * FROM my-index LIMIT 10',
      description: 'SQL query to execute',
      displayOptions: {
        show: {
          operation: ['sql'],
        },
      },
      typeOptions: {
        rows: 5,
        editor: 'codeEditor',
        editorLanguage: 'sql',
      },
    },
    {
      name: 'documentId',
      displayName: 'Document ID',
      type: 'string',
      default: '',
      description: 'Document ID (auto-generated if empty for index)',
      displayOptions: {
        show: {
          operation: ['get', 'index', 'update', 'delete'],
        },
      },
    },
    {
      name: 'document',
      displayName: 'Document',
      type: 'json',
      default: '{}',
      description: 'Document to index/update',
      displayOptions: {
        show: {
          operation: ['index', 'update'],
        },
      },
      typeOptions: {
        rows: 10,
        editor: 'codeEditor',
        editorLanguage: 'json',
      },
    },
    {
      name: 'bulkData',
      displayName: 'Bulk Data',
      type: 'json',
      default: '[]',
      description: 'Array of bulk operations',
      displayOptions: {
        show: {
          operation: ['bulk'],
        },
      },
    },
    {
      name: 'indexSettings',
      displayName: 'Index Settings',
      type: 'json',
      default: '{\n  "settings": {\n    "number_of_shards": 1,\n    "number_of_replicas": 1\n  }\n}',
      description: 'Index settings and mappings',
      displayOptions: {
        show: {
          operation: ['createIndex'],
        },
      },
    },
    {
      name: 'size',
      displayName: 'Result Size',
      type: 'number',
      default: 10,
      description: 'Maximum number of results to return',
      displayOptions: {
        show: {
          operation: ['search'],
        },
      },
    },
    {
      name: 'from',
      displayName: 'From',
      type: 'number',
      default: 0,
      description: 'Starting offset for pagination',
      displayOptions: {
        show: {
          operation: ['search'],
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
        { name: 'NDJSON', value: 'ndjson' },
        { name: 'CSV', value: 'csv' },
      ],
      displayOptions: { show: { outputOptions: ['file'] } },
    },
    {
      name: 'timeout',
      displayName: 'Timeout (seconds)',
      type: 'number',
      default: 30,
      description: 'Request timeout in seconds',
    },
    {
      name: 'retryOnFailure',
      displayName: 'Retry on Failure',
      type: 'number',
      default: 0,
      description: 'Number of times to retry the request if it fails (0 = no retries)',
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
      name: 'opensearchDatasource',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}} {{$parameter["index"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/opensearch',
};
