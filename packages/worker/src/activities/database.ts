/**
 * Database activity implementations
 * Handles execution for all database nodes
 */
import type { WorkflowNode } from '@twiddle/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

// Common types
interface DatabaseResult {
  rows: unknown[];
  rowCount: number;
  fields?: string[];
  affectedRows?: number;
  success: boolean;
}

interface OutputOptions {
  outputOptions: 'return' | 'file' | 'export';
  outputFilePath?: string;
  outputFileFormat?: 'json' | 'csv' | 'ndjson';
  exportCredentials?: string;
  exportTable?: string;
}

interface RetryOptions {
  timeout?: number;
  retryOnFailure?: number;
  retryDelay?: number;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const maxRetries = options.retryOnFailure || 0;
  const retryDelay = (options.retryDelay || 1) * 1000;
  
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        console.log(`[Database] Attempt ${attempt + 1} failed, retrying in ${retryDelay}ms...`);
        await sleep(retryDelay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Format results based on output options
 */
async function handleOutput(
  result: DatabaseResult,
  options: OutputOptions,
): Promise<DatabaseResult> {
  if (options.outputOptions === 'file' && options.outputFilePath) {
    const format = options.outputFileFormat || 'json';
    let content: string;

    switch (format) {
      case 'csv':
        content = convertToCSV(result.rows, result.fields);
        break;
      case 'ndjson':
        content = result.rows.map(row => JSON.stringify(row)).join('\n');
        break;
      case 'json':
      default:
        content = JSON.stringify(result.rows, null, 2);
    }

    await fs.mkdir(path.dirname(options.outputFilePath), { recursive: true });
    await fs.writeFile(options.outputFilePath, content, 'utf-8');
    
    return {
      ...result,
      rows: [], // Clear rows when saving to file
    };
  }

  return result;
}

/**
 * Convert rows to CSV format
 */
function convertToCSV(rows: unknown[], fields?: string[]): string {
  if (rows.length === 0) return '';
  
  const headers = fields || Object.keys(rows[0] as Record<string, unknown>);
  const lines = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(h => {
      const val = (row as Record<string, unknown>)[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return String(val);
    });
    lines.push(values.join(','));
  }
  
  return lines.join('\n');
}

// ============================================================================
// SQL Database Implementations (MSSQL, PostgreSQL, MySQL, Snowflake, PrestoDB)
// ============================================================================

interface SQLParams {
  operation: 'executeQuery' | 'insert' | 'update' | 'delete';
  query?: string;
  table?: string;
  columns?: string;
  values?: string;
  whereClause?: string;
  queryParameters?: string;
  timeout?: number;
}

interface SQLCredentials {
  host: string;
  port?: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Build SQL query based on operation
 */
function buildSQLQuery(params: SQLParams): { query: string; values: unknown[] } {
  const queryParams = params.queryParameters ? JSON.parse(params.queryParameters) : [];

  switch (params.operation) {
    case 'executeQuery':
      return { query: params.query || '', values: queryParams };

    case 'insert': {
      const columns = params.columns?.split(',').map(c => c.trim()) || [];
      const values = params.values ? JSON.parse(params.values) : [];
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      return {
        query: `INSERT INTO ${params.table} (${columns.join(', ')}) VALUES (${placeholders})`,
        values: values,
      };
    }

    case 'update': {
      const columns = params.columns?.split(',').map(c => c.trim()) || [];
      const values = params.values ? JSON.parse(params.values) : [];
      const setClause = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
      return {
        query: `UPDATE ${params.table} SET ${setClause}${params.whereClause ? ` WHERE ${params.whereClause}` : ''}`,
        values: values,
      };
    }

    case 'delete':
      return {
        query: `DELETE FROM ${params.table}${params.whereClause ? ` WHERE ${params.whereClause}` : ''}`,
        values: queryParams,
      };

    default:
      throw new Error(`Unknown operation: ${params.operation}`);
  }
}

/**
 * Execute MS SQL Server query
 */
export async function executeMSSQL(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<DatabaseResult> {
  const params = node.parameters as unknown as SQLParams & OutputOptions & RetryOptions;
  const credentials = node.credentials as unknown as SQLCredentials & {
    trustServerCertificate?: boolean;
    encrypt?: boolean;
  };

  if (!credentials?.host || !credentials?.database) {
    throw new Error('MSSQL credentials required (host, database, username, password)');
  }

  const { query, values } = buildSQLQuery(params);

  const executeQuery = async (): Promise<DatabaseResult> => {
    // In production, use mssql package
    // const sql = require('mssql');
    // const pool = await sql.connect({...});
    // const result = await pool.request().query(query);

    console.log(`[MSSQL] Executing (timeout: ${params.timeout || 30}s): ${query}`, values);
    
    return {
      rows: [],
      rowCount: 0,
      success: true,
    };
  };

  const result = await withRetry(executeQuery, params);
  return handleOutput(result, params);
}

/**
 * Execute PostgreSQL query
 */
export async function executePostgreSQL(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<DatabaseResult> {
  const params = node.parameters as unknown as SQLParams & OutputOptions & RetryOptions & { schema?: string; sslMode?: string };
  const credentials = node.credentials as unknown as SQLCredentials;

  if (!credentials?.host || !credentials?.database) {
    throw new Error('PostgreSQL credentials required (host, database, username, password)');
  }

  const { query, values } = buildSQLQuery(params);

  const executeQuery = async (): Promise<DatabaseResult> => {
    // In production, use pg package
    // const { Pool } = require('pg');
    // const pool = new Pool({...});
    // const result = await pool.query(query, values);

    console.log(`[PostgreSQL] Executing (timeout: ${params.timeout || 30}s): ${query}`, values);
    
    return {
      rows: [],
      rowCount: 0,
      success: true,
    };
  };

  const result = await withRetry(executeQuery, params);
  return handleOutput(result, params);
}

/**
 * Execute MySQL query
 */
export async function executeMySQL(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<DatabaseResult> {
  const params = node.parameters as unknown as SQLParams & OutputOptions & RetryOptions;
  const credentials = node.credentials as unknown as SQLCredentials;

  if (!credentials?.host || !credentials?.database) {
    throw new Error('MySQL credentials required (host, database, username, password)');
  }

  const { query, values } = buildSQLQuery(params);

  const executeQuery = async (): Promise<DatabaseResult> => {
    // In production, use mysql2 package
    // const mysql = require('mysql2/promise');
    // const conn = await mysql.createConnection({...});
    // const [rows] = await conn.execute(query, values);

    console.log(`[MySQL] Executing (timeout: ${params.timeout || 30}s): ${query}`, values);
    
    return {
      rows: [],
      rowCount: 0,
      success: true,
    };
  };

  const result = await withRetry(executeQuery, params);
  return handleOutput(result, params);
}

/**
 * Execute Snowflake query
 */
export async function executeSnowflake(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<DatabaseResult> {
  const params = node.parameters as unknown as SQLParams & OutputOptions & RetryOptions & {
    warehouse?: string;
    database?: string;
    schema?: string;
    role?: string;
  };
  const credentials = node.credentials as unknown as {
    account: string;
    username: string;
    password: string;
  };

  if (!credentials?.account || !credentials?.username) {
    throw new Error('Snowflake credentials required (account, username, password)');
  }

  const { query, values } = buildSQLQuery(params);

  const executeQuery = async (): Promise<DatabaseResult> => {
    // In production, use snowflake-sdk package
    // const snowflake = require('snowflake-sdk');
    // const connection = snowflake.createConnection({...});

    console.log(`[Snowflake] Executing (timeout: ${params.timeout || 30}s): ${query}`, values);
    
    return {
      rows: [],
      rowCount: 0,
      success: true,
    };
  };

  const result = await withRetry(executeQuery, params);
  return handleOutput(result, params);
}

/**
 * Execute PrestoDB/Trino query
 */
export async function executePrestoDB(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<DatabaseResult> {
  const params = node.parameters as unknown as SQLParams & OutputOptions & RetryOptions & {
    catalog?: string;
    schema?: string;
    source?: string;
  };
  const credentials = node.credentials as unknown as SQLCredentials;

  if (!credentials?.host) {
    throw new Error('PrestoDB credentials required (host, port)');
  }

  const { query, values } = buildSQLQuery(params);

  const executeQuery = async (): Promise<DatabaseResult> => {
    // In production, use presto-client package
    // const presto = require('presto-client');
    // const client = new presto.Client({...});

    console.log(`[PrestoDB] Executing (timeout: ${params.timeout || 30}s): ${query}`, values);
    
    return {
      rows: [],
      rowCount: 0,
      success: true,
    };
  };

  const result = await withRetry(executeQuery, params);
  return handleOutput(result, params);
}

// ============================================================================
// Cassandra Implementation
// ============================================================================

interface CassandraParams {
  operation: 'executeQuery' | 'insert' | 'update' | 'delete';
  query?: string;
  keyspace?: string;
  table?: string;
  values?: string;
  whereClause?: string;
  queryParameters?: string;
  consistencyLevel?: string;
  ttl?: number;
}

/**
 * Execute Cassandra query
 */
export async function executeCassandra(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<DatabaseResult> {
  const params = node.parameters as unknown as CassandraParams & OutputOptions & RetryOptions;
  const credentials = node.credentials as unknown as {
    contactPoints: string[];
    localDataCenter: string;
    username?: string;
    password?: string;
  };

  if (!credentials?.contactPoints) {
    throw new Error('Cassandra credentials required (contactPoints, localDataCenter)');
  }

  let query: string;
  const queryParams = params.queryParameters ? JSON.parse(params.queryParameters) : [];

  switch (params.operation) {
    case 'executeQuery':
      query = params.query || '';
      break;
    case 'insert': {
      const values = params.values ? JSON.parse(params.values) : {};
      const columns = Object.keys(values);
      const placeholders = columns.map(() => '?').join(', ');
      query = `INSERT INTO ${params.keyspace}.${params.table} (${columns.join(', ')}) VALUES (${placeholders})`;
      if (params.ttl) query += ` USING TTL ${params.ttl}`;
      break;
    }
    case 'update': {
      const values = params.values ? JSON.parse(params.values) : {};
      const setClause = Object.keys(values).map(k => `${k} = ?`).join(', ');
      query = `UPDATE ${params.keyspace}.${params.table} SET ${setClause}`;
      if (params.ttl) query += ` USING TTL ${params.ttl}`;
      if (params.whereClause) query += ` WHERE ${params.whereClause}`;
      break;
    }
    case 'delete':
      query = `DELETE FROM ${params.keyspace}.${params.table}`;
      if (params.whereClause) query += ` WHERE ${params.whereClause}`;
      break;
    default:
      throw new Error(`Unknown operation: ${params.operation}`);
  }

  const executeQuery = async (): Promise<DatabaseResult> => {
    // In production, use cassandra-driver package
    // const cassandra = require('cassandra-driver');
    // const client = new cassandra.Client({...});

    console.log(`[Cassandra] Executing (timeout: ${params.timeout || 30}s): ${query}`, queryParams);
    
    return {
      rows: [],
      rowCount: 0,
      success: true,
    };
  };

  const result = await withRetry(executeQuery, params);
  return handleOutput(result, params);
}

// ============================================================================
// Redis/Valkey Implementation
// ============================================================================

interface RedisParams {
  operation: string;
  key?: string;
  value?: string;
  field?: string;
  pattern?: string;
  start?: number;
  stop?: number;
  ttl?: number;
  command?: string;
  database?: number;
}

/**
 * Execute Redis command
 */
export async function executeRedis(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<unknown> {
  const params = node.parameters as unknown as RedisParams & OutputOptions & RetryOptions;
  const credentials = node.credentials as unknown as {
    host: string;
    port?: number;
    password?: string;
  };

  if (!credentials?.host) {
    throw new Error('Redis credentials required (host)');
  }

  const executeCommand = async (): Promise<{ result: unknown; success: boolean }> => {
    // In production, use ioredis package
    // const Redis = require('ioredis');
    // const redis = new Redis({...});

    let result: unknown;

    switch (params.operation) {
      case 'get':
        console.log(`[Redis] GET ${params.key} (timeout: ${params.timeout || 30}s)`);
        result = null;
        break;
      case 'set':
        console.log(`[Redis] SET ${params.key} ${params.value}`);
        result = 'OK';
        break;
      case 'delete':
        console.log(`[Redis] DEL ${params.key}`);
        result = 1;
        break;
      case 'keys':
        console.log(`[Redis] KEYS ${params.pattern}`);
        result = [];
        break;
      case 'hget':
        console.log(`[Redis] HGET ${params.key} ${params.field}`);
        result = null;
        break;
      case 'hset':
        console.log(`[Redis] HSET ${params.key} ${params.field} ${params.value}`);
        result = 1;
        break;
      case 'hgetall':
        console.log(`[Redis] HGETALL ${params.key}`);
        result = {};
        break;
      case 'lpush':
        console.log(`[Redis] LPUSH ${params.key} ${params.value}`);
        result = 1;
        break;
      case 'lpop':
        console.log(`[Redis] LPOP ${params.key}`);
        result = null;
        break;
      case 'lrange':
        console.log(`[Redis] LRANGE ${params.key} ${params.start} ${params.stop}`);
        result = [];
        break;
      case 'sadd':
        console.log(`[Redis] SADD ${params.key} ${params.value}`);
        result = 1;
        break;
      case 'smembers':
        console.log(`[Redis] SMEMBERS ${params.key}`);
        result = [];
        break;
      case 'publish':
        console.log(`[Redis] PUBLISH ${params.key} ${params.value}`);
        result = 0;
        break;
      case 'executeCommand':
        console.log(`[Redis] ${params.command}`);
        result = null;
        break;
      default:
        throw new Error(`Unknown Redis operation: ${params.operation}`);
    }

    return { result, success: true };
  };

  return withRetry(executeCommand, params);
}

/**
 * Execute Valkey command (Redis-compatible)
 */
export async function executeValkey(
  node: WorkflowNode,
  inputData: unknown,
): Promise<unknown> {
  // Valkey is Redis-compatible, use same implementation
  return executeRedis(node, inputData);
}

// ============================================================================
// OpenSearch/Elasticsearch Implementation
// ============================================================================

interface SearchEngineParams {
  operation: string;
  index: string;
  query?: string;
  sqlQuery?: string;
  documentId?: string;
  document?: string;
  bulkData?: string;
  indexSettings?: string;
  size?: number;
  from?: number;
}

interface SearchResult {
  hits: unknown[];
  total: number;
  took: number;
  success: boolean;
}

/**
 * Execute OpenSearch operation
 */
export async function executeOpenSearch(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<SearchResult | unknown> {
  const params = node.parameters as unknown as SearchEngineParams & OutputOptions & RetryOptions;
  const credentials = node.credentials as unknown as {
    host: string;
    port?: number;
    username?: string;
    password?: string;
    useSSL?: boolean;
  };

  if (!credentials?.host) {
    throw new Error('OpenSearch credentials required (host)');
  }

  // Base URL for API calls (used in production implementation)
  void `${credentials.useSSL ? 'https' : 'http'}://${credentials.host}:${credentials.port || 9200}`;

  const executeOperation = async (): Promise<SearchResult | unknown> => {
    switch (params.operation) {
      case 'search': {
        const query = params.query ? JSON.parse(params.query) : { query: { match_all: {} } };
        console.log(`[OpenSearch] Search ${params.index} (timeout: ${params.timeout || 30}s):`, query);
        return { hits: [], total: 0, took: 0, success: true };
      }
      case 'sql': {
        console.log(`[OpenSearch] SQL (timeout: ${params.timeout || 30}s): ${params.sqlQuery}`);
        return { rows: [], success: true };
      }
      case 'index': {
        const doc = params.document ? JSON.parse(params.document) : {};
        console.log(`[OpenSearch] Index ${params.index}/${params.documentId}:`, doc);
        return { _id: params.documentId, result: 'created', success: true };
      }
      case 'get': {
        console.log(`[OpenSearch] Get ${params.index}/${params.documentId}`);
        return { _id: params.documentId, _source: {}, found: true, success: true };
      }
      case 'update': {
        const doc = params.document ? JSON.parse(params.document) : {};
        console.log(`[OpenSearch] Update ${params.index}/${params.documentId}:`, doc);
        return { _id: params.documentId, result: 'updated', success: true };
      }
      case 'delete': {
        console.log(`[OpenSearch] Delete ${params.index}/${params.documentId}`);
        return { _id: params.documentId, result: 'deleted', success: true };
      }
      case 'bulk': {
        const data = params.bulkData ? JSON.parse(params.bulkData) : [];
        console.log(`[OpenSearch] Bulk operation: ${data.length} items`);
        return { took: 0, errors: false, items: [], success: true };
      }
      case 'createIndex': {
        const settings = params.indexSettings ? JSON.parse(params.indexSettings) : {};
        console.log(`[OpenSearch] Create index ${params.index}:`, settings);
        return { acknowledged: true, index: params.index, success: true };
      }
      case 'deleteIndex': {
        console.log(`[OpenSearch] Delete index ${params.index}`);
        return { acknowledged: true, success: true };
      }
      default:
        throw new Error(`Unknown OpenSearch operation: ${params.operation}`);
    }
  };

  return withRetry(executeOperation, params);
}

/**
 * Execute Elasticsearch operation
 */
export async function executeElasticsearch(
  node: WorkflowNode,
  inputData: unknown,
): Promise<SearchResult | unknown> {
  // Elasticsearch API is compatible with OpenSearch
  return executeOpenSearch(node, inputData);
}
