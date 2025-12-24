/**
 * Node Parameter Editor Components
 * 
 * Each node type has a corresponding parameter editor component.
 * This file exports a registry mapping node types to their editors.
 */

import { useState, useEffect } from 'react';
import { Code } from 'lucide-react';
import { workflowsApi } from '@/lib/api';

// =============================================================================
// Common Types
// =============================================================================

export interface ParameterEditorProps {
    parameters: Record<string, unknown>;
    updateParameter: (key: string, value: unknown) => void;
}

// =============================================================================
// Code Node Editor
// =============================================================================

const DEFAULT_PYTHON_CODE = `# Python code for this activity
# Available variables:
#   - input_data: dict containing input from previous nodes
#   - context: workflow context with helper methods
#
# Return a dict with output data for next nodes

def execute(input_data: dict, context) -> dict:
    """
    Execute custom Python code.
    
    Args:
        input_data: Data from previous nodes
        context: Workflow context
        
    Returns:
        dict: Output data for next nodes
    """
    result = {}
    
    # Your code here
    
    return result
`;

export function CodeNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                    Python Code
                </label>
                <div className="relative">
                    <textarea
                        value={(parameters.code as string) || DEFAULT_PYTHON_CODE}
                        onChange={(e) => updateParameter('code', e.target.value)}
                        className="w-full h-96 px-4 py-3 font-mono text-sm bg-slate-900 text-green-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                        placeholder="# Enter your Python code here..."
                        spellCheck={false}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
                        <Code className="w-3 h-3" />
                        Python
                    </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Write Python code that will be executed as a Temporal activity.
                    The function should accept input_data and context parameters.
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timeout (seconds)
                </label>
                <input
                    type="number"
                    value={(parameters.timeout as number) || 300}
                    onChange={(e) => updateParameter('timeout', parseInt(e.target.value) || 300)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
            </div>
        </div>
    );
}

// =============================================================================
// HTTP Request Node Editor
// =============================================================================

export function HttpRequestNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    URL
                </label>
                <input
                    type="text"
                    value={(parameters.url as string) || ''}
                    onChange={(e) => updateParameter('url', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://api.example.com/endpoint"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Method
                </label>
                <select
                    value={(parameters.method as string) || 'GET'}
                    onChange={(e) => updateParameter('method', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Headers (JSON)
                </label>
                <textarea
                    value={(parameters.headers as string) || '{}'}
                    onChange={(e) => updateParameter('headers', e.target.value)}
                    className="w-full h-20 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"Content-Type": "application/json"}'
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Body
                </label>
                <textarea
                    value={(parameters.body as string) || ''}
                    onChange={(e) => updateParameter('body', e.target.value)}
                    className="w-full h-24 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Request body (JSON for POST/PUT/PATCH)"
                />
            </div>
        </div>
    );
}

// =============================================================================
// If Node Editor
// =============================================================================

export function IfNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Condition Expression
                </label>
                <textarea
                    value={(parameters.condition as string) || ''}
                    onChange={(e) => updateParameter('condition', e.target.value)}
                    className="w-full h-20 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="input['value'] > 100"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression that evaluates to True or False.
                    Use 'input' to access data from the previous node.
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// SetData Node Editor
// =============================================================================

export function SetDataNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data (JSON)
                </label>
                <textarea
                    value={(parameters.data as string) || '{}'}
                    onChange={(e) => updateParameter('data', e.target.value)}
                    className="w-full h-32 px-3 py-2 font-mono text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder='{"key": "value"}'
                />
                <p className="text-xs text-slate-500 mt-1">
                    Static data to output from this node in JSON format.
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// RespondToWebhook Node Editor
// =============================================================================

export function RespondToWebhookNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status Code
                </label>
                <select
                    value={(parameters.statusCode as number) || 200}
                    onChange={(e) => updateParameter('statusCode', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value={200}>200 OK</option>
                    <option value={201}>201 Created</option>
                    <option value={202}>202 Accepted</option>
                    <option value={204}>204 No Content</option>
                    <option value={400}>400 Bad Request</option>
                    <option value={401}>401 Unauthorized</option>
                    <option value={403}>403 Forbidden</option>
                    <option value={404}>404 Not Found</option>
                    <option value={500}>500 Internal Server Error</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Content Type
                </label>
                <select
                    value={(parameters.contentType as string) || 'application/json'}
                    onChange={(e) => updateParameter('contentType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="application/json">application/json</option>
                    <option value="text/plain">text/plain</option>
                    <option value="text/html">text/html</option>
                    <option value="application/xml">application/xml</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Response Headers (JSON)
                </label>
                <textarea
                    value={(parameters.headers as string) || '{}'}
                    onChange={(e) => updateParameter('headers', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20"
                    placeholder='{"X-Custom-Header": "value"}'
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Response Body (Python expression)
                </label>
                <textarea
                    value={(parameters.body as string) || ''}
                    onChange={(e) => updateParameter('body', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-green-400"
                    placeholder='{"status": "success", "data": input_data}'
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression that returns the response body. Use input_data to access data from previous nodes.
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// Webhook Node Editor
// =============================================================================

export function WebhookNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Webhook Path
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">/webhook/</span>
                    <input
                        type="text"
                        value={(parameters.path as string) || ''}
                        onChange={(e) => updateParameter('path', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="my-webhook-path"
                    />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Unique path for this webhook endpoint
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Allowed Methods
                </label>
                <div className="flex flex-wrap gap-2">
                    {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => {
                        const methods = (parameters.methods as string[]) || ['POST'];
                        const isSelected = methods.includes(method);
                        return (
                            <button
                                key={method}
                                type="button"
                                onClick={() => {
                                    const newMethods = isSelected
                                        ? methods.filter((m) => m !== method)
                                        : [...methods, method];
                                    updateParameter('methods', newMethods.length > 0 ? newMethods : ['POST']);
                                }}
                                className={`px-3 py-1 text-sm rounded-lg border transition-colors ${isSelected
                                    ? 'bg-primary-100 border-primary-300 text-primary-700'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {method}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Authentication
                </label>
                <select
                    value={(parameters.authentication as string) || 'none'}
                    onChange={(e) => updateParameter('authentication', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="none">None (Public)</option>
                    <option value="header">Header Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="query">Query Parameter</option>
                </select>
            </div>
            {(parameters.authentication as string) && (parameters.authentication as string) !== 'none' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {(parameters.authentication as string) === 'header' ? 'Header Name' :
                            (parameters.authentication as string) === 'query' ? 'Query Parameter Name' : 'Credential'}
                    </label>
                    <input
                        type="text"
                        value={(parameters.authKey as string) || ''}
                        onChange={(e) => updateParameter('authKey', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={(parameters.authentication as string) === 'header' ? 'X-API-Key' :
                            (parameters.authentication as string) === 'query' ? 'api_key' : 'credential-id'}
                    />
                </div>
            )}
            {(parameters.authentication as string) && (parameters.authentication as string) !== 'none' && (parameters.authentication as string) !== 'basic' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Expected Token Value
                    </label>
                    <input
                        type="password"
                        value={(parameters.authValue as string) || ''}
                        onChange={(e) => updateParameter('authValue', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="secret-token"
                    />
                </div>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="respondImmediately"
                    checked={(parameters.respondImmediately as boolean) ?? false}
                    onChange={(e) => updateParameter('respondImmediately', e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="respondImmediately" className="text-sm text-slate-700">
                    Respond immediately (don't wait for workflow completion)
                </label>
            </div>
        </div>
    );
}

// =============================================================================
// SSH Node Editor
// =============================================================================

export function SshNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Host
                </label>
                <input
                    type="text"
                    value={(parameters.host as string) || ''}
                    onChange={(e) => updateParameter('host', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="hostname or IP"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Command
                </label>
                <textarea
                    value={(parameters.command as string) || ''}
                    onChange={(e) => updateParameter('command', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-24"
                    placeholder="ls -la"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credential
                </label>
                <input
                    type="text"
                    value={(parameters.credentialId as string) || ''}
                    onChange={(e) => updateParameter('credentialId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Credential ID"
                />
            </div>
        </div>
    );
}

// =============================================================================
// WinRM Node Editor
// =============================================================================

export function WinrmNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Host
                </label>
                <input
                    type="text"
                    value={(parameters.host as string) || ''}
                    onChange={(e) => updateParameter('host', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="hostname or IP"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    PowerShell Script
                </label>
                <textarea
                    value={(parameters.script as string) || ''}
                    onChange={(e) => updateParameter('script', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-blue-400"
                    placeholder="Get-Process | Select-Object -First 10"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credential
                </label>
                <input
                    type="text"
                    value={(parameters.credentialId as string) || ''}
                    onChange={(e) => updateParameter('credentialId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Credential ID"
                />
            </div>
        </div>
    );
}

// =============================================================================
// Interval Node Editor
// =============================================================================

export function IntervalNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Interval
                </label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        value={(parameters.intervalValue as number) || 1}
                        onChange={(e) => updateParameter('intervalValue', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        min={1}
                    />
                    <select
                        value={(parameters.intervalUnit as string) || 'minutes'}
                        onChange={(e) => updateParameter('intervalUnit', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="seconds">Seconds</option>
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Time
                </label>
                <input
                    type="datetime-local"
                    value={(parameters.startTime as string) || ''}
                    onChange={(e) => updateParameter('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Leave empty to start immediately
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Time (optional)
                </label>
                <input
                    type="datetime-local"
                    value={(parameters.endTime as string) || ''}
                    onChange={(e) => updateParameter('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Leave empty to run indefinitely
                </p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timezone
                </label>
                <select
                    value={(parameters.timezone as string) || 'UTC'}
                    onChange={(e) => updateParameter('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (Eastern)</option>
                    <option value="America/Chicago">America/Chicago (Central)</option>
                    <option value="America/Denver">America/Denver (Mountain)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (Pacific)</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                    <option value="Asia/Shanghai">Asia/Shanghai</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="skipMissed"
                    checked={(parameters.skipMissed as boolean) ?? true}
                    onChange={(e) => updateParameter('skipMissed', e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="skipMissed" className="text-sm text-slate-700">
                    Skip missed executions (catch up disabled)
                </label>
            </div>
        </div>
    );
}

// =============================================================================
// HTML Extract Node Editor
// =============================================================================

export function HtmlExtractNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Input Source
                </label>
                <select
                    value={(parameters.inputSource as string) || 'input_data'}
                    onChange={(e) => updateParameter('inputSource', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="input_data">From previous node (input_data)</option>
                    <option value="field">From specific field</option>
                </select>
            </div>
            {parameters.inputSource === 'field' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Field Name
                    </label>
                    <input
                        type="text"
                        value={(parameters.inputField as string) || ''}
                        onChange={(e) => updateParameter('inputField', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="html_content"
                    />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extraction Method
                </label>
                <select
                    value={(parameters.extractionMethod as string) || 'css'}
                    onChange={(e) => updateParameter('extractionMethod', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="css">CSS Selector</option>
                    <option value="xpath">XPath</option>
                    <option value="regex">Regular Expression</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {parameters.extractionMethod === 'xpath' ? 'XPath Expression' :
                        parameters.extractionMethod === 'regex' ? 'Regular Expression' : 'CSS Selector'}
                </label>
                <textarea
                    value={(parameters.selector as string) || ''}
                    onChange={(e) => updateParameter('selector', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20"
                    placeholder={
                        parameters.extractionMethod === 'xpath' ? '//div[@class="content"]/p' :
                            parameters.extractionMethod === 'regex' ? '<title>(.*?)</title>' : 'div.content > p'
                    }
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Extract
                </label>
                <select
                    value={(parameters.extractType as string) || 'text'}
                    onChange={(e) => updateParameter('extractType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="text">Text Content</option>
                    <option value="html">Inner HTML</option>
                    <option value="attribute">Attribute Value</option>
                    <option value="all">All Matches (array)</option>
                </select>
            </div>
            {parameters.extractType === 'attribute' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Attribute Name
                    </label>
                    <input
                        type="text"
                        value={(parameters.attributeName as string) || ''}
                        onChange={(e) => updateParameter('attributeName', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                        placeholder="href"
                    />
                </div>
            )}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Output Variable Name
                </label>
                <input
                    type="text"
                    value={(parameters.outputVariable as string) || 'extracted'}
                    onChange={(e) => updateParameter('outputVariable', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="extracted"
                />
            </div>
        </div>
    );
}

// =============================================================================
// Switch Node Editor
// =============================================================================

export function SwitchNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    const cases = (parameters.cases as Array<{ value: string; label: string }>) || [];

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Switch Expression (Python)
                </label>
                <textarea
                    value={(parameters.expression as string) || ''}
                    onChange={(e) => updateParameter('expression', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20 bg-slate-900 text-green-400"
                    placeholder="input_data.get('status')"
                />
                <p className="text-xs text-slate-500 mt-1">
                    Python expression whose result will be matched against cases
                </p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                        Cases
                    </label>
                    <button
                        type="button"
                        onClick={() => {
                            const newCases = [...cases];
                            newCases.push({ value: '', label: `Case ${cases.length + 1}` });
                            updateParameter('cases', newCases);
                        }}
                        className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
                    >
                        + Add Case
                    </button>
                </div>

                <div className="space-y-2">
                    {cases.map((caseItem, index) => (
                        <div key={index} className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={caseItem.value}
                                onChange={(e) => {
                                    const newCases = [...cases];
                                    newCases[index] = { ...newCases[index], value: e.target.value };
                                    updateParameter('cases', newCases);
                                }}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                                placeholder="Value to match"
                            />
                            <input
                                type="text"
                                value={caseItem.label}
                                onChange={(e) => {
                                    const newCases = [...cases];
                                    newCases[index] = { ...newCases[index], label: e.target.value };
                                    updateParameter('cases', newCases);
                                }}
                                className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                                placeholder="Label"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const newCases = cases.filter((_, i) => i !== index);
                                    updateParameter('cases', newCases);
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    {cases.length === 0 && (
                        <p className="text-sm text-slate-400 py-2">
                            No cases defined. Add cases to create output branches.
                        </p>
                    )}
                </div>
            </div>

            <div>
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={(parameters.hasDefault as boolean) ?? true}
                        onChange={(e) => updateParameter('hasDefault', e.target.checked)}
                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-slate-700">Include default case (for unmatched values)</span>
                </label>
            </div>
        </div>
    );
}

// =============================================================================
// Default Editor (fallback)
// =============================================================================

export function DefaultNodeEditor() {
    return (
        <div className="text-sm text-slate-500 py-4">
            No additional parameters for this node type.
        </div>
    );
}

// =============================================================================
// Database Node Editor (PostgreSQL, MySQL, MSSQL)
// =============================================================================

export function DatabaseNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    SQL Query
                </label>
                <textarea
                    value={(parameters.query as string) || ''}
                    onChange={(e) => updateParameter('query', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-cyan-400"
                    placeholder="SELECT * FROM users WHERE active = true"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Credential
                </label>
                <input
                    type="text"
                    value={(parameters.credentialId as string) || ''}
                    onChange={(e) => updateParameter('credentialId', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Credential ID"
                />
            </div>
        </div>
    );
}

// =============================================================================
// Embedded Workflow Node Editor
// =============================================================================

export function EmbeddedWorkflowNodeEditor({ parameters, updateParameter }: ParameterEditorProps) {
    const [availableVersions, setAvailableVersions] = useState<any[]>([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    useEffect(() => {
        const workflowId = parameters.workflowId as string;
        if (workflowId) {
            setLoadingVersions(true);
            workflowsApi.getVersions(workflowId)
                .then(versions => setAvailableVersions(versions))
                .catch(err => console.error('Failed to load versions', err))
                .finally(() => setLoadingVersions(false));
        }
    }, [parameters.workflowId]);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Embedded Workflow
                </label>
                <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    {parameters.workflowName as string || 'Unknown Workflow'}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Embedded Workflow Policy
                </label>
                <select
                    value={(parameters.versionPolicy as string) || 'locked'}
                    onChange={(e) => {
                        const policy = e.target.value;
                        updateParameter('versionPolicy', policy);
                        if (policy !== 'latest' && policy !== 'locked') {
                            updateParameter('versionPolicy', 'locked');
                            updateParameter('workflowVersion', parseInt(policy));
                        }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={loadingVersions}
                >
                    <option value="latest">Latest (Always use newest)</option>
                    <option disabled>──────────────</option>
                    {loadingVersions ? (
                        <option disabled>Loading versions...</option>
                    ) : (
                        availableVersions.map(v => (
                            <option key={v.version} value={v.version}>
                                v{v.version} - {v.version === parameters.workflowVersion ? '(Current) ' : ''} {new Date(v.createdAt).toLocaleDateString()}
                            </option>
                        ))
                    )}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                    "Latest" will auto-update when opening the parent workflow. Selecting a version locks it.
                </p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Loaded Version
                </label>
                <div className="text-sm text-slate-600 px-3 py-2">
                    v{parameters.workflowVersion as number}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Editor Registry
// =============================================================================

/**
 * Registry mapping node types to their parameter editor components.
 * Each editor receives parameters and updateParameter callback.
 */
export const nodeParameterEditors: Record<string, React.FC<ParameterEditorProps>> = {
    'twiddle.code': CodeNodeEditor,
    'twiddle.httpRequest': HttpRequestNodeEditor,
    'twiddle.if': IfNodeEditor,
    'twiddle.setData': SetDataNodeEditor,
    'twiddle.respondToWebhook': RespondToWebhookNodeEditor,
    'twiddle.webhook': WebhookNodeEditor,
    'twiddle.ssh': SshNodeEditor,
    'twiddle.winrm': WinrmNodeEditor,
    'twiddle.interval': IntervalNodeEditor,
    'twiddle.htmlExtract': HtmlExtractNodeEditor,
    'twiddle.switch': SwitchNodeEditor,
    'twiddle.postgresql': DatabaseNodeEditor,
    'twiddle.mysql': DatabaseNodeEditor,
    'twiddle.mssql': DatabaseNodeEditor,
    'twiddle.embeddedWorkflow': EmbeddedWorkflowNodeEditor,
};

/**
 * Get the parameter editor for a given node type.
 * Returns DefaultNodeEditor if no specific editor is registered.
 */
export function getParameterEditor(nodeType: string): React.FC<ParameterEditorProps> {
    return nodeParameterEditors[nodeType] || DefaultNodeEditor;
}
