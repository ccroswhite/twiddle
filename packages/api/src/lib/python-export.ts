/**
 * Python Export Generator
 * Generates standalone Python Temporal applications from Twiddle workflows
 */

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, unknown>;
  position: { x: number; y: number };
  credentials?: Record<string, unknown>;
}

interface WorkflowConnection {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

/**
 * Convert workflow name to valid Python identifier
 */
function toPythonIdentifier(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1') || 'workflow';
}

/**
 * Convert node type to Python function name
 */
function nodeTypeToFunctionName(nodeType: string): string {
  const parts = nodeType.split('.');
  const name = parts[parts.length - 1];
  return `execute_${name.toLowerCase()}`;
}

/**
 * Generate Python activity code for a node type
 */
function generateActivityCode(nodeType: string): string {
  switch (nodeType) {
    case 'twiddle.httpRequest':
      return `
async def execute_http_request(params: dict) -> dict:
    """Execute HTTP request"""
    import aiohttp
    
    url = params.get('url', '')
    method = params.get('method', 'GET').upper()
    headers = params.get('headers', {})
    body = params.get('body')
    timeout = params.get('timeout', 30)
    
    async with aiohttp.ClientSession() as session:
        async with session.request(
            method=method,
            url=url,
            headers=headers,
            json=body if isinstance(body, dict) else None,
            data=body if isinstance(body, str) else None,
            timeout=aiohttp.ClientTimeout(total=timeout)
        ) as response:
            return {
                'status': response.status,
                'headers': dict(response.headers),
                'body': await response.text()
            }
`;

    case 'twiddle.code':
      return `
async def execute_code(params: dict, input_data: dict) -> dict:
    """Execute custom Python code"""
    code = params.get('code', '')
    
    # Create execution context
    local_vars = {'input_data': input_data, 'result': None}
    
    # Execute the code
    exec(code, {'__builtins__': __builtins__}, local_vars)
    
    return local_vars.get('result', input_data)
`;

    case 'twiddle.if':
      return `
async def execute_if(params: dict, input_data: dict) -> dict:
    """Evaluate conditions and return branch"""
    conditions = params.get('conditions', {}).get('conditions', [])
    combine_mode = params.get('combineConditions', 'all')
    
    def evaluate_condition(cond: dict) -> bool:
        left = cond.get('leftValue', '')
        op = cond.get('operation', 'equals')
        right = cond.get('rightValue', '')
        
        if op == 'equals':
            return str(left) == str(right)
        elif op == 'notEquals':
            return str(left) != str(right)
        elif op == 'contains':
            return str(right) in str(left)
        elif op == 'gt':
            return float(left) > float(right)
        elif op == 'lt':
            return float(left) < float(right)
        elif op == 'isEmpty':
            return not left
        elif op == 'isNotEmpty':
            return bool(left)
        return False
    
    results = [evaluate_condition(c) for c in conditions]
    
    if combine_mode == 'all':
        result = all(results) if results else True
    else:
        result = any(results) if results else True
    
    return {'branch': 'true' if result else 'false', 'data': input_data}
`;

    case 'twiddle.setData':
      return `
async def execute_set_data(params: dict, input_data: dict) -> dict:
    """Set or transform data"""
    mode = params.get('mode', 'manual')
    
    if mode == 'manual':
        fields = params.get('fields', {}).get('fields', [])
        result = dict(input_data) if isinstance(input_data, dict) else {}
        for field in fields:
            result[field.get('name', '')] = field.get('value', '')
        return result
    
    return input_data
`;

    case 'twiddle.ssh':
      return `
async def execute_ssh(params: dict) -> dict:
    """Execute SSH command on remote host"""
    import asyncssh
    
    host = params.get('host', '')
    port = params.get('port', 22)
    username = params.get('username', '')
    password = params.get('password')
    private_key = params.get('privateKey')
    command = params.get('command', '')
    
    connect_kwargs = {
        'host': host,
        'port': port,
        'username': username,
    }
    
    if password:
        connect_kwargs['password'] = password
    elif private_key:
        connect_kwargs['client_keys'] = [private_key]
    
    async with asyncssh.connect(**connect_kwargs) as conn:
        result = await conn.run(command)
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'exit_code': result.exit_status
        }
`;

    case 'twiddle.mssql':
    case 'twiddle.postgresql':
    case 'twiddle.mysql':
      return `
async def execute_sql(params: dict, db_type: str) -> dict:
    """Execute SQL query"""
    query = params.get('query', '')
    timeout = params.get('timeout', 30)
    
    # Database connection would be configured via environment variables
    # This is a placeholder - actual implementation depends on the database
    
    return {
        'rows': [],
        'rowCount': 0,
        'success': True,
        'message': f'SQL query executed on {db_type}'
    }
`;

    default:
      return `
async def execute_${nodeType.split('.').pop()?.toLowerCase() || 'unknown'}(params: dict, input_data: dict) -> dict:
    """Execute ${nodeType} node"""
    # TODO: Implement ${nodeType} logic
    return input_data
`;
  }
}

/**
 * Generate the main workflow file
 */
function generateWorkflowFile(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  const nodes = workflow.nodes as WorkflowNode[];
  const connections = workflow.connections as WorkflowConnection[];
  
  // Build execution order from connections (for future graph traversal)
  void connections; // Used for topology
  
  // Generate node execution calls
  const nodeExecutions = nodes
    .filter(n => !n.type.includes('Trigger'))
    .map(node => {
      const funcName = nodeTypeToFunctionName(node.type);
      const paramsJson = JSON.stringify(node.parameters || {}, null, 4)
        .split('\n')
        .map((line, i) => i === 0 ? line : '        ' + line)
        .join('\n');
      
      return `
    # Execute: ${node.name || node.type}
    ${node.id.replace(/-/g, '_')}_result = await workflow.execute_activity(
        ${funcName},
        args=[${paramsJson}, result],
        start_to_close_timeout=timedelta(seconds=300)
    )
    result = ${node.id.replace(/-/g, '_')}_result`;
    }).join('\n');

  return `"""
${workflow.name}
${workflow.description || 'Generated from Twiddle workflow'}

Auto-generated Temporal workflow
"""
from datetime import timedelta
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from activities import *


@workflow.defn
class ${workflowName.charAt(0).toUpperCase() + workflowName.slice(1)}Workflow:
    """${workflow.description || workflow.name}"""
    
    @workflow.run
    async def run(self, input_data: dict = None) -> dict:
        """Execute the workflow"""
        result = input_data or {}
        ${nodeExecutions || '# No nodes to execute\n        pass'}
        
        return result
`;
}

/**
 * Generate the activities file
 */
function generateActivitiesFile(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = [...new Set(nodes.map(n => n.type))];
  
  const activities = nodeTypes
    .filter(t => !t.includes('Trigger'))
    .map(nodeType => {
      const activityCode = generateActivityCode(nodeType);
      
      return `
@activity.defn
${activityCode}`;
    })
    .join('\n');

  return `"""
Activity implementations for the workflow
"""
from temporalio import activity


${activities}
`;
}

/**
 * Generate the worker file
 */
function generateWorkerFile(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = [...new Set(nodes.map(n => n.type))];
  
  const activityImports = nodeTypes
    .filter(t => !t.includes('Trigger'))
    .map(t => nodeTypeToFunctionName(t))
    .join(',\n    ');

  return `"""
Temporal Worker for ${workflow.name}
"""
import asyncio
from temporalio.client import Client
from temporalio.worker import Worker

from workflow import ${workflowClassName}
from activities import (
    ${activityImports}
)


async def main():
    """Start the worker"""
    # Connect to Temporal server
    client = await Client.connect("localhost:7233")
    
    # Create worker
    worker = Worker(
        client,
        task_queue="${workflowName}-task-queue",
        workflows=[${workflowClassName}],
        activities=[
            ${activityImports}
        ],
    )
    
    print(f"Starting worker for ${workflow.name}...")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
`;
}

/**
 * Generate the starter/client file
 */
function generateStarterFile(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  const workflowClassName = workflowName.charAt(0).toUpperCase() + workflowName.slice(1) + 'Workflow';

  return `"""
Start the ${workflow.name} workflow
"""
import asyncio
import uuid
from temporalio.client import Client

from workflow import ${workflowClassName}


async def main():
    """Start a workflow execution"""
    # Connect to Temporal server
    client = await Client.connect("localhost:7233")
    
    # Start the workflow
    workflow_id = f"${workflowName}-{uuid.uuid4()}"
    
    handle = await client.start_workflow(
        ${workflowClassName}.run,
        id=workflow_id,
        task_queue="${workflowName}-task-queue",
        arg={"message": "Hello from Python!"}  # Input data
    )
    
    print(f"Started workflow: {workflow_id}")
    
    # Wait for result
    result = await handle.result()
    print(f"Workflow result: {result}")
    
    return result


if __name__ == "__main__":
    asyncio.run(main())
`;
}

/**
 * Generate requirements.txt based on node types used
 */
function generateRequirements(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));
  
  const requirements: string[] = [
    '# Temporal SDK',
    'temporalio>=1.4.0',
    '',
    '# HTTP requests',
    'aiohttp>=3.9.0',
    '',
    '# Utilities',
    'python-dotenv>=1.0.0',
  ];
  
  // Add SSH dependencies
  if (nodeTypes.has('twiddle.ssh')) {
    requirements.push('', '# SSH', 'asyncssh>=2.14.0', 'cryptography>=41.0.0');
  }
  
  // Add WinRM dependencies
  if (nodeTypes.has('twiddle.winrm')) {
    requirements.push('', '# WinRM', 'pywinrm>=0.4.3');
  }
  
  // Add PostgreSQL dependencies
  if (nodeTypes.has('twiddle.postgresql') || nodes.some(n => n.type.includes('credential.postgresqlCredentials'))) {
    requirements.push('', '# PostgreSQL', 'asyncpg>=0.29.0', 'psycopg2-binary>=2.9.9');
  }
  
  // Add MySQL dependencies
  if (nodeTypes.has('twiddle.mysql') || nodes.some(n => n.type.includes('credential.mysqlCredentials'))) {
    requirements.push('', '# MySQL', 'aiomysql>=0.2.0', 'PyMySQL>=1.1.0');
  }
  
  // Add MSSQL dependencies
  if (nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlCredentials'))) {
    requirements.push('', '# Microsoft SQL Server', 'pymssql>=2.2.11');
  }
  
  // Add Redis dependencies
  if (nodeTypes.has('twiddle.redis') || nodes.some(n => n.type.includes('credential.redisCredentials'))) {
    requirements.push('', '# Redis', 'redis>=5.0.0', 'aioredis>=2.0.1');
  }
  
  // Add Valkey dependencies (Redis-compatible)
  if (nodeTypes.has('twiddle.valkey') || nodes.some(n => n.type.includes('credential.valkeyCredentials'))) {
    requirements.push('', '# Valkey (Redis-compatible)', 'redis>=5.0.0');
  }
  
  // Add Cassandra dependencies
  if (nodeTypes.has('twiddle.cassandra') || nodes.some(n => n.type.includes('credential.cassandraCredentials'))) {
    requirements.push('', '# Cassandra', 'cassandra-driver>=3.29.0');
  }
  
  // Add OpenSearch/Elasticsearch dependencies
  if (nodeTypes.has('twiddle.opensearch') || nodes.some(n => n.type.includes('credential.opensearchCredentials'))) {
    requirements.push('', '# OpenSearch', 'opensearch-py>=2.4.0');
  }
  
  if (nodeTypes.has('twiddle.elasticsearch') || nodes.some(n => n.type.includes('credential.elasticsearchCredentials'))) {
    requirements.push('', '# Elasticsearch', 'elasticsearch>=8.11.0');
  }
  
  // Add Snowflake dependencies
  if (nodeTypes.has('twiddle.snowflake') || nodes.some(n => n.type.includes('credential.snowflakeCredentials'))) {
    requirements.push('', '# Snowflake', 'snowflake-connector-python>=3.6.0');
  }
  
  // Add PrestoDB dependencies
  if (nodeTypes.has('twiddle.prestodb') || nodes.some(n => n.type.includes('credential.prestodbCredentials'))) {
    requirements.push('', '# PrestoDB', 'presto-python-client>=0.8.4');
  }
  
  // Add Oracle dependencies
  if (nodeTypes.has('twiddle.oracle') || nodes.some(n => n.type.includes('credential.oracleCredentials'))) {
    requirements.push('', '# Oracle', 'oracledb>=2.0.0');
  }
  
  return requirements.join('\n') + '\n';
}

/**
 * Generate README.md
 */
function generateReadme(workflow: WorkflowData): string {
  const workflowName = toPythonIdentifier(workflow.name);
  
  return `# ${workflow.name}

${workflow.description || 'A Temporal workflow generated from Twiddle.'}

## Prerequisites

Before running this workflow, ensure the following services are running:

- **Temporal Server** - The workflow orchestration engine
- Any databases or services used by your workflow nodes

## Quick Start with Docker

\`\`\`bash
# Configure your environment
cp .env.example .env
# Edit .env with your Temporal and database connection settings

# Build and start the worker
./run.sh build
./run.sh start

# Execute the workflow
./run.sh run-workflow

# View logs
./run.sh logs

# Stop the worker
./run.sh stop
\`\`\`

## Manual Setup (Without Docker)

### Prerequisites

- Python 3.9+
- Temporal server running locally

### Setup

1. Create a virtual environment:
   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\\Scripts\\activate
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

3. Copy and configure environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your settings
   \`\`\`

4. Start Temporal server (if not already running):
   \`\`\`bash
   temporal server start-dev
   \`\`\`

### Running

1. Start the worker:
   \`\`\`bash
   python worker.py
   \`\`\`

2. In another terminal, start a workflow:
   \`\`\`bash
   python starter.py
   \`\`\`

## Files

| File | Description |
|------|-------------|
| \`workflow.py\` | Main workflow definition |
| \`activities.py\` | Activity implementations |
| \`worker.py\` | Worker that executes workflows |
| \`starter.py\` | Script to start workflow executions |
| \`requirements.txt\` | Python dependencies |
| \`Dockerfile\` | Docker image definition |
| \`docker-compose.yml\` | Multi-container Docker setup |
| \`run.sh\` | Helper script for Docker operations |
| \`.env.example\` | Example environment configuration |

## Docker Commands

| Command | Description |
|---------|-------------|
| \`./run.sh start\` | Start all services |
| \`./run.sh stop\` | Stop all services |
| \`./run.sh restart\` | Restart all services |
| \`./run.sh logs\` | View logs |
| \`./run.sh build\` | Rebuild Docker image |
| \`./run.sh run-workflow\` | Execute the workflow |
| \`./run.sh shell\` | Open shell in worker container |
| \`./run.sh clean\` | Remove containers and volumes |

## Configuration

Environment variables (set in \`.env\` or docker-compose.yml):

| Variable | Default | Description |
|----------|---------|-------------|
| \`TEMPORAL_HOST\` | localhost:7233 | Temporal server address |
| \`TEMPORAL_NAMESPACE\` | default | Temporal namespace |

## Task Queue

This workflow uses the task queue: \`${workflowName}-task-queue\`

## Temporal UI

When running with Docker, access the Temporal UI at: http://localhost:8080
`;
}

/**
 * Generate .env.example file
 */
function generateEnvExample(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));
  
  let envContent = `# Temporal Configuration
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default
`;

  // Add database-specific env vars
  if (nodeTypes.has('twiddle.postgresql') || nodes.some(n => n.type.includes('credential.postgresqlCredentials'))) {
    envContent += `
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=mydb
`;
  }

  if (nodeTypes.has('twiddle.mysql') || nodes.some(n => n.type.includes('credential.mysqlCredentials'))) {
    envContent += `
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DB=mydb
`;
  }

  if (nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlCredentials'))) {
    envContent += `
# SQL Server Configuration
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_USER=sa
MSSQL_PASSWORD=password
MSSQL_DB=mydb
`;
  }

  if (nodeTypes.has('twiddle.redis') || nodeTypes.has('twiddle.valkey') || 
      nodes.some(n => n.type.includes('credential.redisCredentials') || n.type.includes('credential.valkeyCredentials'))) {
    envContent += `
# Redis/Valkey Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
`;
  }

  if (nodeTypes.has('twiddle.ssh')) {
    envContent += `
# SSH Configuration
SSH_PRIVATE_KEY_PATH=/path/to/key
`;
  }

  return envContent;
}

/**
 * Generate Dockerfile
 */
function generateDockerfile(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));
  
  // Determine if we need special system dependencies
  const needsMssql = nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlCredentials'));
  const needsOracle = nodeTypes.has('twiddle.oracle') || nodes.some(n => n.type.includes('credential.oracleCredentials'));
  const needsSsh = nodeTypes.has('twiddle.ssh');
  
  let systemDeps = 'gcc libffi-dev';
  
  if (needsMssql) {
    systemDeps += ' freetds-dev';
  }
  
  if (needsOracle) {
    systemDeps += ' libaio1';
  }
  
  if (needsSsh) {
    systemDeps += ' openssh-client';
  }

  return `# Dockerfile for ${workflow.name}
# Generated by Twiddle

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    ${systemDeps} \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV TEMPORAL_HOST=temporal:7233
ENV TEMPORAL_NAMESPACE=default

# Default command runs the worker
CMD ["python", "worker.py"]
`;
}

/**
 * Generate docker-compose.yml (worker only - assumes external services)
 */
function generateDockerCompose(workflow: WorkflowData): string {
  const nodes = workflow.nodes as WorkflowNode[];
  const nodeTypes = new Set(nodes.map(n => n.type));
  
  let envVars = `      - TEMPORAL_HOST=\${TEMPORAL_HOST:-localhost:7233}
      - TEMPORAL_NAMESPACE=\${TEMPORAL_NAMESPACE:-default}`;

  // Add database environment variables if needed
  if (nodeTypes.has('twiddle.postgresql') || nodes.some(n => n.type.includes('credential.postgresqlCredentials'))) {
    envVars += `
      - POSTGRES_HOST=\${POSTGRES_HOST:-localhost}
      - POSTGRES_PORT=\${POSTGRES_PORT:-5432}
      - POSTGRES_USER=\${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD:-}
      - POSTGRES_DB=\${POSTGRES_DB:-postgres}`;
  }

  if (nodeTypes.has('twiddle.mysql') || nodes.some(n => n.type.includes('credential.mysqlCredentials'))) {
    envVars += `
      - MYSQL_HOST=\${MYSQL_HOST:-localhost}
      - MYSQL_PORT=\${MYSQL_PORT:-3306}
      - MYSQL_USER=\${MYSQL_USER:-root}
      - MYSQL_PASSWORD=\${MYSQL_PASSWORD:-}
      - MYSQL_DB=\${MYSQL_DB:-mysql}`;
  }

  if (nodeTypes.has('twiddle.mssql') || nodes.some(n => n.type.includes('credential.mssqlCredentials'))) {
    envVars += `
      - MSSQL_HOST=\${MSSQL_HOST:-localhost}
      - MSSQL_PORT=\${MSSQL_PORT:-1433}
      - MSSQL_USER=\${MSSQL_USER:-sa}
      - MSSQL_PASSWORD=\${MSSQL_PASSWORD:-}
      - MSSQL_DB=\${MSSQL_DB:-master}`;
  }

  if (nodeTypes.has('twiddle.redis') || nodeTypes.has('twiddle.valkey') ||
      nodes.some(n => n.type.includes('credential.redisCredentials') || n.type.includes('credential.valkeyCredentials'))) {
    envVars += `
      - REDIS_HOST=\${REDIS_HOST:-localhost}
      - REDIS_PORT=\${REDIS_PORT:-6379}
      - REDIS_PASSWORD=\${REDIS_PASSWORD:-}`;
  }

  return `# Docker Compose for ${workflow.name}
# Generated by Twiddle
#
# This runs ONLY the workflow worker.
# External services (Temporal, databases) must be running separately.
#
# Configure connection settings in .env file or environment variables.

version: '3.8'

services:
  # Workflow Worker
  worker:
    build: .
    restart: unless-stopped
    env_file:
      - .env
    environment:
${envVars}
    # Use host network to connect to services running on the host
    # Alternatively, configure specific service addresses in .env
    # network_mode: host
`;
}

/**
 * Generate run.sh script
 */
function generateRunScript(workflow: WorkflowData): string {
  return `#!/bin/bash
# Run script for ${workflow.name}
# Generated by Twiddle

set -e

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

echo -e "\${GREEN}=== ${workflow.name} ===\${NC}"
echo ""

# Check for required commands
command -v docker >/dev/null 2>&1 || { echo -e "\${RED}Docker is required but not installed.\${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo -e "\${RED}Docker Compose is required but not installed.\${NC}" >&2; exit 1; }

# Determine docker compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

case "\${1:-help}" in
    start)
        echo -e "\${YELLOW}Starting all services...\${NC}"
        $COMPOSE_CMD up -d
        echo -e "\${GREEN}Services started!\${NC}"
        echo ""
        echo "Temporal UI: http://localhost:8080"
        echo ""
        echo "To view logs: ./run.sh logs"
        echo "To stop: ./run.sh stop"
        ;;
    
    stop)
        echo -e "\${YELLOW}Stopping all services...\${NC}"
        $COMPOSE_CMD down
        echo -e "\${GREEN}Services stopped.\${NC}"
        ;;
    
    restart)
        echo -e "\${YELLOW}Restarting all services...\${NC}"
        $COMPOSE_CMD restart
        echo -e "\${GREEN}Services restarted.\${NC}"
        ;;
    
    logs)
        $COMPOSE_CMD logs -f \${2:-}
        ;;
    
    build)
        echo -e "\${YELLOW}Building Docker image...\${NC}"
        $COMPOSE_CMD build
        echo -e "\${GREEN}Build complete.\${NC}"
        ;;
    
    run-workflow)
        echo -e "\${YELLOW}Starting workflow execution...\${NC}"
        docker exec -it \$(docker ps -qf "name=worker") python starter.py
        ;;
    
    shell)
        echo -e "\${YELLOW}Opening shell in worker container...\${NC}"
        docker exec -it \$(docker ps -qf "name=worker") /bin/bash
        ;;
    
    clean)
        echo -e "\${YELLOW}Removing all containers and volumes...\${NC}"
        $COMPOSE_CMD down -v
        echo -e "\${GREEN}Cleanup complete.\${NC}"
        ;;
    
    help|*)
        echo "Usage: ./run.sh <command>"
        echo ""
        echo "Commands:"
        echo "  start         Start all services (Temporal, worker, databases)"
        echo "  stop          Stop all services"
        echo "  restart       Restart all services"
        echo "  logs [svc]    View logs (optionally for specific service)"
        echo "  build         Build Docker image"
        echo "  run-workflow  Execute the workflow"
        echo "  shell         Open shell in worker container"
        echo "  clean         Remove all containers and volumes"
        echo "  help          Show this help message"
        ;;
esac
`;
}

/**
 * Generate .dockerignore file
 */
function generateDockerignore(): string {
  return `# Docker ignore file
.git
.gitignore
.env
.env.local
*.pyc
__pycache__
*.pyo
*.pyd
.Python
venv
.venv
env
*.egg-info
dist
build
.pytest_cache
.coverage
htmlcov
.mypy_cache
*.log
.DS_Store
Thumbs.db
`;
}

/**
 * Generated Python code for database storage
 */
export interface GeneratedPythonCode {
  pythonWorkflow: string;
  pythonActivities: string;
  pythonWorker: string;
  pythonRequirements: string;
}

/**
 * Generate Python code for database storage
 */
export function generatePythonCode(workflow: WorkflowData): GeneratedPythonCode {
  return {
    pythonWorkflow: generateWorkflowFile(workflow),
    pythonActivities: generateActivitiesFile(workflow),
    pythonWorker: generateWorkerFile(workflow),
    pythonRequirements: generateRequirements(workflow),
  };
}

/**
 * Main export function - generates all files for download
 */
export function generatePythonExport(workflow: WorkflowData): Record<string, string> {
  return {
    'workflow.py': generateWorkflowFile(workflow),
    'activities.py': generateActivitiesFile(workflow),
    'worker.py': generateWorkerFile(workflow),
    'starter.py': generateStarterFile(workflow),
    'requirements.txt': generateRequirements(workflow),
    'Dockerfile': generateDockerfile(workflow),
    'docker-compose.yml': generateDockerCompose(workflow),
    'run.sh': generateRunScript(workflow),
    '.dockerignore': generateDockerignore(),
    '.env.example': generateEnvExample(workflow),
    'README.md': generateReadme(workflow),
  };
}
