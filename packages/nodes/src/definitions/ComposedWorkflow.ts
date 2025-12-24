import type { NodeDefinition } from '@twiddle/shared';

export const ComposedWorkflowNode: NodeDefinition = {
    type: 'twiddle.composedWorkflow',
    displayName: 'Composed Workflow',
    description: 'Embed an existing workflow as a reusable component',
    icon: 'layers',
    iconColor: '#8b5cf6', // Purple/violet
    category: 'core',
    version: 1,
    inputs: ['main'], // Dynamic - will be overridden at runtime
    outputs: ['main'], // Dynamic - will be overridden at runtime
    parameters: [
        {
            name: 'workflowId',
            displayName: 'Workflow ID',
            type: 'string',
            default: '',
            description: 'The ID of the embedded workflow',
            required: true,
            typeOptions: {
                readonly: true,
            },
        },
        {
            name: 'workflowName',
            displayName: 'Workflow Name',
            type: 'string',
            default: '',
            description: 'Display name of the embedded workflow',
            typeOptions: {
                readonly: true,
            },
        },
        {
            name: 'workflowVersion',
            displayName: 'Version',
            type: 'number',
            default: 0,
            description: 'Version of the embedded workflow (locked at creation time)',
            typeOptions: {
                readonly: true,
            },
        },
        {
            name: 'versionPolicy',
            displayName: 'Version Policy',
            type: 'options',
            default: 'latest',
            options: [
                {
                    name: 'Latest Version',
                    value: 'latest',
                    description: 'Always use the latest version',
                },
                {
                    name: 'Specific Version',
                    value: 'locked',
                    description: 'Lock to a specific version',
                },
            ],
            description: 'Control how creating/loading handles versions',
        },
        {
            name: 'embeddedNodes',
            displayName: 'Embedded Nodes',
            type: 'json',
            default: '[]',
            description: 'Cached structure of embedded workflow nodes (read-only)',
            typeOptions: {
                readonly: true,
                rows: 10,
                editor: 'codeEditor',
                editorLanguage: 'json',
            },
        },
        {
            name: 'embeddedConnections',
            displayName: 'Embedded Connections',
            type: 'json',
            default: '[]',
            description: 'Cached structure of embedded workflow connections (read-only)',
            typeOptions: {
                readonly: true,
                rows: 10,
                editor: 'codeEditor',
                editorLanguage: 'json',
            },
        },
        {
            name: 'inputHandles',
            displayName: 'Input Handles',
            type: 'json',
            default: '[]',
            description: 'Computed input handles from DAG edge nodes (read-only)',
            typeOptions: {
                readonly: true,
                rows: 5,
                editor: 'codeEditor',
                editorLanguage: 'json',
            },
        },
        {
            name: 'outputHandles',
            displayName: 'Output Handles',
            type: 'json',
            default: '[]',
            description: 'Computed output handles from DAG edge nodes (read-only)',
            typeOptions: {
                readonly: true,
                rows: 5,
                editor: 'codeEditor',
                editorLanguage: 'json',
            },
        },
    ],
    subtitle: '={{$parameter["workflowName"]}}',
    documentationUrl: 'https://docs.twiddle.io/nodes/composed-workflow',
};
