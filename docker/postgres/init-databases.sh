#!/bin/bash
set -e

# Create additional databases for Temporal and Airflow
# The default 'twiddle' database is created by POSTGRES_DB env var

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create Temporal database and user
    CREATE DATABASE temporal;
    CREATE USER temporal WITH PASSWORD 'temporal';
    GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
    
    -- Create Airflow database and user
    CREATE DATABASE airflow;
    CREATE USER airflow WITH PASSWORD 'airflow';
    GRANT ALL PRIVILEGES ON DATABASE airflow TO airflow;
    
    -- Grant schema permissions (required for PostgreSQL 15+)
    \c temporal
    GRANT ALL ON SCHEMA public TO temporal;
    
    \c airflow
    GRANT ALL ON SCHEMA public TO airflow;
EOSQL

echo "✅ Databases created: temporal, airflow"


---------------- eol ----------------