import type { NodeDefinition } from '@twiddle/shared';

export const StartNode: NodeDefinition = {
  type: 'twiddle.start',
  displayName: 'Start',
  description: 'Starting point of the workflow. Executes when the workflow is manually triggered.',
  icon: 'play',
  iconColor: '#00c853',
  category: 'core',
  version: 1,
  inputs: [],
  outputs: ['main'],
  parameters: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'empty',
      options: [
        { name: 'Empty', value: 'empty', description: 'Start with no data' },
        { name: 'Static Data', value: 'static', description: 'Start with predefined static data' },
        { name: 'Input Parameters', value: 'parameters', description: 'Accept input parameters when triggered' },
      ],
      description: 'How to initialize the workflow data',
    },
    // Static Data Mode
    {
      name: 'staticData',
      displayName: 'Static Data',
      type: 'json',
      default: '{}',
      description: 'Static JSON data to pass to the workflow',
      displayOptions: {
        show: {
          mode: ['static'],
        },
      },
      typeOptions: {
        rows: 10,
        editor: 'codeEditor',
        editorLanguage: 'json',
      },
    },
    {
      name: 'staticDataArray',
      displayName: 'Multiple Items',
      type: 'boolean',
      default: false,
      description: 'Treat static data as an array of items',
      displayOptions: {
        show: {
          mode: ['static'],
        },
      },
    },
    // Input Parameters Mode
    {
      name: 'inputParameters',
      displayName: 'Input Parameters',
      type: 'fixedCollection',
      default: {},
      description: 'Define input parameters that can be passed when triggering the workflow',
      displayOptions: {
        show: {
          mode: ['parameters'],
        },
      },
      typeOptions: {
        multipleValues: true,
      },
    },
    {
      name: 'validateInputs',
      displayName: 'Validate Inputs',
      type: 'boolean',
      default: true,
      description: 'Validate that required parameters are provided',
      displayOptions: {
        show: {
          mode: ['parameters'],
        },
      },
    },
    {
      name: 'defaultValues',
      displayName: 'Default Values',
      type: 'json',
      default: '{}',
      description: 'Default values for optional parameters',
      displayOptions: {
        show: {
          mode: ['parameters'],
        },
      },
    },
    // Output Options
    {
      name: 'includeMetadata',
      displayName: 'Include Metadata',
      type: 'boolean',
      default: false,
      description: 'Include workflow metadata in the output',
    },
    {
      name: 'metadataOptions',
      displayName: 'Metadata to Include',
      type: 'multiOptions',
      default: ['workflowId', 'executionId', 'timestamp'],
      options: [
        { name: 'Workflow ID', value: 'workflowId' },
        { name: 'Workflow Name', value: 'workflowName' },
        { name: 'Execution ID', value: 'executionId' },
        { name: 'Timestamp', value: 'timestamp' },
        { name: 'Timezone', value: 'timezone' },
        { name: 'Environment', value: 'environment' },
        { name: 'Triggered By', value: 'triggeredBy' },
      ],
      description: 'Which metadata fields to include',
      displayOptions: {
        show: {
          includeMetadata: [true],
        },
      },
    },
    // Execution Options
    {
      name: 'continueOnEmpty',
      displayName: 'Continue on Empty',
      type: 'boolean',
      default: true,
      description: 'Continue workflow execution even if no data is provided',
    },
    {
      name: 'notes',
      displayName: 'Notes',
      type: 'string',
      default: '',
      description: 'Notes about this workflow start point (for documentation)',
      typeOptions: {
        rows: 3,
      },
    },
  ],
  subtitle: '={{$parameter["mode"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/start',
};
