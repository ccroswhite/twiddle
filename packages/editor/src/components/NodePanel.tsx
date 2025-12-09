import { useState } from 'react';
import { X, Search, Globe, Code, GitBranch, GitMerge, Edit, Play, Terminal, Database, Server, Clock, Key, Send, Webhook, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeTypeInfo {
  type: string;
  displayName: string;
  description: string;
  icon?: string;
  iconColor?: string;
  category: string;
}

interface NodePanelProps {
  nodes: NodeTypeInfo[];
  onSelect: (node: NodeTypeInfo) => void;
  onClose: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'twiddle.httpRequest': Globe,
  'twiddle.code': Code,
  'twiddle.if': GitBranch,
  'twiddle.switch': GitMerge,
  'twiddle.setData': Edit,
  'twiddle.manualTrigger': Play,
  'twiddle.interval': Clock,
  'twiddle.respondToWebhook': Send,
  'twiddle.webhook': Webhook,
  'twiddle.htmlExtract': FileCode,
  'twiddle.winrm': Terminal,
  'twiddle.ssh': Server,
  // Database nodes
  'twiddle.mssql': Database,
  'twiddle.postgresql': Database,
  'twiddle.mysql': Database,
  'twiddle.cassandra': Database,
  'twiddle.redis': Database,
  'twiddle.valkey': Database,
  'twiddle.opensearch': Search,
  'twiddle.elasticsearch': Search,
  'twiddle.snowflake': Database,
  'twiddle.prestodb': Database,
};

const colorMap: Record<string, string> = {
  'twiddle.httpRequest': 'bg-blue-500',
  'twiddle.code': 'bg-orange-500',
  'twiddle.if': 'bg-yellow-500',
  'twiddle.switch': 'bg-violet-500',
  'twiddle.setData': 'bg-purple-500',
  'twiddle.manualTrigger': 'bg-green-500',
  'twiddle.interval': 'bg-teal-500',
  'twiddle.respondToWebhook': 'bg-emerald-500',
  'twiddle.webhook': 'bg-indigo-500',
  'twiddle.htmlExtract': 'bg-pink-500',
  'twiddle.winrm': 'bg-sky-600',
  'twiddle.ssh': 'bg-green-600',
  // Database nodes
  'twiddle.mssql': 'bg-red-600',
  'twiddle.postgresql': 'bg-blue-700',
  'twiddle.mysql': 'bg-blue-500',
  'twiddle.cassandra': 'bg-cyan-600',
  'twiddle.redis': 'bg-red-500',
  'twiddle.valkey': 'bg-indigo-500',
  'twiddle.opensearch': 'bg-blue-600',
  'twiddle.elasticsearch': 'bg-yellow-500',
  'twiddle.snowflake': 'bg-cyan-400',
  'twiddle.prestodb': 'bg-blue-400',
};

export function NodePanel({ nodes, onSelect, onClose }: NodePanelProps) {
  const [search, setSearch] = useState('');

  const filteredNodes = nodes.filter(
    (node) =>
      node.displayName.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase()),
  );

  const categories = [...new Set(filteredNodes.map((n) => n.category))];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold">Add Node</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Node List */}
        <div className="flex-1 overflow-auto p-4">
          {categories.map((category) => (
            <div key={category} className="mb-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {filteredNodes
                  .filter((n) => n.category === category)
                  .map((node) => {
                    // Check if this is a credential node
                    const isCredential = node.type.startsWith('credential.');
                    const Icon = isCredential ? Key : (iconMap[node.type] || Code);
                    const bgColor = isCredential ? 'bg-amber-500' : (colorMap[node.type] || 'bg-slate-500');

                    return (
                      <button
                        key={node.type}
                        onClick={() => onSelect(node)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className={cn(bgColor, 'p-2 rounded-lg')}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-slate-900">
                            {node.displayName}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {node.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}

          {filteredNodes.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No nodes found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
