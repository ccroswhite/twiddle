# Twiddle

A workflow automation platform similar to n8n, powered by [Temporal](https://temporal.io) and [Apache Airflow](https://airflow.apache.org) for reliable workflow execution.

## Features

- **Visual Workflow Editor** - Drag-and-drop interface for building workflows
- **Multi-Target Export** - Export workflows to Temporal or Airflow
- **Python DSL** - Define activities and workflows using Python decorators
- **Real-time Monitoring** - Track workflow executions with waterfall visualization
- **Credential Management** - Secure storage for API keys and credentials
- **Folder Organization** - Organize workflows with nested folders and permissions
- **Version History** - Track and restore previous workflow versions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   (React + Vite + TailwindCSS)               │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      API Server                              │
│                  (Fastify + Prisma)                          │
└───────────┬─────────────────────────────────┬───────────────┘
            │                                 │
            ▼                                 ▼
┌─────────────────────┐           ┌─────────────────────────┐
│     PostgreSQL      │           │     Export Targets      │
│     (Storage)       │           │  ┌─────────┬─────────┐  │
│  ┌───────┬───────┐  │           │  │Temporal │ Airflow │  │
│  │twiddle│temporal│  │           │  │  .py    │  DAG    │  │
│  │  db   │airflow │  │           │  │ files   │ files   │  │
│  └───────┴───────┘  │           │  └─────────┴─────────┘  │
└─────────────────────┘           └─────────────────────────┘
```

> **Note:** The API server generates Python files for Temporal and Airflow DAG files.
> It does not directly integrate with these orchestration engines at runtime.

## Project Structure

```
twiddle/
├── packages/             # TypeScript packages (pnpm monorepo)
│   ├── api/              # Fastify API server
│   ├── editor/           # React frontend (Vite)
│   ├── nodes/            # Node type definitions
│   ├── shared/           # Shared types and utilities
│   └── workflows/        # Workflow definitions
├── DSL/                  # Python package: twiddle-dsl
├── SDK/                  # Python package: twiddle-sdk (CLI tools)
├── docker/               # Docker Compose for Temporal + Airflow
├── utilities/            # Admin scripts (password reset, etc.)
└── temporal-config/      # Temporal dynamic configuration
```

## Prerequisites

| Requirement | Minimum Version |
|-------------|-----------------|
| Node.js     | 20.0.0          |
| pnpm        | 9.0.0           |
| Docker      | Latest          |
| Python      | 3.10+ (for DSL/SDK) |

## Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd twiddle
cp .env.example .env
```

Edit `.env` and update values as needed:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://twiddle:twiddle@localhost:5432/twiddle` |
| `TEMPORAL_ADDRESS` | Temporal server address | `localhost:7233` |
| `ENCRYPTION_KEY` | 32-char key for credentials | Generate with `openssl rand -hex 16` |
| `AUTH_ENABLED` | Enable/disable authentication | `false` |

### 2. Start Docker Services

```bash
cd docker
docker compose up -d
cd ..
```

This starts:
- **PostgreSQL** - Port 5432 (databases: `twiddle`, `temporal`, `airflow`)
- **Temporal Server** - Port 7233 (gRPC), Port 8443 (UI)
- **Airflow** - Port 8080 (UI), credentials: `airflow` / `airflow`

Wait ~30 seconds for services to initialize. Verify with `docker ps`.

### 3. Install Dependencies & Setup Database

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

### 4. Build & Run

```bash
pnpm build
pnpm dev         # Start all services at once
```

Or run components individually:

```bash
pnpm dev:api     # API Server (port 3000)
pnpm dev:editor  # Frontend (port 5173)
```

## Access Points

| Service | URL |
|---------|-----|
| Twiddle Editor | http://localhost:5173 |
| API Server | http://localhost:3000 |
| API Documentation | http://localhost:3000/docs |
| Temporal UI | http://localhost:8443 |
| Airflow UI | http://localhost:8080 |

## Python DSL & SDK

### Install

```bash
pip install twiddle-sdk  # Includes twiddle-dsl
```

### Define Activities

```python
from twiddle_dsl import activity, Parameter

@activity(
    name="Send Email",
    description="Sends an email to a recipient",
    category="Communications",
    icon="email"
)
async def send_email(
    recipient: Parameter[str] = Parameter(label="Recipient", required=True),
    subject: Parameter[str] = Parameter(label="Subject", template=True),
    body: Parameter[str] = Parameter(label="Body", template=True),
    input_data=None
):
    return {**(input_data or {}), "email_sent": True}
```

### SDK Commands

```bash
twiddle version           # Show versions
twiddle init myproject    # Create new project
twiddle lint src/         # Lint DSL code
twiddle convert src/ -o output/  # Convert to Temporal
```

## Authentication (Optional)

### Azure Entra ID (SSO)

1. Create an App Registration in Azure Portal
2. Set redirect URI to `http://localhost:3000/api/auth/callback`
3. Create a client secret and configure API permissions (`openid`, `profile`, `email`, `User.Read`)
4. Update `.env`:

```env
AUTH_ENABLED=true
AUTH_PROVIDER=azure-entra
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm dev:api` | Start API server only |
| `pnpm dev:editor` | Start frontend only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run linting |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm clean` | Clean build artifacts and node_modules |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:generate` | Generate Prisma client |

**Docker (run from `docker/` directory):**

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose down -v` | Stop and remove volumes |
| `docker compose logs -f` | View logs |

## Troubleshooting

### Clean Rebuild

```bash
rm -rf node_modules packages/*/node_modules packages/*/dist packages/*/.turbo .turbo
pnpm install
pnpm build
```

### Database Issues

```bash
pnpm db:generate              # Regenerate Prisma client
cd packages/api && npx prisma migrate reset  # Reset database (WARNING: deletes data)
```

### Docker Issues

```bash
cd docker
docker compose down -v        # Remove all containers and volumes
docker compose up -d          # Fresh start
```

### Port Conflicts

```bash
lsof -i :3000   # API
lsof -i :5173   # Editor
lsof -i :5432   # PostgreSQL
lsof -i :7233   # Temporal gRPC
lsof -i :8080   # Airflow UI
lsof -i :8443   # Temporal UI
```

## API Endpoints

### Workflows
- `GET /api/workflows` - List all workflows
- `POST /api/workflows` - Create a workflow
- `GET /api/workflows/:id` - Get a workflow
- `PUT /api/workflows/:id` - Update a workflow
- `DELETE /api/workflows/:id` - Delete a workflow
- `POST /api/workflows/:id/execute` - Execute a workflow

### Executions
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details
- `POST /api/executions/:id/cancel` - Cancel an execution

### Credentials
- `GET /api/credentials` - List credentials
- `POST /api/credentials` - Create a credential
- `PUT /api/credentials/:id` - Update a credential
- `DELETE /api/credentials/:id` - Delete a credential

### Authentication
- `GET /api/auth/config` - Get auth configuration
- `GET /api/auth/me` - Get current user session
- `GET /api/auth/login` - Initiate login flow
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout user

## License

Apache-2.0
