import type { NodeDefinition } from '@twiddle/shared';

export const DateTimeNode: NodeDefinition = {
  type: 'twiddle.dateTime',
  displayName: 'Date & Time',
  description: 'Get, format, or manipulate date and time values',
  icon: 'clock',
  iconColor: '#2196f3',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'now',
      options: [
        { name: 'Current Date/Time', value: 'now', description: 'Get the current date and time' },
        { name: 'Format Date', value: 'format', description: 'Format a date to a string' },
        { name: 'Parse Date', value: 'parse', description: 'Parse a string to a date' },
        { name: 'Add/Subtract', value: 'add', description: 'Add or subtract time from a date' },
        { name: 'Difference', value: 'diff', description: 'Calculate difference between two dates' },
        { name: 'Extract Part', value: 'extract', description: 'Extract a part of the date (year, month, day, etc.)' },
        { name: 'Start/End Of', value: 'startEndOf', description: 'Get start or end of a time period' },
      ],
    },
    // Current Date/Time options
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'UTC',
      description: 'Timezone for the date/time (e.g., UTC, America/New_York, Europe/London)',
    },
    {
      name: 'outputFormat',
      displayName: 'Output Format',
      type: 'options',
      default: 'iso',
      options: [
        { name: 'ISO 8601', value: 'iso', description: 'ISO 8601 format (2024-01-15T10:30:00Z)' },
        { name: 'Unix Timestamp', value: 'unix', description: 'Unix timestamp in seconds' },
        { name: 'Unix Milliseconds', value: 'unixMs', description: 'Unix timestamp in milliseconds' },
        { name: 'Custom Format', value: 'custom', description: 'Custom format string' },
      ],
      displayOptions: {
        show: {
          operation: ['now', 'format', 'parse', 'add', 'startEndOf'],
        },
      },
    },
    {
      name: 'customFormat',
      displayName: 'Custom Format',
      type: 'string',
      default: 'YYYY-MM-DD HH:mm:ss',
      description: 'Custom date format (e.g., YYYY-MM-DD, MM/DD/YYYY HH:mm)',
      displayOptions: {
        show: {
          outputFormat: ['custom'],
        },
      },
    },
    // Format/Parse options
    {
      name: 'inputValue',
      displayName: 'Input Value',
      type: 'string',
      default: '',
      description: 'The date/time value to process',
      displayOptions: {
        show: {
          operation: ['format', 'parse', 'add', 'diff', 'extract', 'startEndOf'],
        },
      },
    },
    {
      name: 'inputFormat',
      displayName: 'Input Format',
      type: 'string',
      default: '',
      description: 'Format of the input date string (leave empty for auto-detect)',
      displayOptions: {
        show: {
          operation: ['parse'],
        },
      },
    },
    // Add/Subtract options
    {
      name: 'addSubtract',
      displayName: 'Add or Subtract',
      type: 'options',
      default: 'add',
      options: [
        { name: 'Add', value: 'add', description: 'Add time to the date' },
        { name: 'Subtract', value: 'subtract', description: 'Subtract time from the date' },
      ],
      displayOptions: {
        show: {
          operation: ['add'],
        },
      },
    },
    {
      name: 'duration',
      displayName: 'Duration',
      type: 'number',
      default: 1,
      description: 'Amount of time to add or subtract',
      displayOptions: {
        show: {
          operation: ['add'],
        },
      },
    },
    {
      name: 'durationUnit',
      displayName: 'Duration Unit',
      type: 'options',
      default: 'days',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
        { name: 'Weeks', value: 'weeks' },
        { name: 'Months', value: 'months' },
        { name: 'Years', value: 'years' },
      ],
      displayOptions: {
        show: {
          operation: ['add'],
        },
      },
    },
    // Difference options
    {
      name: 'secondDate',
      displayName: 'Second Date',
      type: 'string',
      default: '',
      description: 'The second date to compare',
      displayOptions: {
        show: {
          operation: ['diff'],
        },
      },
    },
    {
      name: 'diffUnit',
      displayName: 'Difference Unit',
      type: 'options',
      default: 'days',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
        { name: 'Weeks', value: 'weeks' },
        { name: 'Months', value: 'months' },
        { name: 'Years', value: 'years' },
      ],
      displayOptions: {
        show: {
          operation: ['diff'],
        },
      },
    },
    // Extract options
    {
      name: 'extractPart',
      displayName: 'Part to Extract',
      type: 'options',
      default: 'year',
      options: [
        { name: 'Year', value: 'year' },
        { name: 'Month', value: 'month' },
        { name: 'Day', value: 'day' },
        { name: 'Hour', value: 'hour' },
        { name: 'Minute', value: 'minute' },
        { name: 'Second', value: 'second' },
        { name: 'Day of Week', value: 'dayOfWeek' },
        { name: 'Day of Year', value: 'dayOfYear' },
        { name: 'Week of Year', value: 'weekOfYear' },
        { name: 'Quarter', value: 'quarter' },
      ],
      displayOptions: {
        show: {
          operation: ['extract'],
        },
      },
    },
    // Start/End Of options
    {
      name: 'startOrEnd',
      displayName: 'Start or End',
      type: 'options',
      default: 'start',
      options: [
        { name: 'Start Of', value: 'start', description: 'Get the start of the period' },
        { name: 'End Of', value: 'end', description: 'Get the end of the period' },
      ],
      displayOptions: {
        show: {
          operation: ['startEndOf'],
        },
      },
    },
    {
      name: 'periodUnit',
      displayName: 'Period',
      type: 'options',
      default: 'day',
      options: [
        { name: 'Second', value: 'second' },
        { name: 'Minute', value: 'minute' },
        { name: 'Hour', value: 'hour' },
        { name: 'Day', value: 'day' },
        { name: 'Week', value: 'week' },
        { name: 'Month', value: 'month' },
        { name: 'Quarter', value: 'quarter' },
        { name: 'Year', value: 'year' },
      ],
      displayOptions: {
        show: {
          operation: ['startEndOf'],
        },
      },
    },
    // Output field
    {
      name: 'outputField',
      displayName: 'Output Field',
      type: 'string',
      default: 'dateTime',
      description: 'Name of the field to store the result',
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/date-time',
};
