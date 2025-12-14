# How to Start the Twiddle Application

You can start the application components all at once or individually.

## Prerequisites

Ensure you have the following installed:
- Node.js (>= 20.0.0)
- pnpm (>= 9.0.0)
- Docker (for the database and other services)

## 1. Start Infrastructure

First, make sure the database and other required services are running:

```bash
pnpm docker:up
```

## 2. Start Application

### Option A: Start Everything (Recommended)

Run the following command from the root directory (`/Users/chrisc/src/twiddle`) to start the API and Editor simultaneously using Turbo:

```bash
pnpm dev
```

### Option B: Start Components Individually

If you prefer to run components in separate terminals:

**Start the API Server:**
```bash
pnpm dev:api
```
*Runs on port 3000 by default (check `.env`).*

**Start the Frontend Editor:**
```bash
pnpm dev:editor
```
*Runs on port 5173 (Vite default).*

## Database Management

If you need to apply migrations (e.g., after the recent schema changes):

```bash
pnpm db:migrate
```

To verify the database schema generation:

```bash
pnpm db:generate
```
