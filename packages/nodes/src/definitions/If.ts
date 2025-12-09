import type { NodeDefinition } from '@twiddle/shared';

export const IfNode: NodeDefinition = {
  type: 'twiddle.if',
  displayName: 'If',
  description: 'Route items based on conditions',
  icon: 'git-branch',
  iconColor: '#ff9500',
  category: 'core',
  version: 1,
  inputs: ['main'],
  outputs: ['true', 'false'],
  parameters: [
    {
      name: 'conditions',
      displayName: 'Conditions',
      type: 'fixedCollection',
      default: { conditions: [] },
      description: 'The conditions to evaluate',
      typeOptions: {
        multipleValues: true,
      },
      options: [
        {
          name: 'conditions',
          displayName: 'Condition',
          values: [
            {
              name: 'leftValue',
              displayName: 'Value 1',
              type: 'string',
              default: '',
              placeholder: '{{$json.field}}',
              description: 'The first value to compare',
            },
            {
              name: 'operation',
              displayName: 'Operation',
              type: 'options',
              default: 'equals',
              options: [
                // String/General comparisons
                { name: 'Equals', value: 'equals' },
                { name: 'Not Equals', value: 'notEquals' },
                { name: 'Contains', value: 'contains' },
                { name: 'Not Contains', value: 'notContains' },
                { name: 'Starts With', value: 'startsWith' },
                { name: 'Ends With', value: 'endsWith' },
                { name: 'Matches Regex', value: 'regex' },
                // Numeric comparisons
                { name: 'Greater Than', value: 'gt' },
                { name: 'Greater Than or Equal', value: 'gte' },
                { name: 'Less Than', value: 'lt' },
                { name: 'Less Than or Equal', value: 'lte' },
                // Type checks
                { name: 'Is Empty', value: 'isEmpty' },
                { name: 'Is Not Empty', value: 'isNotEmpty' },
                { name: 'Is Null', value: 'isNull' },
                { name: 'Is Not Null', value: 'isNotNull' },
                { name: 'Is True', value: 'isTrue' },
                { name: 'Is False', value: 'isFalse' },
                // Type checks
                { name: 'Is Number', value: 'isNumber' },
                { name: 'Is String', value: 'isString' },
                { name: 'Is Array', value: 'isArray' },
                { name: 'Is Object', value: 'isObject' },
                // Array operations
                { name: 'Array Contains', value: 'arrayContains' },
                { name: 'Array Length Equals', value: 'arrayLengthEquals' },
              ],
              description: 'The comparison operation',
            },
            {
              name: 'rightValue',
              displayName: 'Value 2',
              type: 'string',
              default: '',
              placeholder: 'comparison value',
              description: 'The second value to compare (not needed for some operations)',
              displayOptions: {
                hide: {
                  operation: ['isEmpty', 'isNotEmpty', 'isNull', 'isNotNull', 'isTrue', 'isFalse', 'isNumber', 'isString', 'isArray', 'isObject'],
                },
              },
            },
            {
              name: 'caseSensitive',
              displayName: 'Case Sensitive',
              type: 'boolean',
              default: true,
              description: 'Whether string comparisons should be case sensitive',
              displayOptions: {
                show: {
                  operation: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      name: 'combineConditions',
      displayName: 'Combine Conditions',
      type: 'options',
      default: 'all',
      options: [
        { name: 'All (AND)', value: 'all', description: 'All conditions must be true' },
        { name: 'Any (OR)', value: 'any', description: 'Any condition must be true' },
      ],
      description: 'How to combine multiple conditions',
    },
    {
      name: 'fallbackOutput',
      displayName: 'Fallback Output',
      type: 'options',
      default: 'false',
      options: [
        { name: 'False Branch', value: 'false', description: 'Send to false branch on error' },
        { name: 'True Branch', value: 'true', description: 'Send to true branch on error' },
        { name: 'Throw Error', value: 'error', description: 'Throw an error if evaluation fails' },
      ],
      description: 'What to do if condition evaluation fails',
    },
  ],
  subtitle: '={{$parameter["combineConditions"] === "all" ? "AND" : "OR"}} conditions',
  documentationUrl: 'https://docs.twiddle.io/nodes/if',
};
