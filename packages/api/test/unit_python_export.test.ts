
import { describe, it, expect } from 'vitest';
import { generatePythonCode } from '../src/lib/python-export';

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
});
