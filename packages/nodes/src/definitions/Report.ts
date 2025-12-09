import type { NodeDefinition } from '@twiddle/shared';

export const ReportNode: NodeDefinition = {
  type: 'twiddle.report',
  displayName: 'Send Report',
  description: 'Send a report of workflow execution results via email',
  icon: 'mail',
  iconColor: '#10b981',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'to',
      displayName: 'To',
      type: 'string',
      default: '',
      required: true,
      description: 'Email address(es) to send the report to. Separate multiple addresses with commas.',
      placeholder: 'email@example.com',
    },
    {
      name: 'cc',
      displayName: 'CC',
      type: 'string',
      default: '',
      description: 'Email address(es) to CC. Separate multiple addresses with commas.',
      placeholder: 'cc@example.com',
    },
    {
      name: 'subject',
      displayName: 'Subject',
      type: 'string',
      default: 'Workflow Execution Report: {{$workflow.name}}',
      description: 'Email subject line. Supports expressions.',
    },
    {
      name: 'reportType',
      displayName: 'Report Type',
      type: 'options',
      default: 'summary',
      options: [
        { name: 'Summary', value: 'summary', description: 'Brief summary of all activities' },
        { name: 'Detailed', value: 'detailed', description: 'Detailed report with all data' },
        { name: 'Errors Only', value: 'errors', description: 'Only report failed activities' },
      ],
    },
    {
      name: 'includeTimings',
      displayName: 'Include Timings',
      type: 'boolean',
      default: true,
      description: 'Include execution time for each activity',
    },
    {
      name: 'includeInputOutput',
      displayName: 'Include Input/Output Data',
      type: 'boolean',
      default: false,
      description: 'Include input and output data for each activity (may contain sensitive data)',
      displayOptions: {
        show: {
          reportType: ['detailed'],
        },
      },
    },
    {
      name: 'sendCondition',
      displayName: 'Send Condition',
      type: 'options',
      default: 'always',
      options: [
        { name: 'Always', value: 'always', description: 'Always send the report' },
        { name: 'On Error', value: 'onError', description: 'Only send if any activity failed' },
        { name: 'On Success', value: 'onSuccess', description: 'Only send if all activities succeeded' },
      ],
    },
    {
      name: 'smtpCredential',
      displayName: 'SMTP Credential',
      type: 'credentials',
      default: '',
      description: 'SMTP credential to use for sending email',
      typeOptions: {
        credentialType: 'smtp',
      },
    },
    {
      name: 'customMessage',
      displayName: 'Custom Message',
      type: 'string',
      default: '',
      description: 'Optional custom message to include at the top of the report',
      typeOptions: {
        rows: 4,
      },
    },
  ],
  subtitle: 'Send execution report to {{$parameter.to}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/report',
};
