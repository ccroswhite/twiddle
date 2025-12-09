import type { NodeDefinition } from '@twiddle/shared';

export const CodeNode: NodeDefinition = {
  type: 'twiddle.code',
  displayName: 'Code',
  description: 'Execute custom JavaScript/TypeScript code',
  icon: 'code',
  iconColor: '#ff6b00',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'mode',
      displayName: 'Mode',
      type: 'options',
      default: 'runOnceForAllItems',
      options: [
        {
          name: 'Run Once for All Items',
          value: 'runOnceForAllItems',
          description: 'Run the code once with all input items',
        },
        {
          name: 'Run Once for Each Item',
          value: 'runOnceForEachItem',
          description: 'Run the code once for each input item',
        },
      ],
    },
    {
      name: 'code',
      displayName: 'Code',
      type: 'string',
      default: `// Access input data with $input
// Return data to pass to next node
return $input.all();`,
      description: 'The JavaScript code to execute',
      typeOptions: {
        rows: 20,
        editor: 'codeEditor',
        editorLanguage: 'javascript',
      },
    },
  ],
  subtitle: 'JavaScript',
  documentationUrl: 'https://docs.twiddle.io/nodes/code',
};
