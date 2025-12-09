# Twiddle Setup Guide

This guide explains how to set up Twiddle on a new machine from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

1. **Node.js** (v20.0.0 or higher)
   ```bash
   # Check version
   node --version
   
   # Install via nvm (recommended)
   nvm install 20
   nvm use 20
   ```

2. **pnpm** (v9.0.0 or higher)
   ```bash
   # Install pnpm
   npm install -g pnpm@9
   
   # Check version
   pnpm --version
   ```

3. **Docker & Docker Compose**
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Ensure Docker is running before proceeding

4. **Git**
   ```bash
   git --version
   ```

## Setup Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd twiddle
```

### 2. Configure Environment Variables

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

Edit `.env` and update the following values:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://twiddle:twiddle@localhost:5432/twiddle` |
| `TEMPORAL_ADDRESS` | Temporal server address | `localhost:7233` |
| `ENCRYPTION_KEY` | 32-character key for encrypting credentials | Generate a secure key |
| `AUTH_ENABLED` | Enable/disable authentication | `false` |

**Generate a secure encryption key:**
```bash
openssl rand -hex 16
```

### 3. Start Docker Services

Start PostgreSQL, Temporal, and Redis:

```bash
pnpm docker:up
```

This starts:
- **PostgreSQL** on port `5432`
- **Temporal Server** on port `7233`
- **Temporal UI** on port `8080`
- **Redis** on port `6379`

Wait about 30 seconds for all services to be ready.

**Verify services are running:**
```bash
docker ps
```

You should see 4 containers running:
- `twiddle-postgres`
- `twiddle-temporal`
- `twiddle-temporal-ui`
- `twiddle-redis`

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Generate Prisma Client

```bash
pnpm db:generate
```

### 6. Run Database Migrations

```bash
pnpm db:migrate
```

### 7. Build All Packages

```bash
pnpm build
```

### 8. Start the Development Servers

You can start all services at once:

```bash
pnpm dev
```

Or start them individually in separate terminals:

```bash
# Terminal 1: API Server (port 3000)
pnpm dev:api

# Terminal 2: Editor/Frontend (port 5173)
pnpm dev:editor

# Terminal 3: Temporal Worker
pnpm dev:worker
```

### 9. Access the Application

- **Twiddle Editor**: http://localhost:5173
- **API Server**: http://localhost:3000
- **Temporal UI**: http://localhost:8080

## Authentication Setup (Optional)

### Local Authentication

Local authentication is enabled by default. Users can register and log in with email/password.

### Azure Entra ID (SSO)

To enable Azure Entra ID authentication:

1. Create an App Registration in Azure Portal
2. Set the redirect URI to: `http://localhost:3000/api/auth/callback`
3. Create a client secret
4. Update `.env`:

```env
AUTH_ENABLED=true
AUTH_PROVIDER=azure-entra
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## Troubleshooting

### Docker containers won't start

```bash
# Stop all containers
pnpm docker:down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Start fresh
pnpm docker:up
```

### Prisma errors

```bash
# Regenerate Prisma client
pnpm db:generate

# Reset database (WARNING: deletes all data)
cd packages/api
npx prisma migrate reset
```

### Port already in use

Check what's using the port:
```bash
lsof -i :3000  # API
lsof -i :5173  # Editor
lsof -i :5432  # PostgreSQL
lsof -i :7233  # Temporal
```

### Clean rebuild

```bash
# Clean everything
pnpm clean

# Reinstall and rebuild
pnpm install
pnpm build
```

## Project Structure

```
twiddle/
├── packages/
│   ├── api/          # Fastify API server
│   ├── editor/       # React frontend (Vite)
│   ├── nodes/        # Node type definitions
│   ├── shared/       # Shared types and utilities
│   ├── worker/       # Temporal worker
│   └── workflows/    # Temporal workflow definitions
├── temporal-config/  # Temporal dynamic config
├── docker-compose.yml
├── .env.example
└── package.json
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run linting |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm clean` | Clean all build artifacts and node_modules |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:generate` | Generate Prisma client |
