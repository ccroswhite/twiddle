import type { NodeDefinition } from '@twiddle/shared';

export const SwitchNode: NodeDefinition = {
  type: 'twiddle.switch',
  displayName: 'Switch',
  description: 'Route items to different outputs based on matching rules',
  icon: 'git-merge',
  iconColor: '#8b5cf6',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['output0', 'output1', 'output2', 'output3', 'fallback'],
  parameters: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'rules',
      options: [
        { name: 'Rules', value: 'rules', description: 'Match against defined rules' },
        { name: 'Expression', value: 'expression', description: 'Match value against cases' },
      ],
      description: 'How to determine the output',
    },
    {
      name: 'dataToMatch',
      displayName: 'Value to Match',
      type: 'string',
      default: '',
      placeholder: '{{$json.status}}',
      description: 'The value to match against cases',
      displayOptions: {
        show: {
          mode: ['expression'],
        },
      },
    },
    {
      name: 'rules',
      displayName: 'Routing Rules',
      type: 'fixedCollection',
      default: { rules: [] },
      description: 'Rules to determine which output to use',
      typeOptions: {
        multipleValues: true,
      },
      displayOptions: {
        show: {
          mode: ['rules'],
        },
      },
      options: [
        {
          name: 'rules',
          displayName: 'Rule',
          values: [
            {
              name: 'output',
              displayName: 'Output',
              type: 'options',
              default: 'output0',
              options: [
                { name: 'Output 0', value: 'output0' },
                { name: 'Output 1', value: 'output1' },
                { name: 'Output 2', value: 'output2' },
                { name: 'Output 3', value: 'output3' },
              ],
              description: 'Which output to route to',
            },
            {
              name: 'value',
              displayName: 'Value',
              type: 'string',
              default: '',
              placeholder: '{{$json.field}}',
              description: 'The value to check',
            },
            {
              name: 'operation',
              displayName: 'Operation',
              type: 'options',
              default: 'equals',
              options: [
                { name: 'Equals', value: 'equals' },
                { name: 'Not Equals', value: 'notEquals' },
                { name: 'Contains', value: 'contains' },
                { name: 'Starts With', value: 'startsWith' },
                { name: 'Ends With', value: 'endsWith' },
                { name: 'Regex', value: 'regex' },
                { name: 'Greater Than', value: 'gt' },
                { name: 'Less Than', value: 'lt' },
                { name: 'Is Empty', value: 'isEmpty' },
                { name: 'Is Not Empty', value: 'isNotEmpty' },
              ],
              description: 'The comparison operation',
            },
            {
              name: 'compareValue',
              displayName: 'Compare To',
              type: 'string',
              default: '',
              placeholder: 'comparison value',
              description: 'Value to compare against',
              displayOptions: {
                hide: {
                  operation: ['isEmpty', 'isNotEmpty'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      name: 'cases',
      displayName: 'Cases',
      type: 'fixedCollection',
      default: { cases: [] },
      description: 'Cases to match against the value',
      typeOptions: {
        multipleValues: true,
      },
      displayOptions: {
        show: {
          mode: ['expression'],
        },
      },
      options: [
        {
          name: 'cases',
          displayName: 'Case',
          values: [
            {
              name: 'output',
              displayName: 'Output',
              type: 'options',
              default: 'output0',
              options: [
                { name: 'Output 0', value: 'output0' },
                { name: 'Output 1', value: 'output1' },
                { name: 'Output 2', value: 'output2' },
                { name: 'Output 3', value: 'output3' },
              ],
              description: 'Which output to route to',
            },
            {
              name: 'value',
              displayName: 'Case Value',
              type: 'string',
              default: '',
              placeholder: 'success',
              description: 'Value to match (exact match)',
            },
          ],
        },
      ],
    },
    {
      name: 'fallbackOutput',
      displayName: 'Fallback Output',
      type: 'options',
      default: 'fallback',
      options: [
        { name: 'Fallback', value: 'fallback', description: 'Use dedicated fallback output' },
        { name: 'Output 0', value: 'output0' },
        { name: 'Output 1', value: 'output1' },
        { name: 'Output 2', value: 'output2' },
        { name: 'Output 3', value: 'output3' },
        { name: 'None (Drop)', value: 'none', description: 'Drop items that don\'t match' },
      ],
      description: 'Where to send items that don\'t match any rule/case',
    },
    {
      name: 'allMatchingRules',
      displayName: 'Send to All Matching',
      type: 'boolean',
      default: false,
      description: 'Send to all matching outputs instead of just the first match',
      displayOptions: {
        show: {
          mode: ['rules'],
        },
      },
    },
  ],
  subtitle: '={{$parameter["mode"]}} routing',
  documentationUrl: 'https://docs.twiddle.io/nodes/switch',
};
