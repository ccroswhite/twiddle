import { useState, useEffect } from 'react';
import { X, Zap } from 'lucide-react';
import { type Node } from '@xyflow/react';
import { isActivityNode, getNodeDisplayName } from '@/utils/nodeConfig';
import { nodeParameterEditors } from '@/components/nodeParameterEditors';
import { workflowsApi } from '@/lib/api';
import { NodeGeneralTab } from './properties/node/NodeGeneralTab';
import { NodeSchedulingTab } from './properties/node/NodeSchedulingTab';
import { NodeRequiredActivityTab } from './properties/node/NodeRequiredActivityTab';
import { NodePublishedActivityTab } from './properties/node/NodePublishedActivityTab';

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  nodes: Node[];
}

export function NodePropertiesPanel({ node, onUpdate, onClose, nodes }: NodePropertiesPanelProps) {
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
          <NodeGeneralTab
            label={label}
            setLabel={setLabel}
            nodeType={nodeType}
            renderParameterEditor={renderParameterEditor}
          />
        )}

        {activeTab === 'scheduling' && isActivityNode(nodeType) && (
          <NodeSchedulingTab
            parameters={parameters}
            updateParameter={updateParameter}
          />
        )}

        {activeTab === 'requiredActivity' && (
          <NodeRequiredActivityTab
            parameters={parameters}
            updateParameter={updateParameter}
            availableActivities={(function () {
              const allPublished = new Set<string>(globalActivities);
              nodes.forEach((n: any) => {
                const pub = (n.data.parameters as Record<string, any>)?.publishedActivity as string[] | undefined;
                if (pub && Array.isArray(pub)) {
                  pub.forEach(p => allPublished.add(p));
                }
                allPublished.add(`${n.id}-OK`);
              });
              return Array.from(allPublished);
            })()}
          />
        )}

        {activeTab === 'publishedActivity' && (
          <NodePublishedActivityTab
            parameters={parameters}
            updateParameter={updateParameter}
            nodeId={node.id}
          />
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
