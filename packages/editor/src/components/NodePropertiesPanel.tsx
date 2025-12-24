import { useState, useEffect } from 'react';
import { X, Code, Zap, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { workflowsApi } from '@/lib/api';
import { isActivityNode } from '@/utils/nodeConfig';
import { nodeParameterEditors } from '@/components/nodeParameterEditors';

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

// Default Python code template
const DEFAULT_PYTHON_CODE = `# Python code for this activity
# Available variables:
#   - input_data: dict containing input from previous nodes
#   - context: workflow context with helper methods
#
# Return value will be passed to the next node

def execute(input_data: dict, context) -> dict:
    """
    Execute the activity logic.
    
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


function EmbeddedWorkflowProperties({ parameters, updateParameter }: { parameters: Record<string, unknown>, updateParameter: (key: string, value: unknown) => void }) {
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

export function NodePropertiesPanel({ node, onUpdate, onClose }: NodePropertiesPanelProps) {
  const [label, setLabel] = useState('');
  const [parameters, setParameters] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (node) {
      setLabel(node.data.label as string || '');
      setParameters(node.data.parameters as Record<string, unknown> || {});
    }
  }, [node]);

  if (!node) return null;

  const nodeType = node.data.nodeType as string;

  const handleSave = () => {
    onUpdate(node.id, {
      ...node.data,
      label,
      parameters,
    });
    onClose();
  };

  const updateParameter = (key: string, value: unknown) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  // Render different editors based on node type
  const renderParameterEditor = () => {
    // Check if there's a registered editor for this node type
    const RegisteredEditor = nodeParameterEditors[nodeType];
    if (RegisteredEditor) {
      return <RegisteredEditor parameters={parameters} updateParameter={updateParameter} />;
    }

    // Fall back to switch statement for node types not yet migrated
    switch (nodeType) {
      // Note: The following node types are now handled by the registry above:
      // code, httpRequest, if, setData, respondToWebhook, webhook,
      // ssh, winrm, interval, htmlExtract, switch, postgresql, mysql, mssql

      case 'twiddle.if':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Condition (Python expression)
              </label>
              <textarea
                value={(parameters.condition as string) || ''}
                onChange={(e) => updateParameter('condition', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-24 bg-slate-900 text-green-400"
                placeholder="input_data.get('value') > 10"
              />
              <p className="text-xs text-slate-500 mt-1">
                Python expression that evaluates to True or False
              </p>
            </div>
          </div>
        );

      case 'twiddle.respondToWebhook':
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

      case 'twiddle.webhook':
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

      case 'twiddle.htmlExtract':
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="extracted"
              />
            </div>
          </div>
        );

      case 'twiddle.setData':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Data (Python dict expression)
              </label>
              <textarea
                value={(parameters.data as string) || '{}'}
                onChange={(e) => updateParameter('data', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-green-400"
                placeholder='{"key": "value", "count": 42}'
              />
            </div>
          </div>
        );

      case 'twiddle.switch':
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
                    const newCases = [...cases, { value: '', label: `Case ${cases.length + 1}` }];
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

      case 'twiddle.ssh':
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

      case 'twiddle.winrm':
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

      case 'twiddle.interval':
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

      // Database nodes
      case 'twiddle.postgresql':
      case 'twiddle.mysql':
      case 'twiddle.mssql':
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

      case 'twiddle.embeddedWorkflow':
        return (
          <EmbeddedWorkflowProperties
            parameters={parameters}
            updateParameter={updateParameter}
          />
        );

      default:
        // Check if this is a credential node
        if (nodeType.startsWith('credential.')) {
          const parts = nodeType.split('.');
          const credType = parts[1];
          const credId = parts.slice(2).join('.');

          // Determine what operations are available based on credential type
          const getOperations = (type: string) => {
            if (type.includes('postgresql') || type.includes('mysql') || type.includes('mssql')) {
              return [
                { value: 'query', label: 'Execute Query' },
                { value: 'execute', label: 'Execute Statement' },
              ];
            }
            if (type.includes('redis') || type.includes('valkey')) {
              return [
                { value: 'get', label: 'Get Value' },
                { value: 'set', label: 'Set Value' },
                { value: 'delete', label: 'Delete Key' },
                { value: 'command', label: 'Run Command' },
              ];
            }
            if (type.includes('ssh')) {
              return [
                { value: 'execute', label: 'Execute Command' },
                { value: 'upload', label: 'Upload File' },
                { value: 'download', label: 'Download File' },
              ];
            }
            if (type.includes('winrm')) {
              return [
                { value: 'powershell', label: 'Run PowerShell' },
                { value: 'cmd', label: 'Run CMD' },
              ];
            }
            if (type.includes('http') || type.includes('api') || type.includes('Bearer')) {
              return [
                { value: 'get', label: 'GET Request' },
                { value: 'post', label: 'POST Request' },
                { value: 'put', label: 'PUT Request' },
                { value: 'delete', label: 'DELETE Request' },
              ];
            }
            if (type.includes('opensearch') || type.includes('elasticsearch')) {
              return [
                { value: 'search', label: 'Search' },
                { value: 'index', label: 'Index Document' },
                { value: 'get', label: 'Get Document' },
                { value: 'delete', label: 'Delete Document' },
              ];
            }
            return [{ value: 'default', label: 'Default Operation' }];
          };

          const operations = getOperations(credType);

          return (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-800">Credential Node</div>
                <div className="text-xs text-amber-600 mt-1">
                  Using credential: <code className="bg-amber-100 px-1 rounded">{credId}</code>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Operation
                </label>
                <select
                  value={(parameters.operation as string) || operations[0].value}
                  onChange={(e) => updateParameter('operation', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {operations.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              {/* Show relevant fields based on operation */}
              {(parameters.operation === 'query' || parameters.operation === 'execute' || !parameters.operation) &&
                (credType.includes('postgresql') || credType.includes('mysql') || credType.includes('mssql')) && (
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
                )}

              {(credType.includes('ssh') || credType.includes('winrm')) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {credType.includes('winrm') ? 'PowerShell Script' : 'Command'}
                  </label>
                  <textarea
                    value={(parameters.command as string) || ''}
                    onChange={(e) => updateParameter('command', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-32 bg-slate-900 text-green-400"
                    placeholder={credType.includes('winrm') ? 'Get-Process' : 'ls -la'}
                  />
                </div>
              )}

              {(credType.includes('http') || credType.includes('api') || credType.includes('Bearer')) && (
                <>
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
                      Request Body (JSON)
                    </label>
                    <textarea
                      value={(parameters.body as string) || ''}
                      onChange={(e) => updateParameter('body', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-24"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </>
              )}

              {(credType.includes('redis') || credType.includes('valkey')) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Key
                    </label>
                    <input
                      type="text"
                      value={(parameters.key as string) || ''}
                      onChange={(e) => updateParameter('key', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="my:key:name"
                    />
                  </div>
                  {(parameters.operation === 'set' || parameters.operation === 'command') && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {parameters.operation === 'command' ? 'Command' : 'Value'}
                      </label>
                      <textarea
                        value={(parameters.value as string) || ''}
                        onChange={(e) => updateParameter('value', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm h-20"
                        placeholder={parameters.operation === 'command' ? 'HGETALL mykey' : 'value'}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        }

        return (
          <div className="text-sm text-slate-500 py-4">
            No additional parameters for this node type.
          </div>
        );
    }
  };

  return (
    <div className="fixed right-0 top-[57px] bottom-0 w-[450px] bg-white shadow-xl border-l border-slate-200 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {isActivityNode(nodeType) ? (
            <>
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-900">Activity Properties</h2>
            </>
          ) : (
            <h2 className="text-lg font-semibold text-slate-900">Trigger Properties</h2>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Node Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Node Name
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Node Type (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Node Type
          </label>
          <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
            {nodeType}
          </div>
        </div>

        {/* Parameters */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">Parameters</h3>
          {renderParameterEditor()}
        </div>

        {/* Activity Options - Only show for activity nodes (not triggers) */}
        {isActivityNode(nodeType) && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-medium text-slate-700">Activity Options</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Configure Temporal activity execution behavior. Activities are the smallest unit of durable execution.
            </p>

            {/* Timeout Settings */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Timeouts
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Start-to-Close Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={(parameters.startToCloseTimeout as number) || 300}
                    onChange={(e) => updateParameter('startToCloseTimeout', parseInt(e.target.value) || 300)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    min={1}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Maximum time for a single activity execution attempt
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Schedule-to-Close Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={(parameters.scheduleToCloseTimeout as number) || 0}
                    onChange={(e) => updateParameter('scheduleToCloseTimeout', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    min={0}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Total time including retries (0 = unlimited)
                  </p>
                </div>
              </div>

              {/* Retry Settings */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <RefreshCw className="w-4 h-4 text-slate-500" />
                  Retry Policy
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="retryOnFail"
                    checked={(parameters.retryOnFail as boolean) ?? true}
                    onChange={(e) => updateParameter('retryOnFail', e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="retryOnFail" className="text-sm text-slate-700">
                    Retry on failure
                  </label>
                </div>

                {(parameters.retryOnFail ?? true) && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Maximum Attempts
                      </label>
                      <input
                        type="number"
                        value={(parameters.maxRetries as number) || 3}
                        onChange={(e) => updateParameter('maxRetries', parseInt(e.target.value) || 3)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        min={1}
                        max={100}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Initial Retry Interval (seconds)
                      </label>
                      <input
                        type="number"
                        value={(parameters.retryInterval as number) || 1}
                        onChange={(e) => updateParameter('retryInterval', parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        min={1}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Backoff Coefficient
                      </label>
                      <input
                        type="number"
                        value={(parameters.backoffCoefficient as number) || 2}
                        onChange={(e) => updateParameter('backoffCoefficient', parseFloat(e.target.value) || 2)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                        min={1}
                        step={0.1}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Multiplier for retry interval between attempts
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Error Handling */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-slate-500" />
                  Error Handling
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="continueOnFail"
                    checked={(parameters.continueOnFail as boolean) ?? false}
                    onChange={(e) => updateParameter('continueOnFail', e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="continueOnFail" className="text-sm text-slate-700">
                    Continue workflow on failure
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  If enabled, the workflow will continue to the next activity even if this one fails after all retries.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
