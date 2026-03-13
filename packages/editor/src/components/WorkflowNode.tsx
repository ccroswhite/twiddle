import { memo } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, Node as FlowNode } from '@xyflow/react';
import { Settings, Copy, Trash2, Maximize2, Minimize2, Layers } from 'lucide-react';
import {
  getNodeIcon,
  getNodeColor,
  isActivityNode
} from '@/utils/nodeConfig';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useValidation } from '@/contexts/ValidationContext';

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
  const validationIssues = useValidation().filter(i => i.nodeId === id);

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
                      position={Position.Top}
                      id={handle.handle}
                      className="!bg-violet-400 !w-3 !h-3 pointer-events-auto"
                      style={{ left: `${position}%` }}
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
                      position={Position.Bottom}
                      id={handle.handle}
                      className="!bg-violet-400 !w-3 !h-3 pointer-events-auto"
                      style={{ left: `${position}%` }}
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
        className={`bg-white rounded pl-1.5 shadow-sm min-w-[200px] transition-all flex border
          ${selected || contextMenu ? 'ring-2 ring-primary-500 border-primary-500 shadow-md' : 'border-slate-200 hover:shadow-md'}
          ${isEmbedded ? 'opacity-70 cursor-default' : ''}`}
        style={embeddedDimensions ? { minHeight: embeddedDimensions.nodeHeight } : undefined}
        onContextMenu={handleContextMenu}
      >
        {/* Control-M style left status strip */}
        <div className={`${bgColor} w-1.5 shrink-0`} />
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
                    position={Position.Top}
                    id={handle.handle}
                    className="!bg-violet-500 !w-2.5 !h-2.5"
                    style={{ left: inputOffset }}
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
                    position={Position.Bottom}
                    id={handle.handle}
                    className="!bg-violet-500 !w-2.5 !h-2.5"
                    style={{ left: outputOffset }}
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
                position={Position.Top}
                className="!bg-slate-400 !w-2 !h-2"
              />
            )}

            {/* Output Handles (Standard & Custom) */}
            {(() => {
              const customRoutes = data.parameters?.customRoutes as Array<{ condition: string; emitEvent: string }> | undefined || [];
              const showFailRoute = data.parameters?.emitFailRoute === true;

              let outputPorts;
              if (data.nodeType === 'twiddle.if') {
                outputPorts = [
                  { id: 'true', color: 'bg-green-500', label: 'True', isCustom: false },
                  { id: 'false', color: 'bg-red-500', label: 'False', isCustom: false },
                  ...(showFailRoute ? [{ id: 'FAIL', color: 'bg-red-500', label: 'On Failure', isCustom: false }] : [])
                ];
              } else {
                outputPorts = [
                  { id: 'OK', color: 'bg-green-500', label: 'On Success', isCustom: false },
                  ...(showFailRoute ? [{ id: 'FAIL', color: 'bg-red-500', label: 'On Failure', isCustom: false }] : []),
                  ...customRoutes.map(r => ({ id: r.emitEvent, color: 'bg-blue-500', label: `IF ${r.condition} -> ${r.emitEvent}`, isCustom: true }))
                ];
              }

              return outputPorts.map((port, index) => {
                const position = outputPorts.length > 1
                  ? 20 + (index * (60 / (outputPorts.length - 1)))
                  : 50;

                // Linter check: does this custom port have any edges connected to it?
                const isDangling = validationIssues.some(i => i.id === `dangling-port-${id}-${port.id}`);

                return (
                  <div key={port.id} style={{ position: 'absolute', left: `${position}%`, bottom: '-4px', transform: 'translateX(-50%)' }}>
                    {isDangling && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-yellow-500" title={`Warning: Emitted state '${port.id}' has no listeners.`}>
                        ⚠️
                      </div>
                    )}
                    <Handle
                      type="source"
                      position={Position.Bottom}
                      id={port.id}
                      title={port.label}
                      className={`!${port.color} !w-2.5 !h-2.5 !border-white !border-2 tooltip-handle !relative !left-auto !transform-none`}
                    />
                  </div>
                );
              });
            })()}
          </>
        )}

        {/* Node Content */}
        <div className="flex flex-col p-2 min-w-0 flex-1 relative">
          {/* Validation Badge */}
          {validationIssues.length > 0 && (
            <div
              className={`absolute -top-3 -right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 cursor-help ${validationIssues.some(i => i.severity === 'error') ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'}`}
              title={validationIssues.map(i => `• ${i.message}`).join('\n')}
            >
              {validationIssues.some(i => i.severity === 'error') ? '❌' : '⚠️'}
            </div>
          )}
          <div className="flex items-center gap-1.5 mb-1">
            <Icon className={`w-3.5 h-3.5 text-slate-600`} />
            <div className="font-bold text-xs text-slate-900 truncate" title={data.label}>{data.label}</div>
          </div>
          <div className="flex items-center gap-1">
            {!isCredential && !isEmbeddedWorkflowNode && (
              <>
                {isActivityNode(data.nodeType) ? (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                    Activity
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                    Trigger
                  </span>
                )}
              </>
            )}
            {isEmbeddedWorkflowNode && !isExpanded && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-600">
                Embedded
              </span>
            )}
            {isCredential && (
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600">
                Credential
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
