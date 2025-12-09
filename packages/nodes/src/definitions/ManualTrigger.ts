import type { NodeDefinition } from '@twiddle/shared';

export const ManualTriggerNode: NodeDefinition = {
  type: 'twiddle.manualTrigger',
  displayName: 'Manual Trigger',
  description: 'Starts the workflow when manually triggered',
  icon: 'play',
  iconColor: '#00c853',
  category: 'core',
  version: 1,
  inputs: [],
  outputs: ['main'],
  parameters: [],
  subtitle: 'Trigger workflow manually',
};
