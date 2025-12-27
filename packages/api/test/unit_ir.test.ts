import { describe, it, expect } from 'vitest';
import {
    workflowToIR,
    irToWorkflow,
    validateIR,
    validateFull,
    IR_VERSION,
    isActivityNode,
} from '../src/lib/ir/index';

describe('Twiddle IR Types', () => {
    describe('isActivityNode', () => {
        it('should return false for trigger nodes', () => {
            expect(isActivityNode('twiddle.manualTrigger')).toBe(false);
            expect(isActivityNode('twiddle.webhook')).toBe(false);
            expect(isActivityNode('twiddle.interval')).toBe(false);
        });

        it('should return true for activity nodes', () => {
            expect(isActivityNode('twiddle.httpRequest')).toBe(true);
            expect(isActivityNode('twiddle.runScript')).toBe(true);
            expect(isActivityNode('twiddle.pythonCode')).toBe(true);
            expect(isActivityNode('twiddle.sendEmail')).toBe(true);
        });
    });
});

describe('Twiddle IR Serializer', () => {
    const sampleWorkflow = {
        id: 'wf-123',
        name: 'Sample Workflow',
        description: 'A test workflow',
        nodes: [
            {
                id: 'node-1',
                type: 'twiddle.manualTrigger',
                name: 'Start',
                position: { x: 0, y: 0 },
                data: { name: 'Start' },
            },
            {
                id: 'node-2',
                type: 'twiddle.httpRequest',
                name: 'HTTP Request',
                position: { x: 200, y: 0 },
                parameters: {
                    url: 'https://api.example.com',
                    method: 'GET',
                },
                startToCloseTimeout: 300,
                maxRetries: 3,
            },
            {
                id: 'node-3',
                type: 'twiddle.runScript',
                name: 'Run Script',
                position: { x: 400, y: 0 },
                parameters: {
                    command: 'echo "Hello World"',
                },
                continueOnFail: true,
            },
        ],
        connections: [
            { source: 'node-1', target: 'node-2' },
            { source: 'node-2', target: 'node-3' },
        ],
        tags: ['test', 'sample'],
    };

    describe('workflowToIR', () => {
        it('should convert workflow to IR format', () => {
            const ir = workflowToIR(sampleWorkflow);

            expect(ir.version).toBe(IR_VERSION);
            expect(ir.workflow.id).toBe('wf-123');
            expect(ir.workflow.name).toBe('Sample Workflow');
            expect(ir.workflow.description).toBe('A test workflow');
            expect(ir.nodes).toHaveLength(3);
            expect(ir.connections).toHaveLength(2);
        });

        it('should preserve node parameters', () => {
            const ir = workflowToIR(sampleWorkflow);

            const httpNode = ir.nodes.find(n => n.type === 'twiddle.httpRequest');
            expect(httpNode?.parameters?.url).toBe('https://api.example.com');
            expect(httpNode?.parameters?.method).toBe('GET');
        });

        it('should convert activity options', () => {
            const ir = workflowToIR(sampleWorkflow);

            const httpNode = ir.nodes.find(n => n.type === 'twiddle.httpRequest');
            expect(httpNode?.activityOptions?.startToCloseTimeout).toBe(300);
            expect(httpNode?.activityOptions?.retryPolicy?.maxAttempts).toBe(3);

            const scriptNode = ir.nodes.find(n => n.type === 'twiddle.runScript');
            expect(scriptNode?.activityOptions?.continueOnFail).toBe(true);
        });

        it('should preserve connections', () => {
            const ir = workflowToIR(sampleWorkflow);

            expect(ir.connections[0].source).toBe('node-1');
            expect(ir.connections[0].target).toBe('node-2');
            expect(ir.connections[1].source).toBe('node-2');
            expect(ir.connections[1].target).toBe('node-3');
        });
    });

    describe('irToWorkflow', () => {
        it('should convert IR back to workflow format', () => {
            const ir = workflowToIR(sampleWorkflow);
            const result = irToWorkflow(ir);

            expect(result.name).toBe('Sample Workflow');
            expect(result.description).toBe('A test workflow');
            expect(result.nodes).toHaveLength(3);
            expect(result.connections).toHaveLength(2);
        });

        it('should preserve node data in round-trip', () => {
            const ir = workflowToIR(sampleWorkflow);
            const result = irToWorkflow(ir);

            const httpNode = result.nodes.find((n: any) => n.type === 'twiddle.httpRequest') as any;
            expect(httpNode.parameters.url).toBe('https://api.example.com');
            expect(httpNode.startToCloseTimeout).toBe(300);
        });
    });
});

describe('Twiddle IR Validator', () => {
    describe('validateIR', () => {
        it('should validate a correct IR', () => {
            const ir = {
                version: '1.0.0',
                workflow: {
                    id: 'wf-1',
                    name: 'Test',
                },
                nodes: [
                    { id: 'n1', type: 'twiddle.httpRequest', name: 'HTTP' },
                ],
                connections: [],
            };

            const result = validateIR(ir);
            expect(result.valid).toBe(true);
            expect(result.errors).toBeUndefined();
        });

        it('should reject IR without version', () => {
            const ir = {
                workflow: { id: 'wf-1', name: 'Test' },
                nodes: [],
                connections: [],
            };

            const result = validateIR(ir);
            expect(result.valid).toBe(false);
            expect(result.errors).toBeDefined();
            expect(result.errors?.some(e => e.keyword === 'required')).toBe(true);
        });

        it('should reject IR without workflow', () => {
            const ir = {
                version: '1.0.0',
                nodes: [],
                connections: [],
            };

            const result = validateIR(ir);
            expect(result.valid).toBe(false);
        });

        it('should reject IR with invalid version format', () => {
            const ir = {
                version: 'invalid',
                workflow: { id: 'wf-1', name: 'Test' },
                nodes: [],
                connections: [],
            };

            const result = validateIR(ir);
            expect(result.valid).toBe(false);
        });
    });

    describe('validateFull (with semantics)', () => {
        it('should reject connections to non-existent nodes', () => {
            const ir = {
                version: '1.0.0',
                workflow: { id: 'wf-1', name: 'Test' },
                nodes: [
                    { id: 'n1', type: 'twiddle.httpRequest', name: 'HTTP' },
                ],
                connections: [
                    { source: 'n1', target: 'n2' }, // n2 doesn't exist
                ],
            };

            const result = validateFull(ir);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.message.includes('n2'))).toBe(true);
        });

        it('should reject duplicate node IDs', () => {
            const ir = {
                version: '1.0.0',
                workflow: { id: 'wf-1', name: 'Test' },
                nodes: [
                    { id: 'n1', type: 'twiddle.httpRequest', name: 'HTTP 1' },
                    { id: 'n1', type: 'twiddle.runScript', name: 'Script' }, // Duplicate
                ],
                connections: [],
            };

            const result = validateFull(ir);
            expect(result.valid).toBe(false);
            expect(result.errors?.some(e => e.message.includes('Duplicate'))).toBe(true);
        });

        it('should pass for valid workflow with connections', () => {
            const ir = {
                version: '1.0.0',
                workflow: { id: 'wf-1', name: 'Test' },
                nodes: [
                    { id: 'n1', type: 'twiddle.httpRequest', name: 'HTTP' },
                    { id: 'n2', type: 'twiddle.runScript', name: 'Script' },
                ],
                connections: [
                    { source: 'n1', target: 'n2' },
                ],
            };

            const result = validateFull(ir);
            expect(result.valid).toBe(true);
        });
    });
});
