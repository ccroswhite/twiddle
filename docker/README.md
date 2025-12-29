# Twiddle Development Environment

Docker Compose setup for running Temporal and Airflow locally for workflow development and testing.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 4GB of RAM allocated to Docker

## Quick Start

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Services

### Temporal (http://localhost:8443)

Temporal is used for durable workflow execution. The UI is available at http://localhost:8443.

Components:
- **temporal**: Temporal server (ports 7233, 8443)
- **temporal-admin-tools**: CLI tools for Temporal administration

Default namespace: `default`

### Airflow (http://localhost:8080)

Apache Airflow is used for DAG-based workflow scheduling. The UI is available at http://localhost:8080.

Default credentials:
- Username: `airflow`
- Password: `airflow`

Components:
- **airflow-webserver**: Airflow web UI (port 8080)
- **airflow-scheduler**: DAG scheduler
- **airflow-worker**: Celery worker for task execution
- **airflow-redis**: Redis for Celery message broker

### PostgreSQL

Shared PostgreSQL instance with multiple databases:
- **twiddle**: Twiddle application data
- **temporal**: Temporal server data
- **airflow**: Airflow metadata

## Configuration

### Environment Variables

Create a `.env` file in this directory to override defaults:

```env
# Temporal
TEMPORAL_VERSION=1.24.2

# Airflow
AIRFLOW_VERSION=2.8.1
AIRFLOW_ADMIN_USER=airflow
AIRFLOW_ADMIN_PASSWORD=airflow

# Resource limits
TEMPORAL_MEMORY_LIMIT=1g
AIRFLOW_MEMORY_LIMIT=2g
```

### Mounting Workflows

#### Temporal Workers
Mount your Temporal worker code to `/app/workers` in the temporal container.

#### Airflow DAGs
DAGs are automatically loaded from `./airflow/dags`. Place your exported Airflow DAGs here.

## Volumes

| Volume | Purpose |
|--------|---------|
| `postgres-data` | Shared PostgreSQL database persistence |
| `airflow-redis-data` | Airflow Redis persistence |
| `./airflow/logs` | Airflow task logs |

## Troubleshooting

### Temporal not starting
```bash
# Check Temporal logs
docker compose logs temporal

# Restart Temporal
docker compose restart temporal
```

### Airflow webserver shows "Scheduler Not Running"
Wait a few moments for the scheduler to fully initialize. If it persists:
```bash
docker compose restart airflow-scheduler
```

### Reset everything
```bash
docker compose down -v
docker compose up -d
```

## Resource Usage

Minimum recommended resources:
- **CPU**: 2 cores
- **Memory**: 4GB
- **Disk**: 2GB (more with workflow history)

## Ports Summary

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Shared database |
| Temporal gRPC | 7233 | Client connections |
| Temporal UI | 8443 | Web interface |
| Airflow UI | 8080 | Web interface |
| Redis | 6379 | Message broker (internal) |
