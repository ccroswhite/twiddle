# Test



## Quick Start

### Option 1: Copy to Airflow DAGs folder

```bash
# Copy DAG and tasks to your Airflow DAGs folder
cp -r . $AIRFLOW_HOME/dags/test/
```

### Option 2: Use with Docker Compose

```bash
# Copy to the Twiddle Docker Airflow DAGs folder
cp -r . ../docker/airflow/dags/test/
```

## Files

| File | Description |
|------|-------------|
| `dag.py` | Main DAG definition |
| `tasks/` | Task implementations |
| `requirements.txt` | Python dependencies |

## DAG Info

- **DAG ID**: `test`
- **Schedule**: Manual trigger (no schedule)
- **Tags**: `twiddle`, `generated`

## Airflow UI

Access at: http://localhost:8080

Default credentials:
- Username: `airflow`
- Password: `airflow`

## Triggering the DAG

1. Open Airflow UI
2. Find DAG: `test`
3. Enable the DAG (toggle on)
4. Click "Trigger DAG" button
