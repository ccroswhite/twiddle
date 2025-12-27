/**
 * Airflow Adapter
 * 
 * Converts Twiddle IR to Airflow-specific data model for DAG generation.
 */

import type {
    TwiddleWorkflowIR,
    TwiddleNode,
    TwiddleConnection,
} from '../ir/index.js';

/**
 * Mapping from Twiddle node types to Airflow operators
 */
export const NODE_TO_OPERATOR: Record<string, AirflowOperatorType> = {
    'twiddle.httpRequest': {
        operator: 'SimpleHttpOperator',
        module: 'airflow.providers.http.operators.http',
    },
    'twiddle.runScript': {
        operator: 'BashOperator',
        module: 'airflow.operators.bash',
    },
    'twiddle.pythonCode': {
        operator: 'PythonOperator',
        module: 'airflow.operators.python',
    },
    'twiddle.sshCommand': {
        operator: 'SSHOperator',
        module: 'airflow.providers.ssh.operators.ssh',
    },
    'twiddle.sendEmail': {
        operator: 'EmailOperator',
        module: 'airflow.operators.email',
    },
    'twiddle.delay': {
        operator: 'TimeDeltaSensor',
        module: 'airflow.sensors.time_delta',
    },
    'twiddle.database': {
        operator: 'PythonOperator', // Use Python for flexibility
        module: 'airflow.operators.python',
    },
    'twiddle.s3': {
        operator: 'PythonOperator', // Use Python for S3 operations
        module: 'airflow.operators.python',
    },
    'twiddle.sendSlackMessage': {
        operator: 'SlackWebhookOperator',
        module: 'airflow.providers.slack.operators.slack_webhook',
    },
    'twiddle.log': {
        operator: 'PythonOperator',
        module: 'airflow.operators.python',
    },
    'twiddle.conditional': {
        operator: 'BranchPythonOperator',
        module: 'airflow.operators.python',
    },
};

/**
 * Airflow operator type info
 */
export interface AirflowOperatorType {
    operator: string;
    module: string;
}

/**
 * An Airflow task (operator instance)
 */
export interface AirflowTask {
    /** Task ID (Python identifier) */
    taskId: string;
    /** Original node ID */
    nodeId: string;
    /** Display name */
    name: string;
    /** Operator class */
    operator: string;
    /** Import module for the operator */
    operatorModule: string;
    /** Operator kwargs */
    kwargs: Record<string, unknown>;
    /** Retries */
    retries: number;
    /** Retry delay in seconds */
    retryDelay: number;
    /** Execution timeout in seconds */
    executionTimeout?: number;
    /** Original node type */
    nodeType: string;
    /** Whether this is a branching task */
    isBranch: boolean;
}

/**
 * Task dependency
 */
export interface TaskDependency {
    /** Upstream task ID */
    upstream: string;
    /** Downstream task ID */
    downstream: string;
}

/**
 * Airflow DAG model for code generation
 */
export interface AirflowDAG {
    /** DAG ID */
    dagId: string;
    /** DAG description */
    description?: string;
    /** Schedule interval (cron or timedelta) */
    scheduleInterval: string | null;
    /** Default args for all tasks */
    defaultArgs: Record<string, unknown>;
    /** Tags */
    tags: string[];
    /** Tasks */
    tasks: AirflowTask[];
    /** Dependencies */
    dependencies: TaskDependency[];
    /** Required imports */
    imports: Set<string>;
    /** Catchup enabled */
    catchup: boolean;
}

/**
 * Trigger node types (not tasks)
 */
const TRIGGER_TYPES = new Set([
    'twiddle.manualTrigger',
    'twiddle.webhook',
    'twiddle.interval',
]);

/**
 * Convert node name to valid Python identifier
 */
function toTaskId(name: string, nodeId: string): string {
    const cleaned = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/^(\d)/, '_$1');
    return cleaned || `task_${nodeId.slice(-6)}`;
}

/**
 * Convert workflow name to DAG ID
 */
function toDagId(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'twiddle_dag';
}

/**
 * Get Airflow operator info for a node type
 */
function getOperatorInfo(nodeType: string): AirflowOperatorType {
    return NODE_TO_OPERATOR[nodeType] || {
        operator: 'PythonOperator',
        module: 'airflow.operators.python',
    };
}

/**
 * Build operator kwargs based on node type
 */
function buildOperatorKwargs(node: TwiddleNode): Record<string, unknown> {
    const params = node.parameters || {};

    switch (node.type) {
        case 'twiddle.httpRequest':
            return {
                http_conn_id: 'http_default',
                endpoint: params.url as string || '',
                method: (params.method as string || 'GET').toUpperCase(),
                headers: params.headers || {},
                data: params.body,
            };

        case 'twiddle.runScript':
            return {
                bash_command: params.command as string || params.script as string || 'echo "No command"',
            };

        case 'twiddle.pythonCode':
            return {
                python_callable: `_${toTaskId(node.name, node.id)}_callable`,
                op_kwargs: params,
            };

        case 'twiddle.sshCommand':
            return {
                ssh_conn_id: 'ssh_default',
                command: params.command as string || '',
            };

        case 'twiddle.sendEmail':
            return {
                to: params.to || [],
                subject: params.subject || '',
                html_content: params.body || params.content || '',
            };

        case 'twiddle.delay':
            return {
                delta: `timedelta(seconds=${params.seconds || 60})`,
            };

        case 'twiddle.sendSlackMessage':
            return {
                slack_webhook_conn_id: 'slack_default',
                message: params.message || '',
                channel: params.channel,
            };

        case 'twiddle.conditional':
            return {
                python_callable: `_${toTaskId(node.name, node.id)}_branch`,
                provide_context: true,
            };

        default:
            // For unknown types, use PythonOperator with generic callable
            return {
                python_callable: `_${toTaskId(node.name, node.id)}_callable`,
                op_kwargs: params,
            };
    }
}

/**
 * Convert IR node to Airflow task
 */
function nodeToTask(node: TwiddleNode): AirflowTask {
    const operatorInfo = getOperatorInfo(node.type);
    const taskId = toTaskId(node.name, node.id);

    return {
        taskId,
        nodeId: node.id,
        name: node.name,
        operator: operatorInfo.operator,
        operatorModule: operatorInfo.module,
        kwargs: buildOperatorKwargs(node),
        retries: node.activityOptions?.retryPolicy?.maxAttempts || 1,
        retryDelay: 300, // 5 minutes default
        executionTimeout: node.activityOptions?.startToCloseTimeout,
        nodeType: node.type,
        isBranch: node.type === 'twiddle.conditional',
    };
}

/**
 * Build task dependencies from connections
 */
function buildDependencies(
    nodes: TwiddleNode[],
    connections: TwiddleConnection[],
    taskIdMap: Map<string, string>
): TaskDependency[] {
    const dependencies: TaskDependency[] = [];

    for (const conn of connections) {
        // Skip connections from triggers
        const sourceNode = nodes.find(n => n.id === conn.source);
        if (sourceNode && TRIGGER_TYPES.has(sourceNode.type)) {
            continue;
        }

        // Skip if source or target is a trigger
        const targetNode = nodes.find(n => n.id === conn.target);
        if (targetNode && TRIGGER_TYPES.has(targetNode.type)) {
            continue;
        }

        const upstreamId = taskIdMap.get(conn.source);
        const downstreamId = taskIdMap.get(conn.target);

        if (upstreamId && downstreamId) {
            dependencies.push({
                upstream: upstreamId,
                downstream: downstreamId,
            });
        }
    }

    return dependencies;
}

/**
 * Collect all required imports
 */
function collectImports(tasks: AirflowTask[]): Set<string> {
    const imports = new Set<string>();

    // Always needed
    imports.add('from datetime import datetime, timedelta');
    imports.add('from airflow import DAG');

    // Collect operator imports
    for (const task of tasks) {
        imports.add(`from ${task.operatorModule} import ${task.operator}`);
    }

    return imports;
}

/**
 * Convert Twiddle IR to Airflow DAG model
 * 
 * @param ir - Twiddle Workflow IR
 * @returns Airflow DAG model
 */
export function irToAirflow(ir: TwiddleWorkflowIR): AirflowDAG {
    // Filter out trigger nodes
    const taskNodes = ir.nodes.filter(n => !TRIGGER_TYPES.has(n.type));

    // Convert nodes to tasks
    const tasks = taskNodes.map(nodeToTask);

    // Build node ID to task ID map
    const taskIdMap = new Map<string, string>();
    for (const task of tasks) {
        taskIdMap.set(task.nodeId, task.taskId);
    }

    // Build dependencies
    const dependencies = buildDependencies(ir.nodes, ir.connections, taskIdMap);

    // Collect imports
    const imports = collectImports(tasks);

    // Determine schedule from trigger nodes
    const intervalNode = ir.nodes.find(n => n.type === 'twiddle.interval');
    let scheduleInterval: string | null = null;
    if (intervalNode?.parameters?.cron) {
        scheduleInterval = intervalNode.parameters.cron as string;
    } else if (intervalNode?.parameters?.interval) {
        const minutes = intervalNode.parameters.interval as number;
        scheduleInterval = `timedelta(minutes=${minutes})`;
    }

    return {
        dagId: toDagId(ir.workflow.name),
        description: ir.workflow.description,
        scheduleInterval,
        defaultArgs: {
            owner: 'twiddle',
            depends_on_past: false,
            email_on_failure: false,
            email_on_retry: false,
            retries: 1,
            retry_delay: 'timedelta(minutes=5)',
        },
        tags: ir.workflow.tags || [],
        tasks,
        dependencies,
        imports,
        catchup: false,
    };
}
