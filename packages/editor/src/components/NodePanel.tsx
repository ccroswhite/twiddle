import { useState } from 'react';
import { X, Search, Code, Key, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isActivityNode, nodeIconMap as iconMap, nodeColorMap as colorMap } from '@/utils/nodeConfig';
import type { NodeTypeInfo } from '@/lib/api';

interface NodePanelProps {
  nodes: NodeTypeInfo[];
  onSelect: (node: NodeTypeInfo) => void;
  onClose: () => void;
}

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
          <h2 className="text-lg font-semibold">Add Activity or Trigger</h2>
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
              placeholder="Search activities and triggers..."
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
              <h3 className="text-xs font-semibold text-slate-400 tracking-wider mb-2">
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
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-slate-900">
                              {node.displayName}
                            </span>
                            {isActivityNode(node.type) ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-50 px-1 rounded">
                                <Zap className="w-2 h-2" />
                                Activity
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1 rounded">
                                Trigger
                              </span>
                            )}
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
              No activities or triggers found matching "{search}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
