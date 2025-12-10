# Twiddle

A workflow automation platform similar to n8n, powered by [Temporal](https://temporal.io) for reliable workflow execution.

## Features

- **Visual Workflow Editor** - Drag-and-drop interface for building workflows
- **Temporal-Powered Execution** - Reliable, durable workflow execution with automatic retries
- **Extensible Node System** - Easy to add new integrations and nodes
- **Real-time Monitoring** - Track workflow executions in real-time
- **Credential Management** - Secure storage for API keys and credentials

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   (React + TailwindCSS)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      API Server                              │
│                  (Fastify + Prisma)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  PostgreSQL │   │   Temporal  │   │    Redis    │
│  (Storage)  │   │   (Engine)  │   │   (Cache)   │
└─────────────┘   └──────┬──────┘   └─────────────┘
                         │
              ┌──────────▼──────────┐
              │   Temporal Worker   │
              │   (Activities)      │
              └─────────────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| `@twiddle/api` | Backend API server |
| `@twiddle/worker` | Temporal worker for workflow execution |
| `@twiddle/workflows` | Temporal workflow definitions |
| `@twiddle/nodes` | Node definitions (HTTP, Code, etc.) |
| `@twiddle/shared` | Shared types and utilities |
| `@twiddle/editor` | React frontend (coming soon) |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker and Docker Compose

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-org/twiddle.git
cd twiddle
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Start infrastructure services:
```bash
docker-compose up -d
```

5. Generate Prisma client and run database migrations:
```bash
# Generate Prisma client (required before building)
cd packages/api && npx prisma generate && cd ../..

# Set the database so that you can connect
export DATABASE_URL="postgresql://twiddle:twiddle@localhost:5432/twiddle?schema=public"

# Run database migrations
pnpm db:migrate
```

6. Build all packages:
```bash
pnpm build
```

7. Start development servers:
```bash
# Terminal 1: API Server
pnpm dev:api

# Terminal 2: Temporal Worker
pnpm dev:worker

# Terminal 3: Frontend
pnpm dev:editor
```

### Clean Build (if you encounter build issues)

If you encounter module not found errors or stale build artifacts:

```bash
# Clean all build artifacts, caches, and dependencies
rm -rf node_modules packages/*/node_modules packages/*/dist packages/*/.turbo packages/*/tsconfig.tsbuildinfo .turbo
```
And then go to setup section above

### Access Points

- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Temporal UI**: http://localhost:8080

## Available Nodes

### Core Nodes
- **Manual Trigger** - Start workflows manually
- **HTTP Request** - Make HTTP requests
- **Code** - Execute custom JavaScript
- **If** - Conditional branching
- **Set Data** - Transform data

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

### Nodes
- `GET /api/nodes` - List available node types
- `GET /api/nodes/:type` - Get node definition

### Credentials
- `GET /api/credentials` - List credentials
- `POST /api/credentials` - Create a credential
- `PUT /api/credentials/:id` - Update a credential
- `DELETE /api/credentials/:id` - Delete a credential

## Authentication (Optional)

Twiddle supports optional Single Sign-On (SSO) authentication with Azure Entra ID (formerly Azure AD).

### Enabling Azure Entra SSO

1. **Create an App Registration in Azure Portal**
   - Go to Azure Portal > Azure Active Directory > App registrations
   - Click "New registration"
   - Name: `Twiddle`
   - Supported account types: Choose based on your needs
   - Redirect URI: `http://localhost:3000/api/auth/callback` (Web)

2. **Configure Client Secret**
   - Go to "Certificates & secrets"
   - Create a new client secret
   - Copy the secret value (you won't see it again)

3. **Configure API Permissions**
   - Go to "API permissions"
   - Add: Microsoft Graph > Delegated > `openid`, `profile`, `email`, `User.Read`

4. **Update Environment Variables**
   ```bash
   AUTH_ENABLED=true
   AUTH_PROVIDER=azure-entra
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret
   AZURE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ```

5. **Restart the API server**

When SSO is enabled:
- Users must sign in with their Microsoft account
- User info is displayed in the sidebar
- Sessions are managed server-side with secure cookies

### Auth Endpoints

- `GET /api/auth/config` - Get auth configuration
- `GET /api/auth/me` - Get current user session
- `GET /api/auth/login` - Initiate login flow
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout user

## Development

### Build all packages
```bash
pnpm build
```

### Run tests
```bash
pnpm test
```

### Type checking
```bash
pnpm typecheck
```

## License

Apache-2.0
