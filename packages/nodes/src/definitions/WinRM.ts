import type { NodeDefinition } from '@twiddle/shared';

export const WinRMNode: NodeDefinition = {
  type: 'twiddle.winrm',
  displayName: 'WinRM',
  description: 'Execute commands on remote Windows machines via WinRM',
  icon: 'terminal',
  iconColor: '#0078d4',
  category: 'infrastructure',
  version: 1,
  inputs: ['main'],
  outputs: ['main'],
  parameters: [
    {
      name: 'operation',
      displayName: 'Operation',
      type: 'options',
      default: 'executeCommand',
      options: [
        {
          name: 'Execute Command',
          value: 'executeCommand',
          description: 'Execute a command line command',
        },
        {
          name: 'Execute PowerShell',
          value: 'executePowerShell',
          description: 'Execute a PowerShell script',
        },
      ],
      description: 'The operation to perform',
    },
    {
      name: 'command',
      displayName: 'Command',
      type: 'string',
      default: '',
      placeholder: 'dir C:\\',
      description: 'The command to execute',
      displayOptions: {
        show: {
          operation: ['executeCommand'],
        },
      },
      required: true,
    },
    {
      name: 'script',
      displayName: 'PowerShell Script',
      type: 'string',
      default: '',
      placeholder: 'Get-Process | Select-Object -First 10',
      description: 'The PowerShell script to execute',
      displayOptions: {
        show: {
          operation: ['executePowerShell'],
        },
      },
      required: true,
      typeOptions: {
        rows: 10,
        editor: 'codeEditor',
        editorLanguage: 'powershell',
      },
    },
    {
      name: 'workingDirectory',
      displayName: 'Working Directory',
      type: 'string',
      default: '',
      placeholder: 'C:\\Users\\Administrator',
      description: 'The working directory for command execution',
    },
    {
      name: 'timeout',
      displayName: 'Timeout (seconds)',
      type: 'number',
      default: 60,
      description: 'Command execution timeout in seconds',
    },
    {
      name: 'outputFormat',
      displayName: 'Output Format',
      type: 'options',
      default: 'text',
      options: [
        { name: 'Text', value: 'text', description: 'Return output as plain text' },
        { name: 'JSON', value: 'json', description: 'Parse output as JSON' },
        { name: 'Lines', value: 'lines', description: 'Split output into array of lines' },
      ],
      description: 'How to format the command output',
    },
  ],
  credentials: [
    {
      name: 'winrmCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/winrm',
};
