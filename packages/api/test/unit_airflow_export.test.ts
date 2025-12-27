import { describe, it, expect } from 'vitest';
import { generateAirflowExport, generateAirflowFromIR } from '../src/lib/airflow-export';
import { workflowToIR } from '../src/lib/ir/index';
import { irToAirflow, NODE_TO_OPERATOR } from '../src/lib/export/airflow-adapter';

describe('Airflow Adapter', () => {
    describe('NODE_TO_OPERATOR mapping', () => {
        it('should have mapping for common node types', () => {
            expect(NODE_TO_OPERATOR['twiddle.httpRequest']).toBeDefined();
            expect(NODE_TO_OPERATOR['twiddle.httpRequest'].operator).toBe('SimpleHttpOperator');

            expect(NODE_TO_OPERATOR['twiddle.runScript']).toBeDefined();
            expect(NODE_TO_OPERATOR['twiddle.runScript'].operator).toBe('BashOperator');

            expect(NODE_TO_OPERATOR['twiddle.pythonCode']).toBeDefined();
            expect(NODE_TO_OPERATOR['twiddle.pythonCode'].operator).toBe('PythonOperator');
        });
    });

    describe('irToAirflow', () => {
        const sampleIR = {
            version: '1.0.0',
            workflow: {
                id: 'wf-123',
                name: 'Sample Workflow',
                description: 'Test DAG',
                tags: ['test'],
            },
            nodes: [
                {
                    id: 'n1',
                    type: 'twiddle.manualTrigger',
                    name: 'Start',
                },
                {
                    id: 'n2',
                    type: 'twiddle.httpRequest',
                    name: 'Fetch Data',
                    parameters: {
                        url: 'https://api.example.com/data',
                        method: 'GET',
                    },
                },
                {
                    id: 'n3',
                    type: 'twiddle.runScript',
                    name: 'Process Data',
                    parameters: {
                        command: 'python process.py',
                    },
                },
            ],
            connections: [
                { source: 'n1', target: 'n2' },
                { source: 'n2', target: 'n3' },
            ],
        };

        it('should convert IR to Airflow DAG model', () => {
            const dag = irToAirflow(sampleIR);

            expect(dag.dagId).toBe('sample_workflow');
            expect(dag.description).toBe('Test DAG');
            expect(dag.tags).toEqual(['test']);
        });

        it('should filter out trigger nodes from tasks', () => {
            const dag = irToAirflow(sampleIR);

            // Should only have 2 tasks (not the manual trigger)
            expect(dag.tasks).toHaveLength(2);
            expect(dag.tasks.find(t => t.nodeType === 'twiddle.manualTrigger')).toBeUndefined();
        });

        it('should create correct operator types', () => {
            const dag = irToAirflow(sampleIR);

            const httpTask = dag.tasks.find(t => t.nodeType === 'twiddle.httpRequest');
            expect(httpTask?.operator).toBe('SimpleHttpOperator');

            const scriptTask = dag.tasks.find(t => t.nodeType === 'twiddle.runScript');
            expect(scriptTask?.operator).toBe('BashOperator');
        });

        it('should build dependencies correctly', () => {
            const dag = irToAirflow(sampleIR);

            // n2 -> n3 dependency (n1 is trigger, ignored)
            expect(dag.dependencies).toHaveLength(1);
            expect(dag.dependencies[0].upstream).toBe('fetch_data');
            expect(dag.dependencies[0].downstream).toBe('process_data');
        });

        it('should collect required imports', () => {
            const dag = irToAirflow(sampleIR);

            expect(dag.imports.has('from airflow import DAG')).toBe(true);
            expect(dag.imports.has('from datetime import datetime, timedelta')).toBe(true);
            expect(dag.imports.has('from airflow.providers.http.operators.http import SimpleHttpOperator')).toBe(true);
            expect(dag.imports.has('from airflow.operators.bash import BashOperator')).toBe(true);
        });
    });
});

describe('Airflow Export', () => {
    const sampleWorkflow = {
        id: 'wf-456',
        name: 'Data Pipeline',
        description: 'ETL pipeline for data processing',
        nodes: [
            {
                id: 'trigger',
                type: 'twiddle.interval',
                name: 'Schedule',
                parameters: { cron: '0 8 * * *' },
            },
            {
                id: 'extract',
                type: 'twiddle.httpRequest',
                name: 'Extract Data',
                position: { x: 200, y: 0 },
                parameters: {
                    url: 'https://api.example.com/extract',
                    method: 'GET',
                },
            },
            {
                id: 'transform',
                type: 'twiddle.pythonCode',
                name: 'Transform Data',
                position: { x: 400, y: 0 },
                parameters: {
                    code: 'transform_data()',
                },
            },
            {
                id: 'load',
                type: 'twiddle.database',
                name: 'Load to DB',
                position: { x: 600, y: 0 },
                parameters: {
                    query: 'INSERT INTO ...',
                },
            },
        ],
        connections: [
            { source: 'trigger', target: 'extract' },
            { source: 'extract', target: 'transform' },
            { source: 'transform', target: 'load' },
        ],
    };

    describe('generateAirflowExport', () => {
        it('should generate the required files', () => {
            const files = generateAirflowExport(sampleWorkflow);

            expect(files['dag.py']).toBeDefined();
            expect(files['requirements.txt']).toBeDefined();
            expect(files['README.md']).toBeDefined();
        });

        it('should generate valid DAG Python code', () => {
            const files = generateAirflowExport(sampleWorkflow);
            const dagPy = files['dag.py'];

            expect(dagPy).toContain('from airflow import DAG');
            expect(dagPy).toContain("dag_id='data_pipeline'");
            expect(dagPy).toContain('SimpleHttpOperator');
            expect(dagPy).toContain('PythonOperator');
        });

        it('should include schedule interval from interval trigger', () => {
            const files = generateAirflowExport(sampleWorkflow);
            const dagPy = files['dag.py'];

            expect(dagPy).toContain("schedule_interval='0 8 * * *'");
        });

        it('should generate task dependencies', () => {
            const files = generateAirflowExport(sampleWorkflow);
            const dagPy = files['dag.py'];

            expect(dagPy).toContain('extract_data >> transform_data');
            expect(dagPy).toContain('transform_data >> load_to_db');
        });

        it('should include required provider packages', () => {
            const files = generateAirflowExport(sampleWorkflow);
            const requirements = files['requirements.txt'];

            expect(requirements).toContain('apache-airflow>=2.0.0');
            expect(requirements).toContain('apache-airflow-providers-http');
        });

        it('should generate README with task list', () => {
            const files = generateAirflowExport(sampleWorkflow);
            const readme = files['README.md'];

            expect(readme).toContain('# data_pipeline');
            expect(readme).toContain('Extract Data');
            expect(readme).toContain('Transform Data');
            expect(readme).toContain('Load to DB');
        });
    });

    describe('generateAirflowFromIR', () => {
        it('should generate files from IR directly', () => {
            const ir = workflowToIR(sampleWorkflow);
            const files = generateAirflowFromIR(ir);

            expect(files['dag.py']).toBeDefined();
            expect(files['dag.py']).toContain('from airflow import DAG');
        });
    });
});
