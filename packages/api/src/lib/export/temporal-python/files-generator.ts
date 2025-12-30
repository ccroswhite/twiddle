/**
 * Auxiliary file generators for Temporal Python export.
 * Generates: requirements.txt, README.md, .env.example, Dockerfile, docker-compose.yml, run.sh, .dockerignore
 */

import type { WorkflowNode, WorkflowData } from './types.js';
import { toPythonIdentifier } from './utils.js';

/**
 * Generate requirements.txt based on node types used.
 */
export function generateRequirements(workflow: WorkflowData): string {
    const nodes = workflow.nodes as WorkflowNode[];
    const nodeTypes = new Set(nodes.map(n => n.type));

    const requirements: string[] = [
        '# Twiddle DSL',
        'twiddle-dsl>=1.0.0',
        '',
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
 * Generate README.md.
 */
export function generateReadme(workflow: WorkflowData): string {
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
| \`METRICS_PORT\` | (disabled) | Port for Prometheus metrics endpoint |

## Task Queue

This workflow uses the task queue: \`${workflowName}\`

The task queue name matches the workflow name for easy identification in the Temporal UI.

## Temporal UI

When running with Docker, access the Temporal UI at: http://localhost:8080

Filter by task queue \`${workflowName}\` to see only this workflow's executions.
`;
}

/**
 * Generate .env.example file.
 */
export function generateEnvExample(workflow: WorkflowData): string {
    const nodes = workflow.nodes as WorkflowNode[];
    const nodeTypes = new Set(nodes.map(n => n.type));
    const workflowName = toPythonIdentifier(workflow.name);

    let envContent = `# ${workflow.name} Configuration
# Generated by Twiddle

# Temporal Configuration
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default

# Task queue (matches workflow name)
# TASK_QUEUE=${workflowName}

# Prometheus Metrics (optional)
# Set to enable metrics endpoint on this port
# METRICS_PORT=9090
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
 * Generate Dockerfile.
 */
export function generateDockerfile(workflow: WorkflowData): string {
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
 * Generate docker-compose.yml (worker only - assumes external services).
 */
export function generateDockerCompose(workflow: WorkflowData): string {
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
 * Generate run.sh script.
 */
export function generateRunScript(workflow: WorkflowData): string {
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
 * Generate .dockerignore file.
 */
export function generateDockerignore(): string {
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
