import { useState, useEffect } from 'react';
import { X, Zap, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { isActivityNode, getNodeDisplayName } from '@/utils/nodeConfig';
import { nodeParameterEditors } from '@/components/nodeParameterEditors';

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
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
      // ssh, winrm, interval, htmlExtract, switch, postgresql, mysql, mssql, embeddedWorkflow

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
          {isActivityNode(nodeType) && (
            <Zap className="w-5 h-5 text-amber-500" />
          )}
          <h2 className="text-lg font-semibold text-slate-900">{getNodeDisplayName(nodeType)}</h2>
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
          {nodeType === 'twiddle.embeddedWorkflow' ? (
            <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
              {label}
            </div>
          ) : (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          )}
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
