import { describe, it, expect } from 'vitest';
import { irToTemporal } from '../src/lib/export/temporal-adapter';

describe('Temporal Adapter', () => {
    const sampleIR = {
        version: '1.0.0',
        workflow: {
            id: 'wf-123',
            name: 'Order Processing',
            description: 'Process incoming orders',
            taskQueue: 'order-queue',
            tags: ['orders', 'production'],
        },
        nodes: [
            {
                id: 'trigger',
                type: 'twiddle.manualTrigger',
                name: 'Start',
            },
            {
                id: 'validate',
                type: 'twiddle.pythonCode',
                name: 'Validate Order',
                parameters: {
                    code: 'validate_order(data)',
                },
                activityOptions: {
                    startToCloseTimeout: 60,
                    retryPolicy: {
                        maxAttempts: 3,
                        backoffCoefficient: 2,
                    },
                },
            },
            {
                id: 'charge',
                type: 'twiddle.httpRequest',
                name: 'Charge Payment',
                parameters: {
                    url: 'https://payment.api/charge',
                    method: 'POST',
                },
                activityOptions: {
                    startToCloseTimeout: 300,
                },
            },
            {
                id: 'notify',
                type: 'twiddle.sendEmail',
                name: 'Send Confirmation',
                parameters: {
                    to: '{{customer.email}}',
                    subject: 'Order Confirmed',
                },
                activityOptions: {
                    continueOnFail: true,
                },
            },
        ],
        connections: [
            { source: 'trigger', target: 'validate' },
            { source: 'validate', target: 'charge' },
            { source: 'charge', target: 'notify' },
        ],
    };

    describe('irToTemporal', () => {
        it('should convert IR to Temporal workflow model', () => {
            const temporal = irToTemporal(sampleIR);

            expect(temporal.className).toBe('OrderProcessingWorkflow');
            expect(temporal.functionName).toBe('order_processing');
            expect(temporal.taskQueue).toBe('order-queue');
            expect(temporal.description).toBe('Process incoming orders');
        });

        it('should filter out trigger nodes from activities', () => {
            const temporal = irToTemporal(sampleIR);

            expect(temporal.activities).toHaveLength(3);
            expect(temporal.activities.find(a => a.nodeType === 'twiddle.manualTrigger')).toBeUndefined();
        });

        it('should generate correct function names', () => {
            const temporal = irToTemporal(sampleIR);

            expect(temporal.activities[0].functionName).toBe('execute_pythoncode');
            expect(temporal.activities[1].functionName).toBe('execute_httprequest');
            expect(temporal.activities[2].functionName).toBe('execute_sendemail');
        });

        it('should preserve activity options', () => {
            const temporal = irToTemporal(sampleIR);

            const validateActivity = temporal.activities.find(a => a.name === 'Validate Order');
            expect(validateActivity?.options.startToCloseTimeout).toBe(60);
            expect(validateActivity?.options.retryPolicy?.maximumAttempts).toBe(3);
            expect(validateActivity?.options.retryPolicy?.backoffCoefficient).toBe(2);

            const notifyActivity = temporal.activities.find(a => a.name === 'Send Confirmation');
            expect(notifyActivity?.continueOnFail).toBe(true);
        });

        it('should build execution order correctly', () => {
            const temporal = irToTemporal(sampleIR);

            // Should have 3 steps (all activities)
            expect(temporal.executionOrder).toHaveLength(3);

            // First activity has no dependencies (trigger is ignored)
            const firstStep = temporal.executionOrder.find(s => s.activityId === 'validate');
            expect(firstStep?.dependsOn).toEqual([]);

            // Second activity depends on first
            const secondStep = temporal.executionOrder.find(s => s.activityId === 'charge');
            expect(secondStep?.dependsOn).toContain('validate');

            // Third activity depends on second
            const thirdStep = temporal.executionOrder.find(s => s.activityId === 'notify');
            expect(thirdStep?.dependsOn).toContain('charge');
        });

        it('should use default timeout when not specified', () => {
            const minimalIR = {
                version: '1.0.0',
                workflow: { id: 'wf-1', name: 'Test' },
                nodes: [
                    { id: 'n1', type: 'twiddle.httpRequest', name: 'HTTP' },
                ],
                connections: [],
            };

            const temporal = irToTemporal(minimalIR);

            expect(temporal.activities[0].options.startToCloseTimeout).toBe(300); // 5 minute default
        });

        it('should generate task queue from workflow name if not specified', () => {
            const noQueueIR = {
                version: '1.0.0',
                workflow: { id: 'wf-1', name: 'My Cool Workflow' },
                nodes: [{ id: 'n1', type: 'twiddle.httpRequest', name: 'HTTP' }],
                connections: [],
            };

            const temporal = irToTemporal(noQueueIR);

            expect(temporal.taskQueue).toBe('my-cool-workflow');
        });
    });

    describe('parallel execution support', () => {
        it('should handle parallel branches', () => {
            const parallelIR = {
                version: '1.0.0',
                workflow: { id: 'wf-1', name: 'Parallel Test' },
                nodes: [
                    { id: 'start', type: 'twiddle.manualTrigger', name: 'Start' },
                    { id: 'a', type: 'twiddle.httpRequest', name: 'Task A' },
                    { id: 'b', type: 'twiddle.httpRequest', name: 'Task B' },
                    { id: 'c', type: 'twiddle.httpRequest', name: 'Task C' },
                ],
                connections: [
                    { source: 'start', target: 'a' },
                    { source: 'start', target: 'b' },
                    { source: 'a', target: 'c' },
                    { source: 'b', target: 'c' },
                ],
            };

            const temporal = irToTemporal(parallelIR);

            // A and B should have no dependencies (parallel)
            const stepA = temporal.executionOrder.find(s => s.activityId === 'a');
            const stepB = temporal.executionOrder.find(s => s.activityId === 'b');
            expect(stepA?.dependsOn).toEqual([]);
            expect(stepB?.dependsOn).toEqual([]);

            // C should depend on both A and B
            const stepC = temporal.executionOrder.find(s => s.activityId === 'c');
            expect(stepC?.dependsOn).toContain('a');
            expect(stepC?.dependsOn).toContain('b');
        });
    });
});
