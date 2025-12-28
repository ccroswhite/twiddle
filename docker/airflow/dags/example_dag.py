# Twiddle Example DAG
# This is a sample DAG to verify Airflow is working correctly

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'twiddle',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

def print_hello():
    """Simple Python task to verify execution."""
    print("Hello from Twiddle!")
    return "Hello World"

with DAG(
    'twiddle_example',
    default_args=default_args,
    description='Example DAG for Twiddle development',
    schedule_interval=None,  # Manual trigger only
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['twiddle', 'example'],
) as dag:
    
    start = BashOperator(
        task_id='start',
        bash_command='echo "Starting Twiddle example workflow..."',
    )
    
    hello_python = PythonOperator(
        task_id='hello_python',
        python_callable=print_hello,
    )
    
    process = BashOperator(
        task_id='process',
        bash_command='echo "Processing data..." && sleep 2',
    )
    
    end = BashOperator(
        task_id='end',
        bash_command='echo "Workflow completed successfully!"',
    )
    
    # Define task dependencies
    start >> hello_python >> process >> end
