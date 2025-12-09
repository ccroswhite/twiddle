/**
 * Activity implementations for Temporal workflows
 */
import { Context } from '@temporalio/activity';
// WorkflowNode type is used in activity implementations
import type { ExecuteNodeInput } from '@twiddle/workflows';

import { executeHttpRequest } from './http-request.js';
import { executeCode } from './code.js';
import { executeIf } from './if.js';
import { executeSwitch } from './switch.js';
import { executeSetData } from './set-data.js';
import { executeWinRM } from './winrm.js';
import { executeSSH } from './ssh.js';
import {
  executeMSSQL,
  executePostgreSQL,
  executeMySQL,
  executeCassandra,
  executeRedis,
  executeValkey,
  executeOpenSearch,
  executeElasticsearch,
  executeSnowflake,
  executePrestoDB,
} from './database.js';

/**
 * Main activity that executes a workflow node
 */
export async function executeNode(input: ExecuteNodeInput): Promise<unknown> {
  const { node, inputData } = input;

  Context.current().heartbeat(`Executing node: ${node.name}`);

  switch (node.type) {
    case 'twiddle.manualTrigger':
      // Manual trigger just passes through the input
      return inputData;

    case 'twiddle.httpRequest':
      return executeHttpRequest(node, inputData);

    case 'twiddle.code':
      return executeCode(node, inputData);

    case 'twiddle.if':
      return executeIf(node, inputData);

    case 'twiddle.switch':
      return executeSwitch(node, inputData);

    case 'twiddle.setData':
      return executeSetData(node, inputData);

    case 'twiddle.winrm':
      return executeWinRM(node, inputData);

    case 'twiddle.ssh':
      return executeSSH(node, inputData);

    // Database nodes
    case 'twiddle.mssql':
      return executeMSSQL(node, inputData);

    case 'twiddle.postgresql':
      return executePostgreSQL(node, inputData);

    case 'twiddle.mysql':
      return executeMySQL(node, inputData);

    case 'twiddle.cassandra':
      return executeCassandra(node, inputData);

    case 'twiddle.redis':
      return executeRedis(node, inputData);

    case 'twiddle.valkey':
      return executeValkey(node, inputData);

    case 'twiddle.opensearch':
      return executeOpenSearch(node, inputData);

    case 'twiddle.elasticsearch':
      return executeElasticsearch(node, inputData);

    case 'twiddle.snowflake':
      return executeSnowflake(node, inputData);

    case 'twiddle.prestodb':
      return executePrestoDB(node, inputData);

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

/**
 * Evaluate conditions for If node
 */
export async function evaluateCondition(
  conditions: unknown,
  _data: unknown,
): Promise<{ branch: 'true' | 'false' }> {
  // Simple condition evaluation
  // In a real implementation, this would be more sophisticated
  const result = Boolean(conditions);
  return { branch: result ? 'true' : 'false' };
}
