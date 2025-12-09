import type { NodeDefinition, NodeTypeInfo } from '@twiddle/shared';
import {
  StartNode,
  ManualTriggerNode,
  WebhookNode,
  IntervalNode,
  HttpRequestNode,
  RespondToWebhookNode,
  HtmlExtractNode,
  CodeNode,
  IfNode,
  SwitchNode,
  SetDataNode,
  DateTimeNode,
  WaitNode,
  WinRMNode,
  SSHNode,
  ReportNode,
  SlackNode,
  // Database nodes
  MSSqlNode,
  PostgreSQLNode,
  MySQLNode,
  OracleNode,
  CassandraNode,
  RedisNode,
  ValkeyNode,
  OpenSearchNode,
  ElasticsearchNode,
  SnowflakeNode,
  PrestoDBNode,
  GraphQLNode,
} from './definitions/index.js';

const nodeRegistry = new Map<string, NodeDefinition>();

// Register all built-in nodes
const builtInNodes: NodeDefinition[] = [
  StartNode,
  ManualTriggerNode,
  WebhookNode,
  IntervalNode,
  HttpRequestNode,
  RespondToWebhookNode,
  HtmlExtractNode,
  CodeNode,
  IfNode,
  SwitchNode,
  SetDataNode,
  DateTimeNode,
  WaitNode,
  WinRMNode,
  SSHNode,
  ReportNode,
  SlackNode,
  // Database nodes
  MSSqlNode,
  PostgreSQLNode,
  MySQLNode,
  OracleNode,
  CassandraNode,
  RedisNode,
  ValkeyNode,
  OpenSearchNode,
  ElasticsearchNode,
  SnowflakeNode,
  PrestoDBNode,
  GraphQLNode,
];

for (const node of builtInNodes) {
  nodeRegistry.set(node.type, node);
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return nodeRegistry.get(type);
}

export function getAllNodeDefinitions(): NodeDefinition[] {
  return Array.from(nodeRegistry.values());
}

export function getNodeTypeInfoList(): NodeTypeInfo[] {
  return getAllNodeDefinitions().map((node) => ({
    type: node.type,
    displayName: node.displayName,
    description: node.description,
    icon: node.icon,
    iconColor: node.iconColor,
    category: node.category,
  }));
}

export function registerNode(definition: NodeDefinition): void {
  nodeRegistry.set(definition.type, definition);
}

export function isNodeTypeRegistered(type: string): boolean {
  return nodeRegistry.has(type);
}
