import { describe, it, expect } from 'vitest';
import { generateWorkflowFile } from './workflow-generator.js';
import type { WorkflowData } from './types.js';

describe('Temporal Python Workflow Generator', () => {
    it('generates basic workflow structure without activities', () => {
        const workflow: WorkflowData = {
            id: 'test-wf',
            name: 'Test Workflow',
            nodes: [],
            connections: []
        };
        const result = generateWorkflowFile(workflow);
        expect(result).toContain('class Test_workflowWorkflow:');
        expect(result).toContain('def __init__(self) -> None:');
        expect(result).toContain('self._events: Dict[str, bool] = {}');
        expect(result).toContain('async def run(');
        expect(result).toContain('workflow_name=\'test_workflow\'');
    });

    it('generates wait_condition for requiredActivity parameters', () => {
        const workflow: WorkflowData = {
            id: 'wf-1',
            name: 'Dependent Workflow',
            nodes: [
                {
                    id: 'node-1',
                    type: 'twiddle.script',
                    name: 'My Dependent Script',
                    position: { x: 0, y: 0 },
                    parameters: {
                        requiredActivity: ['Upstream-Activity-OK', 'Other-Signal']
                    }
                }
            ],
            connections: []
        };

        const result = generateWorkflowFile(workflow);

        // Assert wait condition is generated
        expect(result).toContain('await workflow.wait_condition(');
        expect(result).toContain('lambda: all(self._events.get(req, False) for req in ["Upstream-Activity-OK","Other-Signal"])');

        // Assert execution follows wait condition
        expect(result).toContain('node_0_result = await workflow.execute_activity(');
    });

    it('generates event publishing for publishedActivity parameters', () => {
        const workflow: WorkflowData = {
            id: 'wf-2',
            name: 'Broadcasting Workflow',
            nodes: [
                {
                    id: 'node-1',
                    type: 'twiddle.database',
                    name: 'My Data Job',
                    position: { x: 0, y: 0 },
                    parameters: {
                        publishedActivity: ['Data-Ready', 'Cache-Invalidated']
                    }
                }
            ],
            connections: []
        };

        const result = generateWorkflowFile(workflow);

        // Assert the finally block publishes the signals
        expect(result).toContain('finally:');
        expect(result).toContain('self._events["Data-Ready"] = True');
        expect(result).toContain('self._events["Cache-Invalidated"] = True');
    });

    it('handles continueOnFail correctly by pushing fail events', () => {
        const workflow: WorkflowData = {
            id: 'wf-3',
            name: 'Resilient Workflow',
            nodes: [
                {
                    id: 'node-1',
                    type: 'twiddle.api',
                    name: 'Flaky API',
                    position: { x: 0, y: 0 },
                    continueOnFail: true,
                    parameters: {}
                }
            ],
            connections: []
        };

        const result = generateWorkflowFile(workflow);

        // Assert that the exception block catches and continues
        expect(result).toContain('except Exception as e:');
        expect(result).toContain('self._events["Flaky API-FAIL"] = True');
        expect(result).toContain('workflow.logger.warning(f"ActivityFailed (Continuing)');
        expect(result).not.toContain('raise');
    });
});
