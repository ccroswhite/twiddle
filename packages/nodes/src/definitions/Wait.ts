import type { NodeDefinition } from '@twiddle/shared';

export const WaitNode: NodeDefinition = {
  type: 'twiddle.wait',
  displayName: 'Wait',
  description: 'Pause workflow execution for a specified duration or until a specific time',
  icon: 'clock',
  iconColor: '#ff9800',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'resumeMode',
      displayName: 'Resume',
      type: 'options',
      default: 'afterTime',
      options: [
        { name: 'After Time Interval', value: 'afterTime', description: 'Wait for a specified duration' },
        { name: 'At Specific Time', value: 'atTime', description: 'Wait until a specific date/time' },
        { name: 'On Webhook Call', value: 'webhook', description: 'Wait until a webhook is called' },
        { name: 'On External Event', value: 'event', description: 'Wait for an external event/signal' },
      ],
      description: 'When to resume workflow execution',
    },
    // ==================== AFTER TIME INTERVAL ====================
    {
      name: 'waitAmount',
      displayName: 'Wait Amount',
      type: 'number',
      default: 1,
      description: 'How long to wait',
      displayOptions: {
        show: {
          resumeMode: ['afterTime'],
        },
      },
      required: true,
    },
    {
      name: 'waitUnit',
      displayName: 'Wait Unit',
      type: 'options',
      default: 'minutes',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
        { name: 'Weeks', value: 'weeks' },
        { name: 'Months', value: 'months' },
      ],
      description: 'Time unit for the wait duration',
      displayOptions: {
        show: {
          resumeMode: ['afterTime'],
        },
      },
    },
    // ==================== AT SPECIFIC TIME ====================
    {
      name: 'dateTime',
      displayName: 'Date & Time',
      type: 'string',
      default: '',
      placeholder: '2024-12-31T23:59:59',
      description: 'Specific date and time to resume (ISO 8601 format)',
      displayOptions: {
        show: {
          resumeMode: ['atTime'],
        },
      },
      required: true,
    },
    {
      name: 'dateTimeSource',
      displayName: 'Date/Time Source',
      type: 'options',
      default: 'manual',
      options: [
        { name: 'Manual Input', value: 'manual', description: 'Enter date/time manually' },
        { name: 'From Field', value: 'field', description: 'Get date/time from input data field' },
        { name: 'Expression', value: 'expression', description: 'Calculate date/time using expression' },
      ],
      description: 'How to specify the resume time',
      displayOptions: {
        show: {
          resumeMode: ['atTime'],
        },
      },
    },
    {
      name: 'dateTimeField',
      displayName: 'Date/Time Field',
      type: 'string',
      default: '',
      placeholder: 'scheduledTime',
      description: 'Name of the field containing the date/time',
      displayOptions: {
        show: {
          resumeMode: ['atTime'],
          dateTimeSource: ['field'],
        },
      },
    },
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'UTC',
      placeholder: 'America/New_York',
      description: 'Timezone for the specified time (IANA timezone name)',
      displayOptions: {
        show: {
          resumeMode: ['atTime'],
        },
      },
    },
    // ==================== ON WEBHOOK CALL ====================
    {
      name: 'webhookSuffix',
      displayName: 'Webhook Suffix',
      type: 'string',
      default: '',
      placeholder: 'my-webhook',
      description: 'Unique suffix for the webhook URL',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
        },
      },
    },
    {
      name: 'webhookMethod',
      displayName: 'HTTP Method',
      type: 'options',
      default: 'POST',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'PATCH', value: 'PATCH' },
        { name: 'DELETE', value: 'DELETE' },
      ],
      description: 'HTTP method the webhook should respond to',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
        },
      },
    },
    {
      name: 'webhookAuthentication',
      displayName: 'Authentication',
      type: 'options',
      default: 'none',
      options: [
        { name: 'None', value: 'none' },
        { name: 'Basic Auth', value: 'basicAuth' },
        { name: 'Header Auth', value: 'headerAuth' },
      ],
      description: 'Authentication method for the webhook',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
        },
      },
    },
    {
      name: 'webhookResponseCode',
      displayName: 'Response Code',
      type: 'number',
      default: 200,
      description: 'HTTP status code to return when webhook is called',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
        },
      },
    },
    {
      name: 'webhookResponseData',
      displayName: 'Response Data',
      type: 'options',
      default: 'noData',
      options: [
        { name: 'No Response Data', value: 'noData' },
        { name: 'First Entry JSON', value: 'firstEntryJson' },
        { name: 'Custom JSON', value: 'customJson' },
        { name: 'Custom Text', value: 'customText' },
      ],
      description: 'What to respond with when webhook is called',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
        },
      },
    },
    {
      name: 'webhookCustomResponse',
      displayName: 'Custom Response',
      type: 'string',
      default: '',
      description: 'Custom response data',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
          webhookResponseData: ['customJson', 'customText'],
        },
      },
    },
    {
      name: 'includeWebhookData',
      displayName: 'Include Webhook Data',
      type: 'boolean',
      default: true,
      description: 'Include the webhook request data in the output',
      displayOptions: {
        show: {
          resumeMode: ['webhook'],
        },
      },
    },
    // ==================== ON EXTERNAL EVENT ====================
    {
      name: 'eventName',
      displayName: 'Event Name',
      type: 'string',
      default: '',
      placeholder: 'approval_received',
      description: 'Name of the event to wait for',
      displayOptions: {
        show: {
          resumeMode: ['event'],
        },
      },
      required: true,
    },
    {
      name: 'eventCorrelationKey',
      displayName: 'Correlation Key',
      type: 'string',
      default: '',
      placeholder: 'orderId',
      description: 'Field to use for correlating events with this execution',
      displayOptions: {
        show: {
          resumeMode: ['event'],
        },
      },
    },
    {
      name: 'eventCorrelationValue',
      displayName: 'Correlation Value',
      type: 'string',
      default: '',
      description: 'Value to match for the correlation key',
      displayOptions: {
        show: {
          resumeMode: ['event'],
        },
      },
    },
    // ==================== TIMEOUT OPTIONS ====================
    {
      name: 'useTimeout',
      displayName: 'Use Timeout',
      type: 'boolean',
      default: false,
      description: 'Set a maximum time to wait',
      displayOptions: {
        show: {
          resumeMode: ['webhook', 'event'],
        },
      },
    },
    {
      name: 'timeoutAmount',
      displayName: 'Timeout Amount',
      type: 'number',
      default: 60,
      description: 'Maximum time to wait before timing out',
      displayOptions: {
        show: {
          resumeMode: ['webhook', 'event'],
          useTimeout: [true],
        },
      },
    },
    {
      name: 'timeoutUnit',
      displayName: 'Timeout Unit',
      type: 'options',
      default: 'minutes',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
      ],
      description: 'Time unit for the timeout',
      displayOptions: {
        show: {
          resumeMode: ['webhook', 'event'],
          useTimeout: [true],
        },
      },
    },
    {
      name: 'timeoutAction',
      displayName: 'On Timeout',
      type: 'options',
      default: 'error',
      options: [
        { name: 'Throw Error', value: 'error', description: 'Stop execution with an error' },
        { name: 'Continue', value: 'continue', description: 'Continue with empty data' },
        { name: 'Use Default Data', value: 'default', description: 'Continue with default data' },
      ],
      description: 'What to do when timeout is reached',
      displayOptions: {
        show: {
          resumeMode: ['webhook', 'event'],
          useTimeout: [true],
        },
      },
    },
    {
      name: 'timeoutDefaultData',
      displayName: 'Default Data',
      type: 'json',
      default: '{}',
      description: 'Default data to use on timeout',
      displayOptions: {
        show: {
          resumeMode: ['webhook', 'event'],
          useTimeout: [true],
          timeoutAction: ['default'],
        },
      },
    },
    // ==================== OUTPUT OPTIONS ====================
    {
      name: 'preserveInput',
      displayName: 'Preserve Input Data',
      type: 'boolean',
      default: true,
      description: 'Include the original input data in the output',
    },
    {
      name: 'addWaitInfo',
      displayName: 'Add Wait Info',
      type: 'boolean',
      default: false,
      description: 'Add information about the wait (start time, end time, duration)',
    },
  ],
  subtitle: '={{$parameter["resumeMode"] === "afterTime" ? $parameter["waitAmount"] + " " + $parameter["waitUnit"] : $parameter["resumeMode"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/wait',
};
