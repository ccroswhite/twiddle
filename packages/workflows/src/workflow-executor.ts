/**
 * Main Temporal workflow that executes Twiddle workflows
 */
import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
} from '@temporalio/workflow';

import type {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  ExecutionStatus,
  NodeExecutionResult,
} from '@twiddle/shared';

// Import activity types - actual implementations are in the worker
import type * as activities from './activities.js';

const { executeNode } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
  },
});

// Workflow input
export interface WorkflowExecutorInput {
  workflow: Workflow;
  inputData?: unknown;
  startNodeIds?: string[];
}

// Workflow state
interface WorkflowState {
  status: ExecutionStatus;
  currentNodeId: string | null;
  nodeResults: Map<string, NodeExecutionResult>;
  error?: string;
}

// Signals
export const cancelWorkflowSignal = defineSignal('cancelWorkflow');
export const pauseWorkflowSignal = defineSignal('pauseWorkflow');
export const resumeWorkflowSignal = defineSignal('resumeWorkflow');

// Queries
export const getStatusQuery = defineQuery<ExecutionStatus>('getStatus');
export const getNodeResultsQuery = defineQuery<NodeExecutionResult[]>('getNodeResults');
export const getCurrentNodeQuery = defineQuery<string | null>('getCurrentNode');

/**
 * Build a graph of node connections for traversal
 */
function buildNodeGraph(
  nodes: WorkflowNode[],
  connections: WorkflowConnection[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  // Initialize all nodes with empty arrays
  for (const node of nodes) {
    graph.set(node.id, []);
  }

  // Add connections
  for (const conn of connections) {
    const targets = graph.get(conn.sourceNodeId) || [];
    targets.push(conn.targetNodeId);
    graph.set(conn.sourceNodeId, targets);
  }

  return graph;
}

/**
 * Find trigger/start nodes (nodes with no incoming connections)
 */
function findStartNodes(
  nodes: WorkflowNode[],
  connections: WorkflowConnection[],
): WorkflowNode[] {
  const nodesWithIncoming = new Set(connections.map((c) => c.targetNodeId));
  return nodes.filter((n) => !nodesWithIncoming.has(n.id));
}

/**
 * Main workflow executor
 */
export async function executeWorkflow(input: WorkflowExecutorInput): Promise<{
  status: ExecutionStatus;
  nodeResults: NodeExecutionResult[];
  outputData?: unknown;
  error?: string;
}> {
  const { workflow, inputData, startNodeIds } = input;
  const { nodes, connections } = workflow;

  // Build execution state
  const state: WorkflowState = {
    status: 'running',
    currentNodeId: null,
    nodeResults: new Map(),
  };

  let isPaused = false;
  let isCancelled = false;

  // Set up signal handlers
  setHandler(cancelWorkflowSignal, () => {
    isCancelled = true;
    state.status = 'cancelled';
  });

  setHandler(pauseWorkflowSignal, () => {
    isPaused = true;
    state.status = 'waiting';
  });

  setHandler(resumeWorkflowSignal, () => {
    isPaused = false;
    if (state.status === 'waiting') {
      state.status = 'running';
    }
  });

  // Set up query handlers
  setHandler(getStatusQuery, () => state.status);
  setHandler(getNodeResultsQuery, () => Array.from(state.nodeResults.values()));
  setHandler(getCurrentNodeQuery, () => state.currentNodeId);

  // Build node graph and find start nodes
  const nodeGraph = buildNodeGraph(nodes, connections);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Determine starting nodes
  let startNodes: WorkflowNode[];
  if (startNodeIds && startNodeIds.length > 0) {
    startNodes = startNodeIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is WorkflowNode => n !== undefined);
  } else {
    startNodes = findStartNodes(nodes, connections);
  }

  if (startNodes.length === 0) {
    return {
      status: 'failed',
      nodeResults: [],
      error: 'No start nodes found in workflow',
    };
  }

  // Execute nodes in topological order
  const executed = new Set<string>();
  const queue: string[] = startNodes.map((n) => n.id);
  let lastOutput: unknown = inputData;

  try {
    while (queue.length > 0 && !isCancelled) {
      // Check for pause
      if (isPaused) {
        await condition(() => !isPaused || isCancelled);
        if (isCancelled) break;
      }

      const nodeId = queue.shift()!;
      if (executed.has(nodeId)) continue;

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      // Skip disabled nodes
      if (node.disabled) {
        executed.add(nodeId);
        const nextNodes = nodeGraph.get(nodeId) || [];
        queue.push(...nextNodes);
        continue;
      }

      state.currentNodeId = nodeId;

      // Execute the node
      const startTime = new Date();
      let result: NodeExecutionResult;

      try {
        const nodeOutput = await executeNode({
          node,
          inputData: lastOutput,
          credentials: node.credentials,
        });

        result = {
          nodeId,
          nodeName: node.name,
          nodeType: node.type,
          status: 'completed',
          startTime,
          endTime: new Date(),
          data: nodeOutput,
        };

        lastOutput = nodeOutput;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (node.continueOnFail) {
          result = {
            nodeId,
            nodeName: node.name,
            nodeType: node.type,
            status: 'failed',
            startTime,
            endTime: new Date(),
            error: { message: errorMessage, nodeId },
          };
        } else {
          result = {
            nodeId,
            nodeName: node.name,
            nodeType: node.type,
            status: 'failed',
            startTime,
            endTime: new Date(),
            error: { message: errorMessage, nodeId },
          };
          state.nodeResults.set(nodeId, result);
          throw error;
        }
      }

      state.nodeResults.set(nodeId, result);
      executed.add(nodeId);

      // Handle conditional routing for If nodes
      if (node.type === 'twiddle.if' && result.data !== undefined) {
        const conditionResult = result.data as { branch: 'true' | 'false' };
        const allConnections = connections.filter((c) => c.sourceNodeId === nodeId);
        const nextConnections = allConnections.filter(
          (c) => c.sourceOutput === conditionResult.branch,
        );
        queue.push(...nextConnections.map((c) => c.targetNodeId));
      } else {
        // Add next nodes to queue
        const nextNodes = nodeGraph.get(nodeId) || [];
        queue.push(...nextNodes);
      }
    }

    state.status = isCancelled ? 'cancelled' : 'completed';
    state.currentNodeId = null;

    return {
      status: state.status,
      nodeResults: Array.from(state.nodeResults.values()),
      outputData: lastOutput,
    };
  } catch (error) {
    state.status = 'failed';
    state.currentNodeId = null;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      status: 'failed',
      nodeResults: Array.from(state.nodeResults.values()),
      error: errorMessage,
    };
  }
}
