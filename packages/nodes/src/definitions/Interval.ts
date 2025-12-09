import type { NodeDefinition } from '@twiddle/shared';

export const IntervalNode: NodeDefinition = {
  type: 'twiddle.interval',
  displayName: 'Interval',
  description: 'Trigger workflow execution at regular intervals',
  icon: 'clock',
  iconColor: '#00b050',
  category: 'core',
  version: 1,
  inputs: [],
  outputs: ['main'],
  parameters: [
    {
      name: 'intervalType',
      displayName: 'Interval Type',
      type: 'options',
      default: 'simple',
      options: [
        { name: 'Simple Interval', value: 'simple', description: 'Run at a fixed time interval' },
        { name: 'Cron Expression', value: 'cron', description: 'Use a cron expression for complex schedules' },
      ],
      description: 'How to define the interval',
    },
    // Simple Interval Options
    {
      name: 'interval',
      displayName: 'Interval',
      type: 'number',
      default: 1,
      description: 'How often to trigger',
      displayOptions: {
        show: {
          intervalType: ['simple'],
        },
      },
      required: true,
    },
    {
      name: 'unit',
      displayName: 'Unit',
      type: 'options',
      default: 'hours',
      options: [
        { name: 'Seconds', value: 'seconds' },
        { name: 'Minutes', value: 'minutes' },
        { name: 'Hours', value: 'hours' },
        { name: 'Days', value: 'days' },
        { name: 'Weeks', value: 'weeks' },
        { name: 'Months', value: 'months' },
      ],
      description: 'Time unit for the interval',
      displayOptions: {
        show: {
          intervalType: ['simple'],
        },
      },
    },
    // Cron Expression
    {
      name: 'cronExpression',
      displayName: 'Cron Expression',
      type: 'string',
      default: '0 * * * *',
      placeholder: '0 * * * * (every hour)',
      description: 'Cron expression (minute hour day month weekday)',
      displayOptions: {
        show: {
          intervalType: ['cron'],
        },
      },
      required: true,
    },
    {
      name: 'cronPresets',
      displayName: 'Common Schedules',
      type: 'options',
      default: 'custom',
      options: [
        { name: 'Custom', value: 'custom', description: 'Use custom cron expression' },
        { name: 'Every Minute', value: '* * * * *' },
        { name: 'Every 5 Minutes', value: '*/5 * * * *' },
        { name: 'Every 15 Minutes', value: '*/15 * * * *' },
        { name: 'Every 30 Minutes', value: '*/30 * * * *' },
        { name: 'Every Hour', value: '0 * * * *' },
        { name: 'Every 2 Hours', value: '0 */2 * * *' },
        { name: 'Every 6 Hours', value: '0 */6 * * *' },
        { name: 'Every 12 Hours', value: '0 */12 * * *' },
        { name: 'Daily at Midnight', value: '0 0 * * *' },
        { name: 'Daily at Noon', value: '0 12 * * *' },
        { name: 'Weekly on Monday', value: '0 0 * * 1' },
        { name: 'Monthly on 1st', value: '0 0 1 * *' },
      ],
      description: 'Select a common schedule or use custom',
      displayOptions: {
        show: {
          intervalType: ['cron'],
        },
      },
    },
    // Timezone
    {
      name: 'timezone',
      displayName: 'Timezone',
      type: 'string',
      default: 'UTC',
      placeholder: 'America/New_York, Europe/London, Asia/Tokyo',
      description: 'Timezone for the schedule (IANA timezone name)',
    },
    // Start/End Time
    {
      name: 'useStartTime',
      displayName: 'Use Start Time',
      type: 'boolean',
      default: false,
      description: 'Only run after a specific date/time',
    },
    {
      name: 'startTime',
      displayName: 'Start Time',
      type: 'string',
      default: '',
      placeholder: '2024-01-01T00:00:00',
      description: 'Start running from this date/time (ISO 8601 format)',
      displayOptions: {
        show: {
          useStartTime: [true],
        },
      },
    },
    {
      name: 'useEndTime',
      displayName: 'Use End Time',
      type: 'boolean',
      default: false,
      description: 'Stop running after a specific date/time',
    },
    {
      name: 'endTime',
      displayName: 'End Time',
      type: 'string',
      default: '',
      placeholder: '2024-12-31T23:59:59',
      description: 'Stop running after this date/time (ISO 8601 format)',
      displayOptions: {
        show: {
          useEndTime: [true],
        },
      },
    },
    // Execution Limits
    {
      name: 'maxExecutions',
      displayName: 'Max Executions',
      type: 'number',
      default: 0,
      description: 'Maximum number of times to execute (0 = unlimited)',
    },
    // Jitter
    {
      name: 'useJitter',
      displayName: 'Add Random Jitter',
      type: 'boolean',
      default: false,
      description: 'Add random delay to prevent thundering herd',
    },
    {
      name: 'jitterMax',
      displayName: 'Max Jitter (seconds)',
      type: 'number',
      default: 60,
      description: 'Maximum random delay in seconds',
      displayOptions: {
        show: {
          useJitter: [true],
        },
      },
    },
    // Missed Executions
    {
      name: 'catchUpMissed',
      displayName: 'Catch Up Missed Executions',
      type: 'boolean',
      default: false,
      description: 'Execute missed runs if workflow was inactive',
    },
    {
      name: 'maxCatchUp',
      displayName: 'Max Catch Up Executions',
      type: 'number',
      default: 10,
      description: 'Maximum number of missed executions to catch up',
      displayOptions: {
        show: {
          catchUpMissed: [true],
        },
      },
    },
    // Concurrency
    {
      name: 'allowConcurrent',
      displayName: 'Allow Concurrent Executions',
      type: 'boolean',
      default: false,
      description: 'Allow new execution while previous is still running',
    },
    // Output Data
    {
      name: 'includeTimestamp',
      displayName: 'Include Timestamp',
      type: 'boolean',
      default: true,
      description: 'Include execution timestamp in output',
    },
    {
      name: 'includeExecutionCount',
      displayName: 'Include Execution Count',
      type: 'boolean',
      default: false,
      description: 'Include total execution count in output',
    },
    {
      name: 'includeNextRun',
      displayName: 'Include Next Run Time',
      type: 'boolean',
      default: false,
      description: 'Include next scheduled run time in output',
    },
    {
      name: 'customData',
      displayName: 'Custom Data',
      type: 'json',
      default: '{}',
      description: 'Custom data to include in every execution',
    },
  ],
  subtitle: '={{$parameter["intervalType"] === "simple" ? $parameter["interval"] + " " + $parameter["unit"] : $parameter["cronExpression"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/interval',
};
