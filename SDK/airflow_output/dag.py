"""
Test



Auto-generated Airflow DAG from Twiddle DSL.
"""
from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator

# Import task functions
from tasks.task import task


# Default arguments for the DAG
default_args = {
    "owner": "twiddle",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

# DAG definition
with DAG(
    dag_id="test",
    default_args=default_args,
    description="",
    schedule_interval=None,  # Manual trigger only
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["twiddle", "generated"],
) as dag:
    
    # Task definitions

    task = PythonOperator(
        task_id="task",
        python_callable=task,
        op_kwargs={"input_data": "{}" },  # Pass input via XCom or params
    )

    # Task dependencies
    pass  # No dependencies defined
