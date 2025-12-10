import { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Globe, Code, GitBranch, GitMerge, Edit, Play, Terminal, Database, Search, Server, Clock, Key, Send, Webhook, FileCode, Settings, Copy, Trash2, Mail, MessageSquare } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'twiddle.httpRequest': Globe,
  'twiddle.code': Code,
  'twiddle.if': GitBranch,
  'twiddle.switch': GitMerge,
  'twiddle.setData': Edit,
  'twiddle.manualTrigger': Play,
  'twiddle.interval': Clock,
  'twiddle.respondToWebhook': Send,
  'twiddle.report': Mail,
  'twiddle.slack': MessageSquare,
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
  'twiddle.report': 'bg-emerald-500',
  'twiddle.slack': 'bg-purple-700',
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

interface WorkflowNodeProps {
  id: string;
  data: {
    label: string;
    nodeType: string;
    parameters?: Record<string, unknown>;
    onOpenProperties?: (nodeId: string) => void;
  };
  selected?: boolean;
}

function WorkflowNodeComponent({ id, data, selected }: WorkflowNodeProps) {
  const { deleteElements, setNodes, getNode } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Check if this is a credential node
  const isCredential = data.nodeType.startsWith('credential.');
  const Icon = isCredential ? Key : (iconMap[data.nodeType] || Code);
  const bgColor = isCredential ? 'bg-amber-500' : (colorMap[data.nodeType] || 'bg-slate-500');

  // Close context menu when clicking outside, pressing Escape, or scrolling
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    const handleScroll = () => {
      setContextMenu(null);
    };

    // Use capture phase to catch clicks before they're handled elsewhere
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('scroll', handleScroll, true);
    // Also close on right-click elsewhere
    document.addEventListener('contextmenu', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('contextmenu', handleClickOutside, true);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDelete = () => {
    setContextMenu(null);
    deleteElements({ nodes: [{ id }] });
  };

  const handleCopy = () => {
    setContextMenu(null);
    const currentNode = getNode(id);
    if (!currentNode) return;

    setNodes((nodes) => {
      // Find the furthest position of nodes that overlap with where we'd place the copy
      // This ensures each subsequent copy is offset from the last one
      const baseX = currentNode.position.x;
      const baseY = currentNode.position.y;
      
      // Find nodes that are in the "copy zone" (offset from original)
      let maxOffset = 0;
      nodes.forEach((node) => {
        const dx = node.position.x - baseX;
        const dy = node.position.y - baseY;
        // Check if this node is along the diagonal offset path (within tolerance)
        if (dx > 0 && dy > 0 && Math.abs(dx - dy) < 10) {
          maxOffset = Math.max(maxOffset, Math.max(dx, dy));
        }
      });

      // New copy should be offset by 40 more than the furthest existing copy (snaps to 20px grid)
      const newOffset = maxOffset + 40;

      const newNode = {
        ...currentNode,
        id: `node_${Date.now()}`,
        position: {
          x: baseX + newOffset,
          y: baseY + newOffset,
        },
        data: {
          ...currentNode.data,
          // Deep copy parameters to avoid reference issues
          parameters: currentNode.data.parameters 
            ? JSON.parse(JSON.stringify(currentNode.data.parameters))
            : {},
        },
        selected: false,
      };

      return [...nodes, newNode];
    });
  };

  const handleOpenProperties = () => {
    setContextMenu(null);
    if (data.onOpenProperties) {
      data.onOpenProperties(id);
    }
  };

  return (
    <>
      <div
        className={`bg-white rounded shadow-sm border min-w-[80px] relative ${
          selected ? 'border-primary-500' : 'border-slate-200'
        }`}
        onContextMenu={handleContextMenu}
      >
        {/* Input Handle */}
        {data.nodeType !== 'twiddle.manualTrigger' && (
          <Handle
            type="target"
            position={Position.Left}
            className="!bg-slate-400 !w-2 !h-2"
          />
        )}

        {/* Node Content */}
        <div className="flex items-center gap-1.5 p-1.5">
          <div className={`${bgColor} p-1 rounded`}>
            <Icon className="w-3 h-3 text-white" />
          </div>
          <div>
            <div className="font-medium text-xs text-slate-900">{data.label}</div>
            {!isCredential && (
              <div className="text-[10px] text-slate-400 leading-tight">
                {data.nodeType.replace('twiddle.', '')}
              </div>
            )}
          </div>
        </div>

        {/* Output Handle */}
        {data.nodeType === 'twiddle.if' ? (
          <>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className="!bg-green-500 !w-2 !h-2"
              style={{ top: '30%' }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              className="!bg-red-500 !w-2 !h-2"
              style={{ top: '70%' }}
            />
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Right}
            className="!bg-slate-400 !w-2 !h-2"
          />
        )}
      </div>

      {/* Context Menu - rendered via portal to escape ReactFlow transforms */}
      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[100] min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleOpenProperties}
            className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Settings className="w-3.5 h-3.5" />
            Properties
          </button>
          <button
            onClick={handleCopy}
            className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <div className="border-t border-slate-200 my-1" />
          <button
            onClick={handleDelete}
            className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
