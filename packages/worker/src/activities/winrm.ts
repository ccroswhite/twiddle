/**
 * WinRM activity implementation
 * Executes commands on remote Windows machines via WinRM protocol
 */
import type { WorkflowNode } from '@twiddle/shared';

interface WinRMParams {
  operation?: 'executeCommand' | 'executePowerShell';
  command?: string;
  script?: string;
  workingDirectory?: string;
  timeout?: number;
  outputFormat?: 'text' | 'json' | 'lines';
}

interface WinRMCredentials {
  host: string;
  port?: number;
  username: string;
  password: string;
  useHttps?: boolean;
  allowInsecure?: boolean;
  authMethod?: 'basic' | 'ntlm';
}

interface WinRMResult {
  stdout: string | string[] | unknown;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Build SOAP envelope for WinRM requests
 */
function buildSoapEnvelope(action: string, body: string, shellId?: string): string {
  const messageId = `uuid:${crypto.randomUUID()}`;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"
            xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:w="http://schemas.dmtf.org/wbem/wsman/1/wsman.xsd"
            xmlns:p="http://schemas.microsoft.com/wbem/wsman/1/wsman.xsd">
  <s:Header>
    <a:To>http://windows-host:5985/wsman</a:To>
    <a:ReplyTo>
      <a:Address s:mustUnderstand="true">http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous</a:Address>
    </a:ReplyTo>
    <w:MaxEnvelopeSize s:mustUnderstand="true">153600</w:MaxEnvelopeSize>
    <a:MessageID>${messageId}</a:MessageID>
    <w:Locale xml:lang="en-US" s:mustUnderstand="false"/>
    <p:DataLocale xml:lang="en-US" s:mustUnderstand="false"/>
    <w:OperationTimeout>PT60S</w:OperationTimeout>
    <w:ResourceURI s:mustUnderstand="true">http://schemas.microsoft.com/wbem/wsman/1/windows/shell/cmd</w:ResourceURI>
    <a:Action s:mustUnderstand="true">${action}</a:Action>
    ${shellId ? `<w:SelectorSet><w:Selector Name="ShellId">${shellId}</w:Selector></w:SelectorSet>` : ''}
  </s:Header>
  <s:Body>
    ${body}
  </s:Body>
</s:Envelope>`;
}

/**
 * Build shell creation request body
 */
function buildCreateShellBody(workingDirectory?: string): string {
  return `<w:Shell xmlns:w="http://schemas.microsoft.com/wbem/wsman/1/windows/shell">
    <w:InputStreams>stdin</w:InputStreams>
    <w:OutputStreams>stdout stderr</w:OutputStreams>
    ${workingDirectory ? `<w:WorkingDirectory>${workingDirectory}</w:WorkingDirectory>` : ''}
  </w:Shell>`;
}

/**
 * Build command execution request body
 */
function buildCommandBody(command: string, args: string[] = []): string {
  const argsXml = args.map(arg => `<w:Arguments>${escapeXml(arg)}</w:Arguments>`).join('');
  return `<w:CommandLine xmlns:w="http://schemas.microsoft.com/wbem/wsman/1/windows/shell">
    <w:Command>${escapeXml(command)}</w:Command>
    ${argsXml}
  </w:CommandLine>`;
}

/**
 * Build receive output request body
 */
function buildReceiveBody(commandId: string): string {
  return `<w:Receive xmlns:w="http://schemas.microsoft.com/wbem/wsman/1/windows/shell" SequenceId="0">
    <w:DesiredStream CommandId="${commandId}">stdout stderr</w:DesiredStream>
  </w:Receive>`;
}

/**
 * Build shell deletion request body
 */
function buildDeleteShellBody(): string {
  return '';
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Make WinRM HTTP request
 */
async function makeWinRMRequest(
  credentials: WinRMCredentials,
  soapEnvelope: string,
): Promise<string> {
  const protocol = credentials.useHttps ? 'https' : 'http';
  const port = credentials.port || (credentials.useHttps ? 5986 : 5985);
  const url = `${protocol}://${credentials.host}:${port}/wsman`;

  // Build authorization header
  const authString = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
  const authHeader = credentials.authMethod === 'ntlm' 
    ? `NTLM ${authString}` 
    : `Basic ${authString}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml;charset=UTF-8',
      'Authorization': authHeader,
    },
    body: soapEnvelope,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WinRM request failed: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.text();
}

/**
 * Extract value from SOAP response using simple regex
 */
function extractFromResponse(response: string, tagName: string): string | null {
  const regex = new RegExp(`<[^:]*:?${tagName}[^>]*>([^<]*)<`, 'i');
  const match = response.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract base64 encoded stream content
 */
function extractStreamContent(response: string, streamName: string): string {
  const regex = new RegExp(`<[^:]*:?Stream[^>]*Name="${streamName}"[^>]*>([^<]*)<`, 'gi');
  const matches = [...response.matchAll(regex)];
  
  const content = matches
    .map(m => m[1])
    .filter(Boolean)
    .map(b64 => Buffer.from(b64, 'base64').toString('utf-8'))
    .join('');
  
  return content;
}

/**
 * Check if command is complete
 */
function isCommandComplete(response: string): boolean {
  return response.includes('CommandState State="http://schemas.microsoft.com/wbem/wsman/1/windows/shell/CommandState/Done"') ||
         response.includes('State="Done"');
}

/**
 * Extract exit code from response
 */
function extractExitCode(response: string): number {
  const exitCode = extractFromResponse(response, 'ExitCode');
  return exitCode ? parseInt(exitCode, 10) : -1;
}

/**
 * Execute a command via WinRM
 */
async function executeWinRMCommand(
  credentials: WinRMCredentials,
  command: string,
  workingDirectory?: string,
  timeout: number = 60,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Step 1: Create shell
  const createShellEnvelope = buildSoapEnvelope(
    'http://schemas.xmlsoap.org/ws/2004/09/transfer/Create',
    buildCreateShellBody(workingDirectory),
  );
  
  const createResponse = await makeWinRMRequest(credentials, createShellEnvelope);
  const shellId = extractFromResponse(createResponse, 'ShellId');
  
  if (!shellId) {
    throw new Error('Failed to create WinRM shell: No ShellId in response');
  }

  try {
    // Step 2: Execute command
    const commandEnvelope = buildSoapEnvelope(
      'http://schemas.microsoft.com/wbem/wsman/1/windows/shell/Command',
      buildCommandBody(command),
      shellId,
    );
    
    const commandResponse = await makeWinRMRequest(credentials, commandEnvelope);
    const commandId = extractFromResponse(commandResponse, 'CommandId');
    
    if (!commandId) {
      throw new Error('Failed to execute command: No CommandId in response');
    }

    // Step 3: Receive output (poll until complete)
    let stdout = '';
    let stderr = '';
    let exitCode = -1;
    const startTime = Date.now();
    const timeoutMs = timeout * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const receiveEnvelope = buildSoapEnvelope(
        'http://schemas.microsoft.com/wbem/wsman/1/windows/shell/Receive',
        buildReceiveBody(commandId),
        shellId,
      );
      
      const receiveResponse = await makeWinRMRequest(credentials, receiveEnvelope);
      
      stdout += extractStreamContent(receiveResponse, 'stdout');
      stderr += extractStreamContent(receiveResponse, 'stderr');
      
      if (isCommandComplete(receiveResponse)) {
        exitCode = extractExitCode(receiveResponse);
        break;
      }
      
      // Small delay before polling again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (exitCode === -1) {
      throw new Error('Command execution timed out');
    }

    return { stdout, stderr, exitCode };
  } finally {
    // Step 4: Delete shell (cleanup)
    try {
      const deleteEnvelope = buildSoapEnvelope(
        'http://schemas.xmlsoap.org/ws/2004/09/transfer/Delete',
        buildDeleteShellBody(),
        shellId,
      );
      await makeWinRMRequest(credentials, deleteEnvelope);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Encode PowerShell script for execution
 */
function encodePowerShellScript(script: string): string {
  // PowerShell expects UTF-16LE encoded base64
  const buffer = Buffer.from(script, 'utf16le');
  return buffer.toString('base64');
}

/**
 * Format output based on outputFormat parameter
 */
function formatOutput(output: string, format: string): string | string[] | unknown {
  switch (format) {
    case 'json':
      try {
        return JSON.parse(output.trim());
      } catch {
        return output;
      }
    case 'lines':
      return output.split(/\r?\n/).filter(line => line.trim());
    case 'text':
    default:
      return output;
  }
}

/**
 * Execute WinRM node
 */
export async function executeWinRM(
  node: WorkflowNode,
  _inputData: unknown,
): Promise<WinRMResult> {
  const params = node.parameters as WinRMParams;
  const credentials = node.credentials as unknown as WinRMCredentials;

  if (!credentials?.host || !credentials?.username || !credentials?.password) {
    throw new Error('WinRM credentials are required (host, username, password)');
  }

  const operation = params.operation || 'executeCommand';
  const timeout = params.timeout || 60;
  const outputFormat = params.outputFormat || 'text';
  const workingDirectory = params.workingDirectory;

  let command: string;

  if (operation === 'executePowerShell') {
    const script = params.script;
    if (!script) {
      throw new Error('PowerShell script is required');
    }
    // Encode script and execute via powershell.exe
    const encodedScript = encodePowerShellScript(script);
    command = `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encodedScript}`;
  } else {
    command = params.command || '';
    if (!command) {
      throw new Error('Command is required');
    }
  }

  try {
    const result = await executeWinRMCommand(
      credentials,
      command,
      workingDirectory,
      timeout,
    );

    return {
      stdout: formatOutput(result.stdout, outputFormat),
      stderr: result.stderr,
      exitCode: result.exitCode,
      success: result.exitCode === 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`WinRM execution failed: ${message}`);
  }
}
