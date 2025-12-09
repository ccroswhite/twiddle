import type { NodeDefinition } from '@twiddle/shared';

export const SSHNode: NodeDefinition = {
  type: 'twiddle.ssh',
  displayName: 'SSH',
  description: 'Execute commands on remote Linux/Unix machines via SSH',
  icon: 'terminal',
  iconColor: '#22c55e',
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
        { name: 'Execute Command', value: 'executeCommand', description: 'Execute a single command' },
        { name: 'Execute Script', value: 'executeScript', description: 'Execute a shell script' },
        { name: 'Upload File', value: 'uploadFile', description: 'Upload a file via SFTP' },
        { name: 'Download File', value: 'downloadFile', description: 'Download a file via SFTP' },
      ],
      description: 'The operation to perform',
    },
    {
      name: 'command',
      displayName: 'Command',
      type: 'string',
      default: '',
      placeholder: 'ls -la /var/log',
      description: 'The command to execute on the remote machine',
      displayOptions: {
        show: {
          operation: ['executeCommand'],
        },
      },
      required: true,
    },
    {
      name: 'script',
      displayName: 'Script',
      type: 'string',
      default: '',
      placeholder: '#!/bin/bash\necho "Hello World"',
      description: 'Shell script to execute on the remote machine',
      displayOptions: {
        show: {
          operation: ['executeScript'],
        },
      },
      required: true,
      typeOptions: {
        rows: 10,
        editor: 'codeEditor',
        editorLanguage: 'shell',
      },
    },
    {
      name: 'scriptInterpreter',
      displayName: 'Script Interpreter',
      type: 'options',
      default: '/bin/bash',
      options: [
        { name: 'Bash', value: '/bin/bash' },
        { name: 'Sh', value: '/bin/sh' },
        { name: 'Zsh', value: '/bin/zsh' },
        { name: 'Python', value: '/usr/bin/python3' },
        { name: 'Perl', value: '/usr/bin/perl' },
        { name: 'Custom', value: 'custom' },
      ],
      description: 'Interpreter to use for the script',
      displayOptions: {
        show: {
          operation: ['executeScript'],
        },
      },
    },
    {
      name: 'customInterpreter',
      displayName: 'Custom Interpreter Path',
      type: 'string',
      default: '',
      placeholder: '/usr/bin/ruby',
      description: 'Path to custom interpreter',
      displayOptions: {
        show: {
          operation: ['executeScript'],
          scriptInterpreter: ['custom'],
        },
      },
    },
    {
      name: 'localPath',
      displayName: 'Local Path',
      type: 'string',
      default: '',
      placeholder: '/local/path/to/file',
      description: 'Local file path',
      displayOptions: {
        show: {
          operation: ['uploadFile', 'downloadFile'],
        },
      },
      required: true,
    },
    {
      name: 'remotePath',
      displayName: 'Remote Path',
      type: 'string',
      default: '',
      placeholder: '/remote/path/to/file',
      description: 'Remote file path on the SSH server',
      displayOptions: {
        show: {
          operation: ['uploadFile', 'downloadFile'],
        },
      },
      required: true,
    },
    {
      name: 'workingDirectory',
      displayName: 'Working Directory',
      type: 'string',
      default: '',
      placeholder: '/home/user',
      description: 'Working directory for command execution',
      displayOptions: {
        show: {
          operation: ['executeCommand', 'executeScript'],
        },
      },
    },
    {
      name: 'environmentVariables',
      displayName: 'Environment Variables',
      type: 'json',
      default: '{}',
      placeholder: '{"VAR1": "value1", "VAR2": "value2"}',
      description: 'Environment variables to set for the command',
      displayOptions: {
        show: {
          operation: ['executeCommand', 'executeScript'],
        },
      },
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
      displayOptions: {
        show: {
          operation: ['executeCommand', 'executeScript'],
        },
      },
    },
    {
      name: 'continueOnError',
      displayName: 'Continue on Error',
      type: 'boolean',
      default: false,
      description: 'Continue workflow execution even if command fails (non-zero exit code)',
    },
  ],
  credentials: [
    {
      name: 'sshCredentials',
      required: true,
    },
  ],
  subtitle: '={{$parameter["operation"]}}',
  documentationUrl: 'https://docs.twiddle.io/nodes/ssh',
};
