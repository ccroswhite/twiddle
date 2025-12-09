/**
 * SSH activity implementation
 * Executes commands on remote Linux/Unix machines via SSH
 */
import type { WorkflowNode } from '@twiddle/shared';

interface SSHCredentials {
  host: string;
  port?: number;
  username: string;
  // Authentication method
  authMethod: 'password' | 'privateKey' | 'mtls';
  // Password authentication
  password?: string;
  // SSH Key authentication
  privateKey?: string;
  passphrase?: string;
  // mTLS authentication
  clientCert?: string;
  clientKey?: string;
  caCert?: string;
  // Connection options
  keepaliveInterval?: number;
  readyTimeout?: number;
  strictHostKeyChecking?: boolean;
  knownHostsFile?: string;
}

interface SSHParams {
  operation: 'executeCommand' | 'executeScript' | 'uploadFile' | 'downloadFile';
  command?: string;
  script?: string;
  scriptInterpreter?: string;
  customInterpreter?: string;
  localPath?: string;
  remotePath?: string;
  workingDirectory?: string;
  environmentVariables?: string;
  timeout?: number;
  outputFormat?: 'text' | 'json' | 'lines';
  continueOnError?: boolean;
}

interface SSHResult {
  stdout: string | unknown;
  stderr: string;
  exitCode: number;
  success: boolean;
  duration?: number;
}

/**
 * Build environment variable export commands
 */
function buildEnvExports(envVars: Record<string, string>): string {
  return Object.entries(envVars)
    .map(([key, value]) => `export ${key}="${value.replace(/"/g, '\\"')}"`)
    .join('; ');
}

/**
 * Format command output based on outputFormat parameter
 */
function formatOutput(stdout: string, format: string): string | unknown {
  switch (format) {
    case 'json':
      try {
        return JSON.parse(stdout);
      } catch {
        return stdout;
      }
    case 'lines':
      return stdout.split('\n').filter(line => line.length > 0);
    case 'text':
    default:
      return stdout;
  }
}

/**
 * Execute SSH command
 * In production, this would use the ssh2 package
 */
export async function executeSSH(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<SSHResult> {
  const params = node.parameters as unknown as SSHParams;
  const credentials = node.credentials as unknown as SSHCredentials;

  if (!credentials?.host || !credentials?.username) {
    throw new Error('SSH credentials required (host, username)');
  }

  // Validate authentication method
  switch (credentials.authMethod) {
    case 'password':
      if (!credentials.password) {
        throw new Error('Password required for password authentication');
      }
      break;
    case 'privateKey':
      if (!credentials.privateKey) {
        throw new Error('Private key required for SSH key authentication');
      }
      break;
    case 'mtls':
      if (!credentials.clientCert || !credentials.clientKey) {
        throw new Error('Client certificate and key required for mTLS authentication');
      }
      break;
    default:
      throw new Error(`Unknown authentication method: ${credentials.authMethod}`);
  }

  const startTime = Date.now();
  const timeout = (params.timeout || 60) * 1000;

  // Build the full command based on operation
  let fullCommand: string;

  switch (params.operation) {
    case 'executeCommand': {
      if (!params.command) {
        throw new Error('Command is required');
      }

      const envVars = params.environmentVariables 
        ? JSON.parse(params.environmentVariables) as Record<string, string>
        : {};
      const envExports = Object.keys(envVars).length > 0 
        ? buildEnvExports(envVars) + '; '
        : '';

      if (params.workingDirectory) {
        fullCommand = `cd "${params.workingDirectory}" && ${envExports}${params.command}`;
      } else {
        fullCommand = `${envExports}${params.command}`;
      }
      break;
    }

    case 'executeScript': {
      if (!params.script) {
        throw new Error('Script is required');
      }

      const interpreter = params.scriptInterpreter === 'custom'
        ? params.customInterpreter || '/bin/bash'
        : params.scriptInterpreter || '/bin/bash';

      const envVars = params.environmentVariables 
        ? JSON.parse(params.environmentVariables) as Record<string, string>
        : {};
      const envExports = Object.keys(envVars).length > 0 
        ? buildEnvExports(envVars) + '; '
        : '';

      // Encode script as base64 to handle special characters
      const scriptBase64 = Buffer.from(params.script).toString('base64');
      
      if (params.workingDirectory) {
        fullCommand = `cd "${params.workingDirectory}" && ${envExports}echo "${scriptBase64}" | base64 -d | ${interpreter}`;
      } else {
        fullCommand = `${envExports}echo "${scriptBase64}" | base64 -d | ${interpreter}`;
      }
      break;
    }

    case 'uploadFile': {
      if (!params.localPath || !params.remotePath) {
        throw new Error('Local path and remote path are required for file upload');
      }
      // SFTP upload would be handled here
      fullCommand = `# SFTP upload: ${params.localPath} -> ${params.remotePath}`;
      break;
    }

    case 'downloadFile': {
      if (!params.localPath || !params.remotePath) {
        throw new Error('Local path and remote path are required for file download');
      }
      // SFTP download would be handled here
      fullCommand = `# SFTP download: ${params.remotePath} -> ${params.localPath}`;
      break;
    }

    default:
      throw new Error(`Unknown operation: ${params.operation}`);
  }

  // Log connection info (in production, actually connect)
  console.log(`[SSH] Connecting to ${credentials.username}@${credentials.host}:${credentials.port || 22}`);
  console.log(`[SSH] Auth method: ${credentials.authMethod}`);
  console.log(`[SSH] Executing: ${fullCommand}`);
  console.log(`[SSH] Timeout: ${timeout}ms`);

  // In production, use ssh2 package:
  // const { Client } = require('ssh2');
  // const conn = new Client();
  // 
  // conn.on('ready', () => {
  //   conn.exec(fullCommand, (err, stream) => {
  //     stream.on('data', (data) => stdout += data);
  //     stream.stderr.on('data', (data) => stderr += data);
  //     stream.on('close', (code) => { exitCode = code; conn.end(); });
  //   });
  // });
  //
  // const config = {
  //   host: credentials.host,
  //   port: credentials.port || 22,
  //   username: credentials.username,
  //   ...(credentials.authMethod === 'password' && { password: credentials.password }),
  //   ...(credentials.authMethod === 'privateKey' && { 
  //     privateKey: credentials.privateKey,
  //     passphrase: credentials.passphrase,
  //   }),
  // };
  // conn.connect(config);

  // Placeholder result
  const stdout = '';
  const stderr = '';
  const exitCode = 0;
  const duration = Date.now() - startTime;

  const success = exitCode === 0;

  if (!success && !params.continueOnError) {
    throw new Error(`SSH command failed with exit code ${exitCode}: ${stderr}`);
  }

  return {
    stdout: formatOutput(stdout, params.outputFormat || 'text'),
    stderr,
    exitCode,
    success,
    duration,
  };
}

/**
 * Execute SFTP upload
 */
export async function executeSFTPUpload(
  credentials: SSHCredentials,
  localPath: string,
  remotePath: string,
): Promise<{ success: boolean; bytesTransferred: number }> {
  console.log(`[SFTP] Uploading ${localPath} to ${credentials.host}:${remotePath}`);
  
  // In production, use ssh2-sftp-client or ssh2 SFTP subsystem
  // const SFTPClient = require('ssh2-sftp-client');
  // const sftp = new SFTPClient();
  // await sftp.connect({...});
  // await sftp.put(localPath, remotePath);
  // await sftp.end();

  return { success: true, bytesTransferred: 0 };
}

/**
 * Execute SFTP download
 */
export async function executeSFTPDownload(
  credentials: SSHCredentials,
  remotePath: string,
  localPath: string,
): Promise<{ success: boolean; bytesTransferred: number }> {
  console.log(`[SFTP] Downloading ${credentials.host}:${remotePath} to ${localPath}`);
  
  // In production, use ssh2-sftp-client or ssh2 SFTP subsystem

  return { success: true, bytesTransferred: 0 };
}
