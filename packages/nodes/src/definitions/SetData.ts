import type { NodeDefinition } from '@twiddle/shared';

export const SetDataNode: NodeDefinition = {
  type: 'twiddle.setData',
  displayName: 'Set Data',
  description: 'Set or modify data fields',
  icon: 'edit',
  iconColor: '#9c27b0',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'manual',
      options: [
        { name: 'Manual', value: 'manual', description: 'Set fields manually' },
        { name: 'JSON', value: 'json', description: 'Set fields from JSON' },
      ],
    },
    {
      name: 'fields',
      displayName: 'Fields',
      type: 'fixedCollection',
      default: {},
      description: 'The fields to set',
      displayOptions: {
        show: {
          mode: ['manual'],
        },
      },
      typeOptions: {
        multipleValues: true,
      },
    },
    {
      name: 'jsonData',
      displayName: 'JSON Data',
      type: 'json',
      default: '{}',
      description: 'JSON object to set as data',
      displayOptions: {
        show: {
          mode: ['json'],
        },
      },
    },
    {
      name: 'keepOnlySet',
      displayName: 'Keep Only Set',
      type: 'boolean',
      default: false,
      description: 'Whether to keep only the fields that are set',
    },
  ],
  subtitle: 'Set data fields',
  documentationUrl: 'https://docs.twiddle.io/nodes/set-data',
};
