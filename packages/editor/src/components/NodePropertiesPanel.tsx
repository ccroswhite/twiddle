import { useState, useEffect } from 'react';
import { X, Zap, Clock, RefreshCw, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useReactFlow, type Node } from '@xyflow/react';
import { isActivityNode, getNodeDisplayName } from '@/utils/nodeConfig';
import { nodeParameterEditors } from '@/components/nodeParameterEditors';
import { workflowsApi } from '@/lib/api';

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodePropertiesPanel({ node, onUpdate, onClose }: NodePropertiesPanelProps) {
  const { getNodes } = useReactFlow();
  const [label, setLabel] = useState('');
  const [parameters, setParameters] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<'general' | 'scheduling' | 'requiredActivity' | 'publishedActivity'>('general');
  const [globalActivities, setGlobalActivities] = useState<string[]>([]);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const acts = await workflowsApi.getPublishedActivities();
        setGlobalActivities(acts as string[]);
      } catch (err) {
        console.error('Failed to fetch published activities:', err);
      }
    }
    fetchActivities();
  }, []);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'scheduling', label: 'Scheduling' },
    { id: 'requiredActivity', label: 'Required Activity' },
    { id: 'publishedActivity', label: 'Published Activity' },
  ] as const;

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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-2 overflow-x-auto shrink-0">
        {tabs.map((tab) => {
          // Hide scheduling/dependencies for non-activity nodes (triggers)
          if ((tab.id === 'scheduling' || tab.id === 'requiredActivity') && !isActivityNode(nodeType)) {
            return null;
          }
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 bg-slate-50">
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Node Name
              </label>
              {nodeType === 'twiddle.embeddedWorkflow' ? (
                <div className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600">
                  {label}
                </div>
              ) : (
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                />
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Node Type
              </label>
              <div className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 font-mono">
                {nodeType}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Parameters</h3>
              {renderParameterEditor()}
            </div>
          </div>
        )}

        {activeTab === 'scheduling' && isActivityNode(nodeType) && (
          <div className="space-y-4">
            {/* Timeout Settings */}
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Timeouts
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Start-to-Close Timeout (sec)
                </label>
                <input
                  type="number"
                  value={(parameters.startToCloseTimeout as number) || 300}
                  onChange={(e) => updateParameter('startToCloseTimeout', parseInt(e.target.value) || 300)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                  min={1}
                />
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                  Max time per execution attempt
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Schedule-to-Close Timeout (sec)
                </label>
                <input
                  type="number"
                  value={(parameters.scheduleToCloseTimeout as number) || 0}
                  onChange={(e) => updateParameter('scheduleToCloseTimeout', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                  min={0}
                />
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                  Total time including retries (0 = unlimited)
                </p>
              </div>
            </div>

            {/* Retry Settings */}
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                <RefreshCw className="w-4 h-4 text-slate-500" />
                Retry Policy
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="retryOnFail"
                  checked={(parameters.retryOnFail as boolean) ?? true}
                  onChange={(e) => updateParameter('retryOnFail', e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="retryOnFail" className="text-[13px] font-medium text-slate-700">
                  Retry on failure
                </label>
              </div>

              {(parameters.retryOnFail ?? true) && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Max Attempts</label>
                    <input
                      type="number"
                      value={(parameters.maxRetries as number) || 3}
                      onChange={(e) => updateParameter('maxRetries', parseInt(e.target.value) || 3)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                      min={1} max={100}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Interval (s)</label>
                    <input
                      type="number"
                      value={(parameters.retryInterval as number) || 1}
                      onChange={(e) => updateParameter('retryInterval', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                      min={1}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Backoff Coefficient</label>
                    <input
                      type="number"
                      value={(parameters.backoffCoefficient as number) || 2}
                      onChange={(e) => updateParameter('backoffCoefficient', parseFloat(e.target.value) || 2)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
                      min={1} step={0.1}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-slate-500" />
                Error Handling
              </div>
              <div className="flex items-start gap-2 mt-2">
                <input
                  type="checkbox"
                  id="continueOnFail"
                  checked={(parameters.continueOnFail as boolean) ?? false}
                  onChange={(e) => updateParameter('continueOnFail', e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <label htmlFor="continueOnFail" className="text-[13px] font-medium text-slate-700 block">
                    Continue workflow on failure
                  </label>
                  <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                    If enabled, the workflow will continue to the next step even if this job fails after all retries exhaust.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requiredActivity' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Required Activity</h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                Define strictly required activity completions. This node will not execute until all required activities have been published as complete successfully.
              </p>

              <div className="space-y-2">
                {((parameters.requiredActivity as string[]) || []).map((req, idx) => {
                  // Collect ALL published activities across the entire graph and global state
                  const allNodes = getNodes();
                  const allPublished = new Set<string>(globalActivities);
                  allNodes.forEach((n: any) => {
                    const pub = (n.data.parameters as Record<string, any>)?.publishedActivity as string[] | undefined;
                    if (pub && Array.isArray(pub)) {
                      pub.forEach(p => allPublished.add(p));
                    }
                    // Also implicitly add NodeID-OK for every explicit node just in case
                    allPublished.add(`${n.id}-OK`);
                  });
                  const availableActivities = Array.from(allPublished);

                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={req || ''}
                        onChange={(e) => {
                          const newReqs = [...((parameters.requiredActivity as string[]) || [])];
                          newReqs[idx] = e.target.value;
                          updateParameter('requiredActivity', newReqs.filter(Boolean));
                        }}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-mono bg-slate-50"
                      >
                        <option value="">Select a published activity...</option>
                        {availableActivities.map(activity => (
                          <option key={activity} value={activity}>{activity}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const newReqs = [...((parameters.requiredActivity as string[]) || [])];
                          newReqs.splice(idx, 1);
                          updateParameter('requiredActivity', newReqs);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => {
                    const newReqs = [...((parameters.requiredActivity as string[]) || []), ''];
                    updateParameter('requiredActivity', newReqs);
                  }}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Required Activity
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'publishedActivity' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-sm">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Published Activity</h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                Define activity states to publish upon successful completion. These can be required by other activities down the graph.
              </p>

              <div className="space-y-2">
                {((parameters.publishedActivity as string[]) || []).map((pub, idx) => (
                  <div key={idx} className="flex flex-col gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pub}
                        onChange={(e) => {
                          const newPubs = [...((parameters.publishedActivity as string[]) || [])];
                          newPubs[idx] = e.target.value;
                          updateParameter('publishedActivity', newPubs.filter(Boolean));
                        }}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm font-mono bg-slate-50"
                        placeholder={`e.g. ${(node as any).id || 'NodeID'}-OK`}
                      />
                      <button
                        onClick={() => {
                          const newPubs = [...((parameters.publishedActivity as string[]) || [])];
                          newPubs.splice(idx, 1);
                          updateParameter('publishedActivity', newPubs);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded"
                        title="Delete Published Activity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Helper to set default event name if empty */}
                    {!pub && (
                      <button
                        onClick={() => {
                          const newPubs = [...((parameters.publishedActivity as string[]) || [])];
                          newPubs[idx] = `${(node as any).id}-OK`;
                          updateParameter('publishedActivity', newPubs);
                        }}
                        className="text-[10px] text-left text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Use default: {(node as any).id}-OK
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => {
                    const newPubs = [...((parameters.publishedActivity as string[]) || []), ''];
                    updateParameter('publishedActivity', newPubs);
                  }}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2 py-1.5 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Published Activity
                </button>
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
