import { describe, it, expect } from 'vitest';
import { generatePythonCode, generatePythonExport } from '../src/lib/python-export';


describe('Python Export Generation', () => {

    it('should generate valid python code for a simple workflow', () => {
        const workflow = {
            id: 'wf-1',
            name: 'Test Workflow',
            nodes: [
                {
                    id: 'node-1',
                    name: 'Test Node',
                    type: 'test.activity',
                    position: { x: 0, y: 0 },
                    parameters: {
                        param1: 'value1',
                        param2: 123
                    }
                }
            ],
            connections: [],
        };

        const result = generatePythonCode(workflow);

        // Check for header
        expect(result.pythonWorkflow).toContain('from temporalio import workflow');
        expect(result.pythonWorkflow).toContain('class Test_workflowWorkflow:');
        expect(result.pythonWorkflow).toContain('@workflow.run');

        // Check for activity execution
        // The implementation details might vary, but it should contain the activity name or parameters
        expect(result.pythonWorkflow).toContain('value1');
        expect(result.pythonWorkflow).toContain('123');
    });

    it('should handle connections (dependencies)', () => {
        const workflow = {
            id: 'wf-2',
            name: 'Connected Workflow',
            nodes: [
                {
                    id: 'node-1',
                    name: 'Start',
                    type: 'start',
                    position: { x: 0, y: 0 },
                    parameters: {}
                },
                {
                    id: 'node-2',
                    name: 'End',
                    type: 'end',
                    position: { x: 100, y: 0 },
                    parameters: {}
                }
            ],
            connections: [
                { source: 'node-1', target: 'node-2' }
            ],
        };

        const result = generatePythonCode(workflow);
        // Verify simple existence of logical flow or comments if applicable
        expect(result.pythonWorkflow).toContain('class Connected_workflowWorkflow:');
    });

    it('should generate worker with logging configuration', () => {
        const workflow = {
            id: 'wf-3',
            name: 'Logging Workflow',
            nodes: [{
                id: 'n1',
                type: 'twiddle.log',
                name: 'Log Node',
                parameters: {},
                position: { x: 0, y: 0 }
            }],
            connections: []
        };

        const files = generatePythonExport(workflow);

        expect(files['worker.py']).toBeDefined();

        const workerContent = files['worker.py'];
        expect(workerContent).toContain('logging.basicConfig');
        expect(workerContent).toContain("level=os.environ.get('LOG_LEVEL', 'INFO').upper()");
        expect(workerContent).toContain('logger.info');
    });
});

describe('Python Export DSL Alignment', () => {
    const sampleWorkflow = {
        id: 'wf-dsl',
        name: 'DSL Test Workflow',
        nodes: [{
            id: 'n1',
            type: 'twiddle.httpRequest',
            name: 'HTTP Request',
            parameters: { url: 'https://example.com' },
            position: { x: 0, y: 0 }
        }],
        connections: []
    };

    it('should include twiddle-dsl in requirements.txt', () => {
        const files = generatePythonExport(sampleWorkflow);

        expect(files['requirements.txt']).toBeDefined();
        expect(files['requirements.txt']).toContain('twiddle-dsl>=1.0.0');
    });

    it('should import ActivityInput from twiddle_dsl in activities.py', () => {
        const files = generatePythonExport(sampleWorkflow);

        expect(files['activities.py']).toBeDefined();
        const activities = files['activities.py'];
        expect(activities).toContain('from twiddle_dsl import');
        expect(activities).toContain('ActivityInput');
        expect(activities).toContain('with_execution_logging');
    });

    it('should import ActivityInput from twiddle_dsl in workflow.py', () => {
        const files = generatePythonExport(sampleWorkflow);

        expect(files['workflow.py']).toBeDefined();
        const workflow = files['workflow.py'];
        expect(workflow).toContain('from twiddle_dsl import ActivityInput');
    });

    it('should generate all expected files', () => {
        const files = generatePythonExport(sampleWorkflow);

        const expectedFiles = [
            'workflow.py',
            'activities.py',
            'worker.py',
            'starter.py',
            'requirements.txt',
            'Dockerfile',
            'docker-compose.yml',
            '.env.example',
            'README.md',
        ];

        for (const file of expectedFiles) {
            expect(files[file]).toBeDefined();
            expect(files[file].length).toBeGreaterThan(0);
        }
    });

    it('should apply @with_execution_logging decorator to activities', () => {
        const files = generatePythonExport(sampleWorkflow);

        const activities = files['activities.py'];
        expect(activities).toContain('@activity.defn');
        expect(activities).toContain('@with_execution_logging');
    });

    it('should not embed ExecutionLogger class (import from twiddle_dsl instead)', () => {
        const files = generatePythonExport(sampleWorkflow);

        const activities = files['activities.py'];
        // Should import, not define
        expect(activities).toContain('from twiddle_dsl import');
        expect(activities).toContain('ExecutionLogger');
        // Should NOT have the class definition embedded
        expect(activities).not.toContain('class ExecutionLogger:');
    });
});

