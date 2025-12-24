import { memo } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, Node as FlowNode } from '@xyflow/react';
import { Settings, Copy, Trash2, Zap, Maximize2, Minimize2, Layers } from 'lucide-react';
import {
  getNodeIcon,
  getNodeColor,
  isActivityNode
} from '@/utils/nodeConfig';
import { useContextMenu } from '@/hooks/useContextMenu';

interface WorkflowNodeProps {
  id: string;
  data: {
    label: string;
    nodeType: string;
    parameters?: Record<string, unknown>;
    onOpenProperties?: (nodeId: string) => void;
    onToggleExpand?: (nodeId: string) => void;
    isEmbedded?: boolean;
  };
  selected?: boolean;
}

function WorkflowNodeComponent({ id, data, selected }: WorkflowNodeProps) {
  const { deleteElements, setNodes, getNode } = useReactFlow();
  const { contextMenu, menuRef, handleContextMenu, closeMenu } = useContextMenu();

  // Check if this is a credential node
  const isCredential = data.nodeType.startsWith('credential.');
  const isEmbeddedWorkflowNode = data.nodeType === 'twiddle.embeddedWorkflow';
  const isExpanded = isEmbeddedWorkflowNode && data.parameters?.isExpanded === 'true';
  const isEmbedded = data.isEmbedded === true;

  const Icon = getNodeIcon(data.nodeType, isCredential);
  const bgColor = getNodeColor(data.nodeType, isCredential);

  const handleDelete = () => {
    closeMenu();
    deleteElements({ nodes: [{ id }] });
  };

  const handleCopy = () => {
    closeMenu();
    const currentNode = getNode(id);
    if (!currentNode) return;

    setNodes((nodes: FlowNode[]) => {
      // Find the furthest position of nodes that overlap with where we'd place the copy
      // This ensures each subsequent copy is offset from the last one
      const baseX = currentNode.position.x;
      const baseY = currentNode.position.y;

      // Find nodes that are in the "copy zone" (offset from original)
      let maxOffset = 0;
      nodes.forEach((node: FlowNode) => {
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
    closeMenu();
    if (data.onOpenProperties) {
      data.onOpenProperties(id);
    }
  };

  const handleToggleExpand = () => {
    closeMenu();
    if (data.onToggleExpand) {
      data.onToggleExpand(id);
    }
  };

  // Render as container for expanded embedded workflows
  if (isEmbeddedWorkflowNode && isExpanded) {
    return (
      <>
        <div
          className="bg-violet-50/30 rounded-lg border-2 border-dashed border-violet-300 relative"
          style={{ width: '100%', height: '100%', padding: 0, margin: 0 }}
          onContextMenu={handleContextMenu}
        >
          {/* Container header - make it clickable */}
          <div
            className="absolute top-2 left-2 flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded shadow-sm border border-violet-200 z-10 pointer-events-auto"
            onContextMenu={handleContextMenu}
          >
            <div className="bg-violet-600 p-1 rounded">
              <Layers className="w-3 h-3 text-white" />
            </div>
            <div className="font-medium text-xs text-slate-900">{data.label}</div>
            <span className="text-[9px] font-medium text-violet-600 bg-violet-50 px-1.5 rounded">
              Embedded
            </span>
          </div>

          {/* Input/Output Handles on the container */}
          {(() => {
            const inputHandles = data.parameters?.inputHandles
              ? JSON.parse(data.parameters.inputHandles as string)
              : [];
            const outputHandles = data.parameters?.outputHandles
              ? JSON.parse(data.parameters.outputHandles as string)
              : [];

            return (
              <>
                {/* Input handles on the left */}
                {inputHandles.map((handle: any, index: number) => {
                  const position = inputHandles.length > 1
                    ? (index / (inputHandles.length - 1)) * 100
                    : 50;
                  return (
                    <Handle
                      key={`input-${handle.handle}`}
                      type="target"
                      position={Position.Left}
                      id={handle.handle}
                      className="!bg-violet-400 !w-3 !h-3 pointer-events-auto"
                      style={{ top: `${position}%` }}
                      title={handle.label}
                    />
                  );
                })}

                {/* Output handles on the right */}
                {outputHandles.map((handle: any, index: number) => {
                  const position = outputHandles.length > 1
                    ? (index / (outputHandles.length - 1)) * 100
                    : 50;
                  return (
                    <Handle
                      key={`output-${handle.handle}`}
                      type="source"
                      position={Position.Right}
                      id={handle.handle}
                      className="!bg-violet-400 !w-3 !h-3 pointer-events-auto"
                      style={{ top: `${position}%` }}
                      title={handle.label}
                    />
                  );
                })}
              </>
            );
          })()}
        </div>

        {/* Context Menu */}
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
              onClick={handleToggleExpand}
              className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              Collapse
            </button>
            <>
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
            </>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Normal node rendering (collapsed or non-embedded workflow)
  // Calculate dynamic height for collapsed embedded workflows
  const getEmbeddedNodeDimensions = () => {
    if (!isEmbeddedWorkflowNode || isExpanded) return null;

    try {
      const inputHandles = data.parameters?.inputHandles
        ? JSON.parse(data.parameters.inputHandles as string)
        : [];
      const outputHandles = data.parameters?.outputHandles
        ? JSON.parse(data.parameters.outputHandles as string)
        : [];

      const maxHandles = Math.max(inputHandles.length, outputHandles.length, 1);
      const handleSpacing = 20; // Minimum 20px between handles
      const paddingTop = 12; // Padding from top edge
      const paddingBottom = 12; // Padding from bottom edge
      const minHeight = 48; // Minimum node height (normal node size)

      const calculatedHeight = (maxHandles * handleSpacing) + paddingTop + paddingBottom;
      const nodeHeight = Math.max(calculatedHeight, minHeight);

      return { inputHandles, outputHandles, nodeHeight, handleSpacing, paddingTop };
    } catch (e) {
      return null;
    }
  };

  const embeddedDimensions = getEmbeddedNodeDimensions();

  return (
    <>
      <div
        className={`bg-white rounded shadow-sm border min-w-[80px] relative ${selected ? 'border-primary-500' : 'border-slate-200'
          } ${isEmbedded ? 'opacity-70 cursor-default' : ''}`}
        style={embeddedDimensions ? { minHeight: embeddedDimensions.nodeHeight } : undefined}
        onContextMenu={handleContextMenu}
      >
        {/* Dynamic handles for collapsed embedded workflows */}
        {isEmbeddedWorkflowNode && !isExpanded && embeddedDimensions ? (() => {
          const { inputHandles, outputHandles, paddingTop, nodeHeight } = embeddedDimensions;

          return (
            <>
              {/* Input handles on the left */}
              {inputHandles.length > 0 && inputHandles.map((handle: any, index: number) => {
                // Calculate pixel position with even distribution
                const totalInputSpace = nodeHeight - paddingTop * 2;
                const inputOffset = inputHandles.length > 1
                  ? paddingTop + (index * totalInputSpace / (inputHandles.length - 1))
                  : nodeHeight / 2;
                return (
                  <Handle
                    key={`input-${handle.handle}`}
                    type="target"
                    position={Position.Left}
                    id={handle.handle}
                    className="!bg-violet-500 !w-2.5 !h-2.5"
                    style={{ top: inputOffset }}
                    title={handle.label || handle.handle}
                  />
                );
              })}

              {/* Output handles on the right */}
              {outputHandles.length > 0 && outputHandles.map((handle: any, index: number) => {
                const totalOutputSpace = nodeHeight - paddingTop * 2;
                const outputOffset = outputHandles.length > 1
                  ? paddingTop + (index * totalOutputSpace / (outputHandles.length - 1))
                  : nodeHeight / 2;
                return (
                  <Handle
                    key={`output-${handle.handle}`}
                    type="source"
                    position={Position.Right}
                    id={handle.handle}
                    className="!bg-violet-500 !w-2.5 !h-2.5"
                    style={{ top: outputOffset }}
                    title={handle.label || handle.handle}
                  />
                );
              })}
            </>
          );
        })() : (
          <>
            {/* Default handles for regular nodes */}
            {/* Input Handle */}
            {data.nodeType !== 'twiddle.manualTrigger' && (
              <Handle
                type="target"
                position={Position.Left}
                className="!bg-slate-400 !w-2 !h-2"
              />
            )}

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
          </>
        )}

        {/* Node Content */}
        <div className="flex items-center gap-1.5 p-1.5">
          <div className={`${bgColor} p-1 rounded`}>
            <Icon className="w-3 h-3 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-medium text-xs text-slate-900">{data.label}</div>
            {!isCredential && !isEmbeddedWorkflowNode && (
              <div className="flex items-center gap-1">
                {isActivityNode(data.nodeType) ? (
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
            )}
            {isEmbeddedWorkflowNode && !isExpanded && (
              <span className="text-[9px] font-medium text-violet-600 bg-violet-50 px-1 rounded">
                Embedded Workflow
              </span>
            )}
          </div>
        </div>
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
          {isEmbeddedWorkflowNode && !isEmbedded && (
            <button
              onClick={handleToggleExpand}
              className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  Collapse
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  Expand
                </>
              )}
            </button>
          )}
          {!isEmbedded && (
            <>
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
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
