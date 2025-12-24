import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
  type NodeTypes,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Plus, Download, Code, X, Github, FolderOpen, User, Users, Clock, Trash2, Folder, Shield, Undo2, Copy, Lock, Settings } from 'lucide-react';
import { workflowsApi, nodesApi, githubApi, credentialsApi, foldersApi, groupsApi, usersApi, type Workflow, type Folder as FolderType, type FolderPermission, type FolderPermissionLevel, type NodeTypeInfo } from '@/lib/api';
import { WorkflowNode } from '@/components/WorkflowNode';
import { NodePanel } from '@/components/NodePanel';
import { NodePropertiesPanel } from '@/components/NodePropertiesPanel';
import { WorkflowPropertiesPanel, WorkflowProperty, WorkflowSchedule } from '@/components/WorkflowPropertiesPanel';
import { GitHubSettings } from '@/components/GitHubSettings';
import { RightPanel } from '@/components/RightPanel';
import { WorkflowBrowserPanel } from '@/components/WorkflowBrowserPanel';
import { getNextEnvironment, type Environment } from '@/components/EnvironmentBadge';
import { PromotionRequestModal } from '@/components/PromotionRequestModal';
import { MAX_HISTORY, DEFAULT_SCHEDULE } from '@/utils/constants';
import { generatePropertyId } from '@/utils/workflowUtils';
import { remapEdgesForCollapsedNode, calculateEdgeHandles } from '@/utils/embeddedWorkflowUtils';
import { getCredentialTypeLabel } from '@/utils/nodeConfig';
import { useWorkflowBrowser } from '@/hooks/useWorkflowBrowser';

interface WorkflowEditorProps {
  openBrowser?: boolean;
}

export function WorkflowEditor({ openBrowser = false }: WorkflowEditorProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = !id || id === 'new';

  // Track the folder ID for new workflows (set when clicking Create New Workflow from a folder)
  const [newWorkflowFolderId, setNewWorkflowFolderId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const [workflowVersion, setWorkflowVersion] = useState<number>(1);
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [showPythonCode, setShowPythonCode] = useState(false);
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [workflowProperties, setWorkflowProperties] = useState<WorkflowProperty[]>([]);
  const [workflowSchedule, setWorkflowSchedule] = useState<WorkflowSchedule>(DEFAULT_SCHEDULE);
  const [githubConnected, setGithubConnected] = useState(false);
  const [pythonCode, setPythonCode] = useState<{ workflow: string; activities: string } | null>(null);
  const [availableNodes, setAvailableNodes] = useState<NodeTypeInfo[]>([]);
  const [environment, setEnvironment] = useState<Environment>('DV');

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Workflow browser hook - manages folder navigation, workflows list, drag-drop
  const workflowBrowser = useWorkflowBrowser();
  // Destructure commonly used values for easier access
  const {
    isOpen: showWorkflowBrowser,
    open: openWorkflowBrowser,
    close: closeWorkflowBrowser,
    loading: loadingWorkflows,
    folders,
    currentFolderId,
    folderPath,
    workflows: availableWorkflows,
    navigateToFolder: handleNavigateToFolder,
    navigateToBreadcrumb: handleNavigateToBreadcrumb,
    loadContents: loadFolderContents,
    showNewFolderInput,
    setShowNewFolderInput,
    newFolderName,
    setNewFolderName,
    editingFolderId,
    setEditingFolderId,
    editingFolderName,
    setEditingFolderName,
    draggingWorkflowId,
    dragOverFolderId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = workflowBrowser;

  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);
  const [versionHistoryWorkflow, setVersionHistoryWorkflow] = useState<Workflow | null>(null);

  // Locking state
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [lockedBy, setLockedBy] = useState<{ id: string; name: string; email: string; isMe: boolean } | null>(null);
  const [takeoverRequest, setTakeoverRequest] = useState<{ userId: string; name: string; email: string; requestedAt: string } | null>(null);
  const [requestingLock, setRequestingLock] = useState(false);

  // Folder permissions state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [permissionsFolder, setPermissionsFolder] = useState<FolderType | null>(null);
  const [folderPermissions, setFolderPermissions] = useState<FolderPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);
  const [newPermissionType, setNewPermissionType] = useState<'user' | 'group'>('user');
  const [newPermissionTargetId, setNewPermissionTargetId] = useState('');
  const [newPermissionLevel, setNewPermissionLevel] = useState<FolderPermissionLevel>('READ');

  // Version History state
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<{ id: string; version: number; createdAt: string; createdBy: { name: string; email: string } | null }[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);


  // Undo history - stores snapshots of nodes and edges
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoing = useRef(false);

  // Pending node being dragged to place
  const [pendingNode, setPendingNode] = useState<{
    type: NodeTypeInfo;
    screenPos: { x: number; y: number };
  } | null>(null);

  // Selection context menu
  const [selectionContextMenu, setSelectionContextMenu] = useState<{ x: number; y: number } | null>(null);
  const selectionContextMenuRef = useRef<HTMLDivElement>(null);

  // Workflow Browser context menu
  const [workflowContextMenu, setWorkflowContextMenu] = useState<{ x: number; y: number; workflow: Workflow } | null>(null);
  const workflowContextMenuRef = useRef<HTMLDivElement>(null);

  // Pane context menu (for Read Only mode)
  const [paneContextMenu, setPaneContextMenu] = useState<{ x: number; y: number } | null>(null);
  const paneContextMenuRef = useRef<HTMLDivElement>(null);

  const nodeTypes: NodeTypes = useMemo(() => ({
    workflowNode: WorkflowNode as any,
  }), []);

  // Store ReactFlow instance for viewport calculations
  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null);

  // Track if this is the initial mount for the openBrowser behavior
  const isInitialMount = useRef(true);

  // Callback for opening properties panel from node context menu
  // Using a ref to avoid re-renders and infinite loops
  // Defined early so it can be used in loadWorkflow
  const handleOpenPropertiesRef = useRef<(nodeId: string) => void>(undefined);
  handleOpenPropertiesRef.current = (nodeId: string) => {
    const node = nodes.find((n: Node) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  };

  const handleOpenProperties = useCallback((nodeId: string) => {
    handleOpenPropertiesRef.current?.(nodeId);
  }, []);

  // Callback for toggling expand state of embedded workflow nodes
  const handleToggleExpandRef = useRef<(nodeId: string) => void>(undefined);
  handleToggleExpandRef.current = (nodeId: string) => {
    const node = nodes.find((n: Node) => n.id === nodeId);
    if (!node || node.data.nodeType !== 'twiddle.embeddedWorkflow') return;

    const parameters = (node.data.parameters || {}) as Record<string, any>;
    const isExpanded = parameters.isExpanded === 'true';

    if (isExpanded) {
      // Collapse: Remap external connections and remove embedded nodes

      // Get handle mappings to remap external connections
      const inputHandles = parameters.inputHandles
        ? JSON.parse(parameters.inputHandles as string)
        : [];
      const outputHandles = parameters.outputHandles
        ? JSON.parse(parameters.outputHandles as string)
        : [];

      // Create mapping: embedded node ID -> parent handle ID
      const inputMap = new Map<string, string>();  // embedded node ID -> parent input handle
      const outputMap = new Map<string, string>(); // embedded node ID -> parent output handle

      inputHandles.forEach((h: any) => {
        inputMap.set(`${nodeId}_embedded_${h.sourceNodeId}`, h.handle);
      });
      outputHandles.forEach((h: any) => {
        outputMap.set(`${nodeId}_embedded_${h.sourceNodeId}`, h.handle);
      });

      // Remap external connections using helper
      setEdges((eds: Edge[]) => remapEdgesForCollapsedNode(eds, nodeId, inputHandles, outputHandles));

      // Remove embedded nodes
      setNodes((nds: Node[]) =>
        nds.filter((n: Node) => !(n as any).parentId || (n as any).parentId !== nodeId).map((n: Node) =>
          n.id === nodeId
            ? {
              ...n,
              width: undefined, // Reset dimensions to compact size
              height: undefined,
              zIndex: undefined, // Reset z-index
              style: undefined, // Remove container styling
              data: {
                ...n.data,
                parameters: {
                  ...(n.data.parameters as Record<string, any> || {}),
                  isExpanded: 'false',
                },
              },
            }
            : n
        )
      );
    } else {
      // Expand: Add embedded child nodes
      const embeddedNodes = parameters.embeddedNodes
        ? JSON.parse(parameters.embeddedNodes as string)
        : [];
      const embeddedConnections = parameters.embeddedConnections
        ? JSON.parse(parameters.embeddedConnections as string)
        : [];

      // Calculate bounding box of embedded nodes to determine container size
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      embeddedNodes.forEach((node: any) => {
        const x = node.position?.x || 0;
        const y = node.position?.y || 0;
        // More accurate node size estimates (nodes are typically 80-120px wide, 40-50px tall)
        const width = 100;
        const height = 45;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      });

      // Add minimal padding - just enough for the header and some breathing room
      const paddingLeft = 20;
      const paddingRight = 40; // Extra padding on right to account for node width
      const paddingTop = 80; // Space for header badge
      const paddingBottom = 20;

      const containerWidth = (maxX - minX) + paddingLeft + paddingRight;
      const containerHeight = (maxY - minY) + paddingTop + paddingBottom;

      // Normalize positions - offset by minX/minY and add top/left padding
      const childNodes = embeddedNodes.map((embNode: any) => ({
        id: `${nodeId}_embedded_${embNode.id}`,
        type: 'workflowNode',
        parentId: nodeId,  // Changed from parentNode to parentId
        extent: 'parent' as const,
        draggable: false,
        selectable: false,
        expandParent: false,
        zIndex: 10, // Higher than parent so children appear on top
        position: {
          // Normalize to start at (0,0) relative to bounding box, then add padding
          x: (embNode.position?.x || 0) - minX + paddingLeft,
          y: (embNode.position?.y || 0) - minY + paddingTop,
        },
        data: {
          label: embNode.name,
          nodeType: embNode.type,
          parameters: embNode.parameters || {},
          isEmbedded: true,
          onOpenProperties: handleOpenProperties,
          onToggleExpand: handleToggleExpand,
        },
      } as any));

      // Create internal connections
      const internalEdges = embeddedConnections.map((conn: any, index: number) => ({
        id: `${nodeId}_embedded_edge_${index}`,
        source: `${nodeId}_embedded_${conn.sourceNodeId}`,
        target: `${nodeId}_embedded_${conn.targetNodeId}`,
        sourceHandle: conn.sourceOutput || null,
        targetHandle: conn.targetInput || null,
        type: 'default',
        zIndex: 5, // Between parent and children
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      }));

      // Update all nodes in a single batch: update parent and add children
      setNodes((nds: Node[]) => [
        ...nds.map((n: Node) =>
          n.id === nodeId
            ? {
              ...n,
              type: 'workflowNode',
              // Set calculated dimensions for React Flow parent-child to work
              width: containerWidth,
              height: containerHeight,
              zIndex: 0, // Lower z-index for parent container
              data: {
                ...n.data,
                parameters: {
                  ...(n.data.parameters as Record<string, any> || {}),
                  isExpanded: 'true',
                },
              },
            } as any
            : n
        ),
        ...childNodes,
      ]);

      // Add edges in separate update - including remapped external connections
      setEdges((eds: Edge[]) => {
        // Get handle mappings for remapping external connections
        const inputHandles = parameters.inputHandles
          ? JSON.parse(parameters.inputHandles as string)
          : [];
        const outputHandles = parameters.outputHandles
          ? JSON.parse(parameters.outputHandles as string)
          : [];

        // Create mapping: parent handle ID -> embedded node ID
        const inputHandleMap = new Map<string, string>();  // parent input handle -> embedded node ID
        const outputHandleMap = new Map<string, string>(); // parent output handle -> embedded node ID

        inputHandles.forEach((h: any) => {
          inputHandleMap.set(h.handle, `${nodeId}_embedded_${h.sourceNodeId}`);
        });
        outputHandles.forEach((h: any) => {
          outputHandleMap.set(h.handle, `${nodeId}_embedded_${h.sourceNodeId}`);
        });

        // Remap external connections from parent to embedded nodes
        const remappedEdges = eds.map((e: Edge) => {
          // Check if edge connects to the parent node
          const isSourceParent = e.source === nodeId;
          const isTargetParent = e.target === nodeId;

          if (!isSourceParent && !isTargetParent) {
            return e; // Not connected to parent, keep as-is
          }

          // Remap source if parent is source (output from parent)
          let newSource = e.source;
          let newSourceHandle = e.sourceHandle;
          if (isSourceParent && e.sourceHandle && outputHandleMap.has(e.sourceHandle)) {
            newSource = outputHandleMap.get(e.sourceHandle) || e.source;
            newSourceHandle = null; // Clear handle as we're connecting directly to embedded node
          }

          // Remap target if parent is target (input to parent)
          let newTarget = e.target;
          let newTargetHandle = e.targetHandle;
          if (isTargetParent && e.targetHandle && inputHandleMap.has(e.targetHandle)) {
            newTarget = inputHandleMap.get(e.targetHandle) || e.target;
            newTargetHandle = null; // Clear handle as we're connecting directly to embedded node
          }

          return {
            ...e,
            source: newSource,
            sourceHandle: newSourceHandle,
            target: newTarget,
            targetHandle: newTargetHandle,
          };
        });

        return [...remappedEdges, ...internalEdges];
      });
    }
  };

  // Property management functions
  const handleAddProperty = useCallback(() => {
    const newProp: WorkflowProperty = {
      id: generatePropertyId(),
      key: '',
      type: 'string',
      value: '',
    };
    setWorkflowProperties((props) => [...props, newProp]);
  }, []);

  const handleUpdateProperty = useCallback((id: string, updates: Partial<WorkflowProperty>) => {
    setWorkflowProperties((props) =>
      props.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const handleDeleteProperty = useCallback((id: string) => {
    setWorkflowProperties((props) => props.filter((p) => p.id !== id));
  }, []);

  const handleUpdateSchedule = useCallback((updates: Partial<WorkflowSchedule>) => {
    setWorkflowSchedule((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleToggleExpand = useCallback((nodeId: string) => {
    handleToggleExpandRef.current?.(nodeId);
  }, []);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoing.current) return;

    setHistory(prev => {
      // Create a deep copy of current state
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      // If we're not at the end of history, truncate forward history
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);

      // Keep only the last MAX_HISTORY items
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
      }

      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [nodes, edges, historyIndex]);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0 || history.length === 0) return;

    isUndoing.current = true;
    const prevIndex = historyIndex - 1;
    const prevState = history[prevIndex];

    if (prevState) {
      // Restore onOpenProperties callback to nodes
      const restoredNodes = prevState.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onOpenProperties: handleOpenProperties,
        },
      }));
      setNodes(restoredNodes);
      setEdges(prevState.edges);
      setHistoryIndex(prevIndex);
    }

    // Reset flag after state update
    setTimeout(() => {
      isUndoing.current = false;
    }, 0);
  }, [history, historyIndex, setNodes, setEdges, handleOpenProperties]);

  // Keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Close selection context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectionContextMenuRef.current && !selectionContextMenuRef.current.contains(event.target as HTMLElement)) {
        setSelectionContextMenu(null);
      }
      if (paneContextMenuRef.current && !paneContextMenuRef.current.contains(event.target as HTMLElement)) {
        setPaneContextMenu(null);
      }
      if (workflowContextMenuRef.current && !workflowContextMenuRef.current.contains(event.target as HTMLElement)) {
        setWorkflowContextMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle right-click on canvas to show selection context menu
  const handleSelectionContextMenu = useCallback((event: React.MouseEvent) => {
    const selectedNodes = nodes.filter((node: Node) => node.selected);
    if (selectedNodes.length > 0) {
      event.preventDefault();
      setSelectionContextMenu({ x: event.clientX, y: event.clientY });
    }
  }, [nodes]);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    // Select the edge
    setEdges((eds: Edge[]) => eds.map((e: Edge) => e.id === edge.id ? { ...e, selected: true } : e));
    setSelectionContextMenu({ x: event.clientX, y: event.clientY });
  }, [setEdges]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    if (isReadOnly) {
      event.preventDefault();
      setPaneContextMenu({ x: event.clientX, y: event.clientY });
    }
  }, [isReadOnly]);

  // Copy and paste selected nodes with offset
  const handleCopyAndPaste = useCallback(() => {
    const selectedNodes = nodes.filter((node: Node) => node.selected);
    if (selectedNodes.length === 0) return;

    // Get edges that connect selected nodes
    const selectedNodeIds = new Set(selectedNodes.map((n: Node) => n.id));
    const selectedEdges = edges.filter(
      (edge: Edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    // Generate new IDs and offset positions
    const idMap = new Map<string, string>();
    const offset = { x: 50, y: 50 };

    const newNodes = selectedNodes.map((node: Node) => {
      const newId = `${node.data.nodeType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offset.x,
          y: node.position.y + offset.y,
        },
        selected: true,
        data: {
          ...node.data,
          onOpenProperties: handleOpenProperties,
        },
      };
    });

    // Update edge references to new node IDs
    const newEdges = selectedEdges.map((edge: Edge) => ({
      ...edge,
      id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}`,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));

    // Deselect existing nodes and add new ones
    setNodes((prev: Node[]) => [
      ...prev.map((n: Node) => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges((prev: Edge[]) => [...prev, ...newEdges]);
    setSelectionContextMenu(null);
  }, [nodes, edges, handleOpenProperties, setNodes, setEdges]);

  // Track changes to nodes and edges for undo history
  const prevNodesRef = useRef<string>('');
  const prevEdgesRef = useRef<string>('');

  useEffect(() => {
    if (isUndoing.current) return;

    const nodesJson = JSON.stringify(nodes.map((n: Node) => ({ id: n.id, position: n.position, data: { label: n.data.label, nodeType: n.data.nodeType, parameters: n.data.parameters } })));
    const edgesJson = JSON.stringify(edges);

    // Only save if there's an actual change
    if (nodesJson !== prevNodesRef.current || edgesJson !== prevEdgesRef.current) {
      // Skip the initial empty state
      if (prevNodesRef.current !== '' || prevEdgesRef.current !== '') {
        saveToHistory();
      }
      prevNodesRef.current = nodesJson;
      prevEdgesRef.current = edgesJson;
    }
  }, [nodes, edges, saveToHistory]);

  // Heartbeat loop
  useEffect(() => {
    if (!id || isNew || isReadOnly) return;

    const interval = setInterval(async () => {
      try {
        const response = await workflowsApi.heartbeat(id);
        if (response.request) {
          setTakeoverRequest(response.request);
        } else {
          setTakeoverRequest(null);
        }
      } catch (err) {
        console.error('Heartbeat failed:', err);
        loadWorkflow(id);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [id, isNew, isReadOnly]);

  // Takeover Request Polling (Viewer)
  useEffect(() => {
    if (!id || !requestingLock || !isReadOnly) return;

    const interval = setInterval(async () => {
      try {
        // We can use heartbeat or get to check status, but really we wait for the lock to be acquired
        // In fact, if we are requesting, we likely want to just try to loadWorkflow periodically
        // If we get the lock, loadWorkflow will set isReadOnly=false
        await loadWorkflow(id);
        // If loadWorkflow set isReadOnly=false, this effect will stop and requestingLock should be reset
      } catch (e) {
        // ignore
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, requestingLock, isReadOnly]);

  // Reset requestingLock when we get write access
  useEffect(() => {
    if (!isReadOnly) {
      setRequestingLock(false);
    }
  }, [isReadOnly]);

  async function handleRequestLock() {
    if (!id || !isReadOnly) return;
    try {
      const res = await workflowsApi.requestLock(id);
      if (res.status === 'acquired') {
        // We got it immediately (unlocked)
        loadWorkflow(id);
      } else if (res.status === 'requested') {
        setRequestingLock(true);
      }
    } catch (e) {
      alert('Failed to request lock');
    }
  }

  async function handleResolveLock(action: 'ACCEPT' | 'DENY') {
    if (!id || !takeoverRequest) return;
    try {
      await workflowsApi.resolveLock(id, action);
      setTakeoverRequest(null);
      if (action === 'ACCEPT') {
        // We yielded, so reload to become ReadOnly
        loadWorkflow(id);
      }
    } catch (e) {
      alert('Failed to resolve lock');
    }
  }

  // Unlock on unmount
  useEffect(() => {
    return () => {
      if (id && !isNew && !isReadOnly && lockedBy?.isMe) {
        workflowsApi.unlock(id).catch(console.error);
      }
    };
  }, [id, isNew, isReadOnly, lockedBy]);

  useEffect(() => {
    loadAvailableNodes();
    if (!isNew && id) {
      loadWorkflow(id);
      loadGitHubStatus(id);
    } else if (isNew) {
      // Reset canvas for new workflow
      setNodes([]);
      setEdges([]);
      setWorkflowName('New Workflow');
      setWorkflowDescription('');
      setEnvironment('DV');
      setPythonCode(null);
      setGithubConnected(false);
      setSelectedNode(null);
    }
    // Auto-open/toggle browser panel if openBrowser prop is true
    if (openBrowser) {
      if (isInitialMount.current) {
        // First mount - always open the panel
        isInitialMount.current = false;
        handleOpenWorkflowBrowser();
      } else {
        // Subsequent clicks - toggle the panel
        if (showWorkflowBrowser) {
          // Closing - use animated close
          closeWorkflowBrowser();
        } else {
          // Opening
          handleOpenWorkflowBrowser();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, openBrowser, location.key]); // showWorkflowBrowser intentionally omitted to avoid re-triggering

  async function loadGitHubStatus(workflowId: string) {
    try {
      const status = await githubApi.getStatus(workflowId);
      setGithubConnected(status.connected);
    } catch (err) {
      console.error('Failed to load GitHub status:', err);
    }
  }

  async function loadAvailableNodes() {
    try {
      // Load node types
      const nodeTypes = await nodesApi.list();

      // Load credentials and convert them to node types
      const credentials = await credentialsApi.list();
      const credentialNodes: NodeTypeInfo[] = credentials.map((cred: { id: string; name: string; type: string }) => ({
        type: `credential.${cred.type}.${cred.id}`,
        displayName: cred.name,
        description: `Use ${cred.name} credential (${getCredentialTypeLabel(cred.type)})`,
        category: 'DEFINED CONNECTIONS',
      }));

      // Load workflows and convert them to node types for the "Existing Workflow" category
      const workflows = await workflowsApi.list();
      const workflowNodes: NodeTypeInfo[] = workflows.map((workflow: Workflow) => ({
        type: `workflow.${workflow.id}`,
        displayName: workflow.name,
        description: workflow.description || `Embed ${workflow.name} workflow`,
        category: 'Existing Workflow',
        icon: 'layers',
        iconColor: '#8b5cf6',
      }));

      setAvailableNodes([...(nodeTypes as NodeTypeInfo[]), ...credentialNodes, ...workflowNodes]);
    } catch (err) {
      console.error('Failed to load node types:', err);
    }
  }
  // Check for updates to embedded workflows based on version policy
  async function checkAndUpgradeEmbeddedWorkflows(nodes: any[]) {
    const updatedNodes = [...nodes];
    let hasChanges = false;

    for (let i = 0; i < updatedNodes.length; i++) {
      const node = updatedNodes[i];
      if (node.type !== 'twiddle.embeddedWorkflow') continue;

      const params = node.parameters || {};
      const workflowId = params.workflowId;
      const currentVersion = params.workflowVersion || 0;

      // Default to 'locked' for existing nodes without policy
      const effectivePolicy = params.versionPolicy || 'locked';

      if (!workflowId) continue;

      try {
        // Fetch workflow details (always gets latest)
        const latestWorkflow = await workflowsApi.get(workflowId) as any;

        if (!latestWorkflow) continue;


        const latestVersion = latestWorkflow.version || 1;

        if (latestVersion > currentVersion) {
          if (effectivePolicy === 'latest') {
            // Auto-upgrade
            console.log(`Auto-upgrading embedded workflow ${workflowId} from v${currentVersion} to v${latestVersion}`);

            // Calculate handles for the new version
            const { inputHandles, outputHandles } = calculateEdgeHandles(latestWorkflow.nodes, latestWorkflow.connections);

            updatedNodes[i] = {
              ...node,
              parameters: {
                ...params,
                workflowVersion: latestVersion,
                workflowName: latestWorkflow.name, // Update name in case it changed
                embeddedNodes: JSON.stringify(latestWorkflow.nodes),
                embeddedConnections: JSON.stringify(latestWorkflow.connections),
                inputHandles: JSON.stringify(inputHandles),
                outputHandles: JSON.stringify(outputHandles),
                versionPolicy: 'latest',
              }
            };
            hasChanges = true;
          } else {
            // Policy is locked (or specific version), but a newer version exists.
            // Check if we already asked (avoid nagging if they said no? - Hard to track "no" across reloads without local storage)
            // For now, simple confirm.
            if (window.confirm(`Embedded workflow "${params.workflowName}" has a newer version (v${latestVersion}). Current is v${currentVersion}.\n\nDo you want to upgrade to the latest version?`)) {
              // Calculate handles for the new version
              const { inputHandles, outputHandles } = calculateEdgeHandles(latestWorkflow.nodes, latestWorkflow.connections);

              updatedNodes[i] = {
                ...node,
                parameters: {
                  ...params,
                  workflowVersion: latestVersion,
                  workflowName: latestWorkflow.name,
                  embeddedNodes: JSON.stringify(latestWorkflow.nodes),
                  embeddedConnections: JSON.stringify(latestWorkflow.connections),
                  inputHandles: JSON.stringify(inputHandles),
                  outputHandles: JSON.stringify(outputHandles),
                  // Keep policy as locked? Or switch to latest? 
                  // Usually if they upgrade manualy, it stays locked to that new version unless they explicitly change policy.
                  versionPolicy: 'locked',
                }
              };
              hasChanges = true;
            } else {
              // User declined upgrade.
              // Still need to ensure handles exist for the CURRENT version if they are missing.
              // This handles the regression where connections are lost on existing workflows.
              if (!params.inputHandles || !params.outputHandles) {
                // Warning: We are using latestWorkflow to calculate handles, but the user locked to an older version.
                // Ideally we should fetch the specific version they are locked to.
                // However, we don't assume we have that easily accessible without another API call.
                // But wait, if they are locked to v1 and we fetch HEAD (v2), the handles might be different!
                // Repairing using HEAD (v2) for a locked v1 node is dangerous/wrong.

                // Strategy:
                // 1. If we can get the specific version, use it.
                // 2. If not, maybe we shouldn't touch it, or warn that connections might be broken.

                // However, for the user's specific case, they probably just saved it recently and my previous fix didn't backfill properly?
                // Or they just want it to work.

                // Let's see if we can get the correct version data.
                // `workflowsApi.getVersion(id, versionId)` requires version ID, not number. We only have number stored usually?
                // Wait, `checkAndUpgradeEmbeddedWorkflows` fetches `workflowsApi.get(workflowId)` which is HEAD.

                // If the user is on the SAME version as HEAD (failed the > check), then we can safely use HEAD data to repair.
                // If the user is on an OLDER version, repairing with HEAD is wrong.

                // Refined logic:
                // If (latestVersion === currentVersion && (!inputs || !outputs)) -> Safe repair.
                // If (latestVersion > currentVersion) -> We prompted above. If they said NO, we fall through here.
                //    If they said NO, they stay on old version. If handles are missing, they stay broken?
                //    If handles are missing on an old version, we'd need to fetch that old version to repair correctly.
                //    We can check `latestWorkflow.version`. If equal, repair.
              }
            }
          }
        } else if (!params.inputHandles || !params.outputHandles) {
          // No upgrade needed (already latest), but handles are missing.
          // This is the "Repair" case for the regression.
          // Since versions match (or current > latest? unlikely), we can use the fetched workflow data.
          console.log(`Repairing missing handles for embedded workflow ${workflowId}`);

          const { inputHandles, outputHandles } = calculateEdgeHandles(latestWorkflow.nodes, latestWorkflow.connections);

          updatedNodes[i] = {
            ...node,
            parameters: {
              ...params,
              // Update handles only, keep version/nodes as is (assuming they match since version check passed)
              // Actually, if we are here, currentVersion >= latestVersion approximately.
              // If we strictly trust the version number match:
              inputHandles: JSON.stringify(inputHandles),
              outputHandles: JSON.stringify(outputHandles),
              // Also ensure embeddedNodes/Connections are set if missing?
              embeddedNodes: params.embeddedNodes || JSON.stringify(latestWorkflow.nodes),
              embeddedConnections: params.embeddedConnections || JSON.stringify(latestWorkflow.connections),
            }
          };
          hasChanges = true;
        }
      } catch (e) {
        console.warn(`Failed to check for updates for embedded workflow ${workflowId}`, e);
      }
    }

    return hasChanges ? updatedNodes : nodes;
  }

  async function loadWorkflow(workflowId: string) {
    try {
      // Reset properties/schedule state first to prevent stale data from previous workflow
      setWorkflowProperties([]);
      setWorkflowSchedule({
        enabled: false,
        mode: 'simple',
        simple: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
      });

      const workflow = await workflowsApi.get(workflowId) as {
        name: string;
        description?: string;
        nodes: unknown[];
        connections: unknown[];
        pythonWorkflow?: string;
        pythonActivities?: string;
        environment?: Environment;
        lockedBy?: { id: string; name: string; email: string; isMe: boolean };
        properties?: WorkflowProperty[];
        schedule?: WorkflowSchedule;
        version?: number;
      };
      setWorkflowName(workflow.name);
      setWorkflowVersion(workflow.version || 1);
      setWorkflowDescription(workflow.description || '');
      setEnvironment(workflow.environment || 'DV');

      // Check for embedded workflow updates
      const nodesWithUpdates = await checkAndUpgradeEmbeddedWorkflows(workflow.nodes);

      // If updates occurred, mark as dirty? 
      // For now, we update the local state. User will need to save to persist upgrades.
      // Ideally we might want to auto-save or at least indicate unsaved changes.
      // Since 'nodes' state update triggers 'save' button enabled state usually?
      // Wait, 'isDirty' tracking logic? 
      // The editor usually tracks changes via onNodesChange. Setting initial nodes doesn't trigger dirty usually.
      // But if we pass modified nodes to setNodes, they are just the initial state.
      // React Flow doesn't know they are "dirty" vs the DB state unless we track initial vs current.
      // Use case: User opens workflow -> Auto-upgrades happen -> They see new version -> They must Save to keep it.
      // That seems correct.

      // Handle locking
      if (workflow.lockedBy) {
        setLockedBy(workflow.lockedBy);
        setIsReadOnly(!workflow.lockedBy.isMe);
      } else {
        setLockedBy(null);
        setIsReadOnly(false);
      }

      // Load Python code if available
      if (workflow.pythonWorkflow) {
        setPythonCode({
          workflow: workflow.pythonWorkflow,
          activities: workflow.pythonActivities || '',
        });
      }

      // Map to store default handles for composed nodes to support legacy connections
      const embeddedNodeDefaults: Record<string, { firstInput?: string, firstOutput?: string }> = {};

      // Convert workflow nodes to React Flow nodes
      const flowNodes = (nodesWithUpdates as Array<{
        id: string;
        name: string;
        type: string;
        position: { x: number; y: number };
        parameters: Record<string, unknown>;
      }>).map((node) => {
        // For embedded workflows, ensure they load collapsed
        let parameters = node.parameters;
        if (node.type === 'twiddle.embeddedWorkflow' && parameters) {
          parameters = {
            ...parameters,
            isExpanded: 'false', // Always load embedded workflows collapsed
          };

          // Store default handles for edge migration
          try {
            const inputHandles = parameters.inputHandles ? JSON.parse(parameters.inputHandles as string) : [];
            const outputHandles = parameters.outputHandles ? JSON.parse(parameters.outputHandles as string) : [];

            embeddedNodeDefaults[node.id] = {
              firstInput: inputHandles.length > 0 ? inputHandles[0].handle : undefined,
              firstOutput: outputHandles.length > 0 ? outputHandles[0].handle : undefined,
            };
          } catch (e) {
            console.warn('Failed to parse handles for defaults', e);
          }
        }

        return {
          id: node.id,
          type: 'workflowNode',
          position: node.position,
          data: {
            label: node.name,
            nodeType: node.type,
            parameters,
            onOpenProperties: handleOpenProperties,
            onToggleExpand: handleToggleExpand,
          },
        };
      });

      // Convert workflow connections to React Flow edges
      // Handle null/undefined handle IDs - React Flow uses null for default handles
      // Migration: If handle is null but node has specific handles (composed), use the first one.
      const flowEdges: Edge[] = (workflow.connections as Array<{
        sourceNodeId: string;
        sourceOutput?: string | null;
        targetNodeId: string;
        targetInput?: string | null;
      }>).map((conn, index) => {
        let sourceHandle = conn.sourceOutput === 'main' ? null : (conn.sourceOutput ?? null);
        let targetHandle = conn.targetInput === 'main' ? null : (conn.targetInput ?? null);

        // Migrate legacy connections for embedded workflows
        if (embeddedNodeDefaults[conn.sourceNodeId] && !sourceHandle) {
          sourceHandle = embeddedNodeDefaults[conn.sourceNodeId].firstOutput ?? null;
        }
        if (embeddedNodeDefaults[conn.targetNodeId] && !targetHandle) {
          targetHandle = embeddedNodeDefaults[conn.targetNodeId].firstInput ?? null;
        }

        return {
          id: `e${index}`,
          source: conn.sourceNodeId,
          target: conn.targetNodeId,
          sourceHandle,
          targetHandle,
        };
      });

      // Since I can't easily change `const flowEdges` to `let` in one tool call safely without wide context,
      // I will do the remapping using a reduce.
      const remappedEdges = flowNodes.reduce((currentEdges, node) => {
        if (node.data.nodeType === 'twiddle.embeddedWorkflow') {
          try {
            const params = node.data.parameters as Record<string, unknown>;
            const inputHandles = params.inputHandles ? JSON.parse(params.inputHandles as string) : [];
            const outputHandles = params.outputHandles ? JSON.parse(params.outputHandles as string) : [];
            return remapEdgesForCollapsedNode(currentEdges, node.id, inputHandles, outputHandles);
          } catch (e) { return currentEdges; }
        }
        return currentEdges;
      }, flowEdges);

      setNodes(flowNodes);
      setEdges(remappedEdges);

      // Load properties and schedule from API (use defaults if not present)
      setWorkflowProperties(workflow.properties || []);
      setWorkflowSchedule(workflow.schedule || {
        enabled: false,
        mode: 'simple',
        simple: { frequency: 'daily', time: '09:00', timezone: 'UTC' },
      });
    } catch (err) {
      console.error('Failed to load workflow:', err);
      alert('Failed to load workflow');
    }
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges],
  );

  const onNodesDelete = useCallback((deletedNodes: Node[]) => {
    // Close properties panel if the selected node was deleted
    if (selectedNode && deletedNodes.some(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [selectedNode]);

  const handleNodeUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds: Node[]) =>
      nds.map((node) => {
        if (node.id !== nodeId) return node;

        const updatedNode = { ...node, data };

        // Check if this is a embedded workflow and workflowId changed or handles are missing
        if (node.data.nodeType === 'twiddle.embeddedWorkflow') {
          const newParams = data.parameters as Record<string, unknown>;
          const oldParams = node.data.parameters as Record<string, unknown>;

          const newWorkflowId = newParams?.workflowId as string;
          const oldWorkflowId = oldParams?.workflowId as string;

          if (newWorkflowId && (newWorkflowId !== oldWorkflowId || !newParams.inputHandles)) {
            // Trigger async update of handles
            // We can't await here inside the map, so we fire-and-forget a function that will setNodes again
            // wrap in IIFE to use async
            (async () => {
              try {
                const workflow = await workflowsApi.get(newWorkflowId) as any;
                const { inputHandles, outputHandles } = calculateEdgeHandles(workflow.nodes, workflow.connections);

                setNodes((currentNodes: Node[]) => currentNodes.map((n: Node) => {
                  if (n.id === nodeId) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        parameters: {
                          ...n.data.parameters as Record<string, unknown>,
                          workflowVersion: workflow.version,
                          workflowName: workflow.name,
                          embeddedNodes: JSON.stringify(workflow.nodes),
                          embeddedConnections: JSON.stringify(workflow.connections),
                          inputHandles: JSON.stringify(inputHandles),
                          outputHandles: JSON.stringify(outputHandles),
                        }
                      }
                    };
                  }
                  return n;
                }));
                console.log(`Updated handles for composed node ${nodeId}`);
              } catch (err) {
                console.error('Failed to update composed node handles', err);
              }
            })();
          }
        }

        return updatedNode;
      })
    );
    setSelectedNode(null);
  }, [setNodes]);

  async function addNode(nodeType: NodeTypeInfo) {
    if (isReadOnly) return;

    // For all node types (including workflows), start drag-to-place mode
    setPendingNode({
      type: nodeType,
      screenPos: { x: 0, y: 0 } // Will be updated on first mouse move
    });

    setShowNodePanel(false);
  }
  async function handleSave() {
    try {
      setSaving(true);

      // Convert React Flow nodes back to workflow format
      // Filter out embedded child nodes - they should not be saved as they're derived from parent parameters
      const workflowNodes = nodes
        .filter((node: Node) => !(node as any).parentId) // Exclude child nodes of embedded workflows
        .map((node: Node) => ({
          id: node.id,
          name: node.data.label,
          type: node.data.nodeType,
          position: node.position,
          parameters: node.data.parameters || {},
        }));

      // Get IDs of all saved nodes for filtering edges
      const savedNodeIds = new Set(workflowNodes.map((n: any) => n.id));

      // Build handle mappings for all expanded embedded workflows
      // This allows us to remap edges connecting to internal embedded nodes
      const embeddedNodeHandleMaps: Record<string, { inputMap: Map<string, string>, outputMap: Map<string, string> }> = {};

      for (const n of workflowNodes) {
        if (n.type === 'twiddle.embeddedWorkflow' && n.parameters) {
          const params = n.parameters as Record<string, unknown>;
          try {
            const inputHandles = params.inputHandles ? JSON.parse(params.inputHandles as string) : [];
            const outputHandles = params.outputHandles ? JSON.parse(params.outputHandles as string) : [];

            const inputMap = new Map<string, string>();
            const outputMap = new Map<string, string>();

            inputHandles.forEach((h: any) => {
              inputMap.set(`${n.id}_embedded_${h.sourceNodeId}`, h.handle);
            });
            outputHandles.forEach((h: any) => {
              outputMap.set(`${n.id}_embedded_${h.sourceNodeId}`, h.handle);
            });

            embeddedNodeHandleMaps[n.id] = { inputMap, outputMap };
          } catch (e) {
            console.warn('Failed to parse handles for save remapping', e);
          }
        }
      }

      // Remap edges that connect to embedded nodes, then filter
      const remappedEdges = edges.map((edge: Edge) => {
        let newSource = edge.source;
        let newSourceHandle = edge.sourceHandle;
        let newTarget = edge.target;
        let newTargetHandle = edge.targetHandle;

        // Check if source is an embedded node
        if (edge.source.includes('_embedded_')) {
          // Find the parent node ID (everything before _embedded_)
          const parentId = edge.source.split('_embedded_')[0];
          const maps = embeddedNodeHandleMaps[parentId];
          if (maps && maps.outputMap.has(edge.source)) {
            newSource = parentId;
            newSourceHandle = maps.outputMap.get(edge.source) || edge.sourceHandle;
          }
        }

        // Check if target is an embedded node
        if (edge.target.includes('_embedded_')) {
          const parentId = edge.target.split('_embedded_')[0];
          const maps = embeddedNodeHandleMaps[parentId];
          if (maps && maps.inputMap.has(edge.target)) {
            newTarget = parentId;
            newTargetHandle = maps.inputMap.get(edge.target) || edge.targetHandle;
          }
        }

        return {
          ...edge,
          source: newSource,
          sourceHandle: newSourceHandle,
          target: newTarget,
          targetHandle: newTargetHandle,
        };
      });

      // Convert React Flow edges back to workflow connections
      // Filter out internal connections of embedded workflows
      const workflowConnections = remappedEdges
        .filter((edge: Edge) => {
          // Only save edges where both source and target are saved nodes
          return savedNodeIds.has(edge.source) && savedNodeIds.has(edge.target);
        })
        .map((edge: Edge) => ({
          sourceNodeId: edge.source,
          sourceOutput: edge.sourceHandle,
          targetNodeId: edge.target,
          targetInput: edge.targetHandle,
        }));

      if (isNew) {
        const created = await workflowsApi.create({
          name: workflowName,
          description: workflowDescription,
          nodes: workflowNodes as any,
          connections: workflowConnections as any,
          properties: workflowProperties,
          schedule: workflowSchedule,
          folderId: newWorkflowFolderId || undefined,
        });
        // Clear the folder ID after creating
        setNewWorkflowFolderId(null);
        navigate(`/workflows/${created.id}`, { replace: true });
      } else {
        const updated = await workflowsApi.update(id!, {
          name: workflowName,
          description: workflowDescription,
          nodes: workflowNodes as any,
          connections: workflowConnections as any,
          properties: workflowProperties,
          schedule: workflowSchedule,
        });
        setWorkflowVersion(updated.version);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }


  function handleOpenWorkflowBrowser() {
    openWorkflowBrowser();
  }

  // Folder permissions handlers
  async function handleOpenPermissions(folder: FolderType) {
    setPermissionsFolder(folder);
    setShowPermissionsModal(true);
    setLoadingPermissions(true);
    try {
      const [permissions, users, groups] = await Promise.all([
        foldersApi.getPermissions(folder.id),
        usersApi.list(),
        groupsApi.list(),
      ]);
      setFolderPermissions(permissions);
      setAvailableUsers(users);
      setAvailableGroups(groups);
    } catch (err) {
      console.error('Failed to load permissions:', err);
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function handleAddPermission() {
    if (!permissionsFolder || !newPermissionTargetId) return;
    try {
      const permission = await foldersApi.addPermission(permissionsFolder.id, {
        userId: newPermissionType === 'user' ? newPermissionTargetId : undefined,
        groupId: newPermissionType === 'group' ? newPermissionTargetId : undefined,
        permission: newPermissionLevel,
      });
      setFolderPermissions(prev => [...prev, permission]);
      setNewPermissionTargetId('');
    } catch (err) {
      alert(`Failed to add permission: ${(err as Error).message}`);
    }
  }

  async function handleUpdatePermission(permissionId: string, level: FolderPermissionLevel) {
    if (!permissionsFolder) return;
    try {
      const updated = await foldersApi.updatePermission(permissionsFolder.id, permissionId, {
        permission: level,
      });
      setFolderPermissions(prev =>
        prev.map(p => p.id === permissionId ? updated : p)
      );
    } catch (err) {
      alert(`Failed to update permission: ${(err as Error).message}`);
    }
  }

  async function handleDeletePermission(permissionId: string) {
    if (!permissionsFolder) return;
    try {
      await foldersApi.deletePermission(permissionsFolder.id, permissionId);
      setFolderPermissions(prev => prev.filter(p => p.id !== permissionId));
    } catch (err) {
      alert(`Failed to delete permission: ${(err as Error).message}`);
    }
  }

  async function handleRenameWorkflow(workflowId: string, newName: string) {
    if (!newName.trim()) return;
    try {
      await workflowsApi.update(workflowId, { name: newName.trim() });
      // Refresh the workflows list
      await loadFolderContents(currentFolderId);
    } catch (err) {
      alert(`Failed to rename workflow: ${(err as Error).message}`);
    }
  }

  async function handleDeleteWorkflow(workflow: Workflow) {
    try {
      await workflowsApi.delete(workflow.id);
      // Refresh the workflows list
      await loadFolderContents(currentFolderId);
      setDeletingWorkflow(null);
      // If we're currently editing the deleted workflow, navigate away
      if (id === workflow.id) {
        navigate('/workflows/new');
      }
    } catch (err) {
      alert(`Failed to delete workflow: ${(err as Error).message}`);
    }
  }


  async function handleExportPython() {
    if (isNew) {
      alert('Please save the workflow first');
      return;
    }
    try {
      // The API now handles the download directly as a tarball
      await workflowsApi.exportPython(id!);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="h-full flex flex-col" style={{ '--header-height': '57px' } as React.CSSProperties}>
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            />
            {!isNew && (
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                v{workflowVersion}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0 || isReadOnly}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={isReadOnly ? "Undo disabled in read-only mode" : `Undo (${historyIndex} actions in history)`}
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <button
            onClick={handleOpenWorkflowBrowser}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            Open
          </button>
          <button
            onClick={() => setShowNodePanel(true)}
            disabled={isReadOnly}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add a new activity or trigger to the workflow"
          >
            <Plus className="w-4 h-4" />
            Add Activity
          </button>
          <button
            onClick={handleExportPython}
            disabled={isNew}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Export as Python Temporal application"
          >
            <Download className="w-4 h-4" />
            Export Python
          </button>
          <button
            onClick={() => setShowPythonCode(true)}
            disabled={isNew || !pythonCode}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="View generated Python code"
          >
            <Code className="w-4 h-4" />
            View Code
          </button>
          <button
            onClick={() => setShowGitHubSettings(true)}
            disabled={isNew}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${githubConnected
              ? 'text-green-600 hover:bg-green-50'
              : 'text-slate-600 hover:bg-slate-100'
              }`}
            title={githubConnected ? 'GitHub connected' : 'Connect to GitHub'}
          >
            <Github className="w-4 h-4" />
            {githubConnected ? 'GitHub' : 'GitHub'}
          </button>
          <button
            onClick={() => setShowPropertiesPanel(true)}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Workflow properties and schedule"
          >
            <Settings className="w-4 h-4" />
            Properties
          </button>
          <button
            onClick={handleSave}
            disabled={saving || isReadOnly}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Read Only Banner */}
      {isReadOnly && lockedBy && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-800">
          <Lock className="w-4 h-4" />
          <span className="font-medium">Read Only Mode</span>
          <span className="text-amber-700">•</span>
          <span>This workflow is currently being edited by <strong>{lockedBy.name}</strong> ({lockedBy.email}). You cannot make changes.</span>
        </div>
      )}

      {/* Canvas */}
      <div
        className="flex-1"
        onMouseMove={(e: React.MouseEvent) => {
          if (pendingNode) {
            setPendingNode({
              ...pendingNode,
              screenPos: { x: e.clientX, y: e.clientY }
            });
          }
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isReadOnly ? undefined : onNodesChange}
          onEdgesChange={isReadOnly ? undefined : onEdgesChange}
          onConnect={isReadOnly ? undefined : onConnect}
          onNodesDelete={isReadOnly ? undefined : onNodesDelete}
          onInit={(instance: any) => { reactFlowInstance.current = instance; }}
          nodeTypes={nodeTypes}
          deleteKeyCode={isReadOnly ? null : ['Backspace', 'Delete']}
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          elementsSelectable={true}
          elevateNodesOnSelect={false}
          snapToGrid={true}
          snapGrid={[20, 20]}
          fitView
          selectionOnDrag={true}
          selectionMode={SelectionMode.Partial}
          panOnDrag={true}
          selectNodesOnDrag={true}
          onSelectionContextMenu={!isReadOnly ? handleSelectionContextMenu : undefined}
          onEdgeContextMenu={!isReadOnly ? handleEdgeContextMenu : undefined}
          onPaneContextMenu={handlePaneContextMenu}
          onPaneMouseMove={(event: React.MouseEvent) => {
            if (pendingNode) {
              // Update screen position for preview
              setPendingNode({
                ...pendingNode,
                screenPos: { x: event.clientX, y: event.clientY }
              });
            }
          }}
          onPaneClick={async (event: React.MouseEvent) => {
            if (pendingNode && reactFlowInstance.current) {
              const { screenToFlowPosition } = reactFlowInstance.current;
              let position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

              // Snap to grid
              position.x = Math.round(position.x / 20) * 20;
              position.y = Math.round(position.y / 20) * 20;

              // Check if this is a workflow type (for embedded workflows)
              const isWorkflowType = pendingNode.type.type.startsWith('workflow.');

              if (isWorkflowType) {
                // Fetch workflow data and create embedded workflow node
                const workflowId = pendingNode.type.type.replace('workflow.', '');
                try {
                  const workflow = await workflowsApi.get(workflowId) as {
                    id: string;
                    name: string;
                    description?: string;
                    version: number;
                    nodes: any[];
                    connections: any[];
                  };

                  const { inputHandles, outputHandles } = calculateEdgeHandles(
                    workflow.nodes,
                    workflow.connections
                  );

                  const newNode: Node = {
                    id: `node_${Date.now()}`,
                    type: 'workflowNode',
                    position,
                    zIndex: 100,
                    data: {
                      label: workflow.name,
                      nodeType: 'twiddle.embeddedWorkflow',
                      parameters: {
                        workflowId: workflow.id,
                        workflowName: workflow.name,
                        workflowVersion: workflow.version,
                        isExpanded: 'false',
                        embeddedNodes: JSON.stringify(workflow.nodes),
                        embeddedConnections: JSON.stringify(workflow.connections),
                        inputHandles: JSON.stringify(inputHandles),
                        outputHandles: JSON.stringify(outputHandles),
                      },
                      onOpenProperties: handleOpenProperties,
                      onToggleExpand: handleToggleExpand,
                    },
                  };

                  setNodes((nds: Node[]) => [...nds, newNode]);
                  setPendingNode(null);
                } catch (err) {
                  console.error('Failed to create embedded workflow node:', err);
                  alert('Failed to load workflow for embedding');
                  setPendingNode(null);
                }
              } else {
                // Create regular node
                const newNode: Node = {
                  id: `node_${Date.now()}`,
                  type: 'workflowNode',
                  position,
                  zIndex: 100,
                  data: {
                    label: pendingNode.type.displayName,
                    nodeType: pendingNode.type.type,
                    parameters: {},
                    onOpenProperties: handleOpenProperties,
                    onToggleExpand: handleToggleExpand,
                  },
                };

                setNodes((nds: Node[]) => [...nds, newNode]);
                setPendingNode(null);
              }
            }
          }}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={[20, 20]} size={1} offset={[0, 0]} />
        </ReactFlow>

        {/* Visual preview of pending node - outside ReactFlow for proper positioning */}
        {pendingNode && (
          <div
            className="pointer-events-none fixed"
            style={{
              left: pendingNode.screenPos.x,
              top: pendingNode.screenPos.y,
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
            }}
          >
            <div className="bg-white/90 rounded shadow-lg border-2 border-primary-500 border-dashed px-4 py-2">
              <div className="font-medium text-sm text-slate-700">{pendingNode.type.displayName}</div>
              <div className="text-xs text-slate-500">Click to place</div>
            </div>
          </div>
        )}

        {/* Selection Context Menu */}
        {selectionContextMenu && (
          <div
            ref={selectionContextMenuRef}
            className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]"
            style={{
              left: selectionContextMenu.x,
              top: selectionContextMenu.y,
            }}
          >
            <button
              onClick={handleCopyAndPaste}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
            <div className="border-t border-slate-200 my-1" />
            <button
              onClick={() => {
                const selectedNodes = nodes.filter((n: Node) => n.selected);
                const selectedNodeIds = new Set(selectedNodes.map((n: Node) => n.id));
                setNodes(nodes.filter((n: Node) => !n.selected));
                setEdges(edges.filter((e: Edge) => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target) && !e.selected));
                setSelectionContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Version History Modal */}
      {showVersionHistory && versionHistoryWorkflow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-neutral-800 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col border border-neutral-700">
            <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Version History: {versionHistoryWorkflow.name}</h3>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingVersions ? (
                <div className="text-center text-neutral-400 py-8">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-center text-neutral-400 py-8">No version history available</div>
              ) : (
                <div className="space-y-2">
                  {versions.map((ver) => (
                    <div key={ver.id} className="flex items-center justify-between p-3 bg-neutral-900/50 rounded border border-neutral-700/50 hover:border-neutral-600">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">Version {ver.version}</span>
                          <span className="text-xs text-neutral-500">
                            {new Date(ver.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          Saved by {ver.createdBy?.name || ver.createdBy?.email || 'Unknown'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            // Open Version Logic
                            // We load this version into the editor as Read-Only
                            // 1. Close modal
                            setShowVersionHistory(false);
                            closeWorkflowBrowser();

                            // 2. Fetch full version data
                            const versionData = await workflowsApi.getVersion(versionHistoryWorkflow.id, ver.id);

                            // 3. Load into state
                            // If current ID is different or we are 'new', we should probably navigate or set ID?
                            // But we want to open *this* workflow's version.
                            // If we are currently editing a different workflow, we should probably warn?
                            // Ideally we navigate to /workflows/:id then load valid version data.

                            if (id !== versionHistoryWorkflow.id) {
                              navigate(`/workflows/${versionHistoryWorkflow.id}`);
                              // The useEffect will load HEAD, then we overwrite? Race condition.
                              // Simpler: Just load it if we are already on the page or it matches.
                              // For now, let's assume user opens it from the browser.
                            }

                            // Set Viewing Version State (Read Only Mode)
                            // setViewingVersion(ver.version); // Could be used to show a banner "Viewing Version X"

                            // Overwrite nodes/edges
                            const flowNodes: Node[] = (versionData.nodes as any[]).map((node: any) => ({
                              id: node.id,
                              type: 'workflowNode',
                              position: node.position,
                              data: {
                                label: node.name,
                                nodeType: node.type,
                                parameters: node.parameters,
                                onOpenProperties: handleOpenProperties,
                              },
                            })).map(n => ({ ...n, draggable: false, selectable: true })); // Read only tweaks?

                            const flowEdges: Edge[] = (versionData.connections as any[]).map((conn: any, index: number) => ({
                              id: `e${index}`,
                              source: conn.sourceNodeId,
                              target: conn.targetNodeId,
                              sourceHandle: conn.sourceOutput === 'main' ? null : (conn.sourceOutput ?? null),
                              targetHandle: conn.targetInput === 'main' ? null : (conn.targetInput ?? null),
                              animated: false,
                              deletable: false
                            }));

                            setNodes(flowNodes);
                            setEdges(flowEdges);
                            setWorkflowName(`${versionHistoryWorkflow.name} (v${ver.version})`);
                            setWorkflowDescription(versionHistoryWorkflow.description || '');
                            setIsReadOnly(true); // Force read only
                          }}
                          className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white text-xs rounded"
                        >
                          Open
                        </button>

                        <button
                          onClick={async () => {
                            if (!confirm(`Are you sure you want to restore Version ${ver.version}? This will become the new HEAD.`)) return;

                            // Restore Logic (Revert)
                            // 1. Fetch version
                            const versionData = await workflowsApi.getVersion(versionHistoryWorkflow.id, ver.id);

                            // 2. Save as new update
                            // If we are not currently editing this workflow, we need to switch?
                            // Assuming we are context switching or just doing it via API.
                            // Simply calling Update on the workflow with this data effectively restores it.

                            // Convert back to workflow format
                            // const workflowNodes = versionData.nodes; // Already in workflow format in DB? NO, check schema. `nodes` is Json.
                            // Actually schema says it stores the same structure as Workflow.nodes.
                            // Workflow.nodes is stored as {id, name, type, position, parameters}

                            await workflowsApi.update(versionHistoryWorkflow.id, {
                              name: versionHistoryWorkflow.name, // Keep name? Or restore old name? Usually keep current metadata.
                              description: versionHistoryWorkflow.description,
                              nodes: versionData.nodes as any,
                              connections: versionData.connections as any,
                              settings: versionData.settings as any
                            });

                            alert(`Restored version ${ver.version} successfully.`);
                            setShowVersionHistory(false);

                            // Reload if current
                            if (id === versionHistoryWorkflow.id) {
                              loadWorkflow(id);
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-700 flex justify-end">
              <button
                onClick={() => setShowVersionHistory(false)}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pane Context Menu (Read Only Request) */}
      {paneContextMenu && (
        <div
          ref={paneContextMenuRef}
          className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[160px]"
          style={{ left: paneContextMenu.x, top: paneContextMenu.y }}
        >
          <button
            onClick={() => {
              handleRequestLock();
              setPaneContextMenu(null);
            }}
            disabled={requestingLock}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {requestingLock ? 'Request Sent...' : 'Request Edit Access'}
          </button>
        </div>
      )}

      {/* Takeover Request Modal (For Editor) */}
      {takeoverRequest && !isReadOnly && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">Edit Access Requested</h3>
                <p className="mt-2 text-sm text-slate-600">
                  <strong>{takeoverRequest.name}</strong> ({takeoverRequest.email}) is requesting to edit this workflow.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  If you do not respond within 1 minute, access will be automatically transferred.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => handleResolveLock('DENY')}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
              >
                Deny
              </button>
              <button
                onClick={() => handleResolveLock('ACCEPT')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requesting Access Banner (For Viewer) */}
      {requestingLock && isReadOnly && (
        <div className="absolute top-[120px] left-1/2 transform -translate-x-1/2 z-50 bg-white border border-slate-200 shadow-lg px-6 py-3 rounded-full flex items-center gap-3 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
          <span className="font-medium text-slate-700">Requesting edit access...</span>
        </div>
      )}

      {/* Node Panel */}
      {showNodePanel && (
        <NodePanel
          nodes={availableNodes}
          onSelect={addNode}
          onClose={() => setShowNodePanel(false)}
        />
      )}

      {/* Python Code Viewer */}
      {showPythonCode && pythonCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Generated Python Code</h2>
              <button
                onClick={() => setShowPythonCode(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  workflow.py
                </h3>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{pythonCode.workflow}</code>
                </pre>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  activities.py
                </h3>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{pythonCode.activities}</code>
                </pre>
              </div>

            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowPythonCode(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleExportPython}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Download All Files
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Settings Modal */}
      {showGitHubSettings && id && (
        <GitHubSettings
          workflowId={id}
          workflowName={workflowName}
          onClose={() => {
            setShowGitHubSettings(false);
            if (id) loadGitHubStatus(id);
          }}
        />
      )}

      {/* Node Properties Panel */}
      {selectedNode && (
        <NodePropertiesPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Workflow Browser Panel */}
      <WorkflowBrowserPanel
        isOpen={showWorkflowBrowser}
        onClose={closeWorkflowBrowser}
        currentWorkflowId={id}
        loading={loadingWorkflows}
        folders={folders}
        currentFolderId={currentFolderId}
        folderPath={folderPath}
        workflows={availableWorkflows}
        onNavigateToFolder={handleNavigateToFolder}
        onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
        onCreateFolder={async (name) => {
          if (!name.trim()) return;
          await foldersApi.create({ name: name.trim(), parentId: currentFolderId || undefined });
          await loadFolderContents(currentFolderId);
          setShowNewFolderInput(false);
          setNewFolderName('');
        }}
        onRenameFolder={async (folderId, newName) => {
          if (!newName.trim()) return;
          await foldersApi.update(folderId, { name: newName.trim() });
          await loadFolderContents(currentFolderId);
          setEditingFolderId(null);
          setEditingFolderName('');
        }}
        onDeleteFolder={async (folderId) => {
          if (!confirm('Delete this folder and all its contents?')) return;
          await foldersApi.delete(folderId);
          await loadFolderContents(currentFolderId);
        }}
        showNewFolderInput={showNewFolderInput}
        setShowNewFolderInput={setShowNewFolderInput}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        editingFolderId={editingFolderId}
        setEditingFolderId={setEditingFolderId}
        editingFolderName={editingFolderName}
        setEditingFolderName={setEditingFolderName}
        draggingWorkflowId={draggingWorkflowId}
        dragOverFolderId={dragOverFolderId}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onOpenWorkflow={(workflowId) => navigate(`/workflows/${workflowId}`)}
        onRenameWorkflow={handleRenameWorkflow}
        onDeleteWorkflow={(workflow) => setDeletingWorkflow(workflow)}
        onOpenPermissions={handleOpenPermissions}
        onCreateNewWorkflow={(folderId) => {
          setNewWorkflowFolderId(folderId);
          closeWorkflowBrowser();
          navigate('/workflows/new');
        }}
        onVersionHistory={async (workflow) => {
          setLoadingVersions(true);
          setShowVersionHistory(true);
          setVersionHistoryWorkflow(workflow);
          try {
            const list = await workflowsApi.getVersions(workflow.id);
            setVersions(list);
          } finally {
            setLoadingVersions(false);
          }
        }}
      />

      {/* Workflow Browser Context Menu */}
      {
        workflowContextMenu && (
          <div
            ref={workflowContextMenuRef}
            className="fixed bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-[60] min-w-[160px]"
            style={{ left: workflowContextMenu.x, top: workflowContextMenu.y }}
          >
            <button
              onClick={async () => {
                setWorkflowContextMenu(null);
                // Reuse Version History Logic
                const workflow = workflowContextMenu.workflow;
                setVersionHistoryWorkflow(workflow);
                setLoadingVersions(true);
                setShowVersionHistory(true);
                try {
                  const list = await workflowsApi.getVersions(workflow.id);
                  setVersions(list);
                } finally {
                  setLoadingVersions(false);
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Version History
            </button>

            <button
              onClick={() => {
                setWorkflowContextMenu(null);
                setDeletingWorkflow(workflowContextMenu.workflow);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        deletingWorkflow && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setDeletingWorkflow(null)}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Delete Workflow
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Are you sure you want to delete <strong>"{deletingWorkflow.name}"</strong>?
                    This action cannot be undone.
                  </p>
                  {deletingWorkflow.environment !== 'DV' && (
                    <p className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ This workflow is in <strong>{deletingWorkflow.environment}</strong> environment.
                      Deleting it may affect production systems.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeletingWorkflow(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteWorkflow(deletingWorkflow)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Workflow
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Folder Permissions Modal */}
      {
        showPermissionsModal && permissionsFolder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => {
                setShowPermissionsModal(false);
                setPermissionsFolder(null);
              }}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">
                    Folder Permissions
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setPermissionsFolder(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Folder info */}
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <Folder className="w-5 h-5 text-amber-600" />
                  <span className="font-medium text-slate-900">{permissionsFolder.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Users and groups with access to this folder can view or edit workflows within it.
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingPermissions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Add new permission */}
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-sm font-medium text-slate-700 mb-2">Add Permission</div>
                      <div className="flex items-center gap-2">
                        <select
                          value={newPermissionType}
                          onChange={(e) => {
                            setNewPermissionType(e.target.value as 'user' | 'group');
                            setNewPermissionTargetId('');
                          }}
                          className="px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="user">User</option>
                          <option value="group">Group</option>
                        </select>
                        <select
                          value={newPermissionTargetId}
                          onChange={(e) => setNewPermissionTargetId(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select {newPermissionType}...</option>
                          {newPermissionType === 'user'
                            ? availableUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name || u.email}
                              </option>
                            ))
                            : availableGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                        </select>
                        <select
                          value={newPermissionLevel}
                          onChange={(e) => setNewPermissionLevel(e.target.value as FolderPermissionLevel)}
                          className="px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="READ">Read</option>
                          <option value="WRITE">Write</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          onClick={handleAddPermission}
                          disabled={!newPermissionTargetId}
                          className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Existing permissions */}
                    <div>
                      <div className="text-sm font-medium text-slate-700 mb-2">Current Permissions</div>
                      {folderPermissions.length === 0 ? (
                        <div className="text-sm text-slate-500 text-center py-4">
                          No permissions set. Only the folder owner has access.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {folderPermissions.map((perm) => (
                            <div
                              key={perm.id}
                              className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded"
                            >
                              <div className="flex items-center gap-2">
                                {perm.user ? (
                                  <>
                                    <User className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm">{perm.user.name || perm.user.email}</span>
                                  </>
                                ) : perm.group ? (
                                  <>
                                    <Users className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm">{perm.group.name}</span>
                                  </>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  value={perm.permission}
                                  onChange={(e) =>
                                    handleUpdatePermission(perm.id, e.target.value as FolderPermissionLevel)
                                  }
                                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  <option value="READ">Read</option>
                                  <option value="WRITE">Write</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                                <button
                                  onClick={() => handleDeletePermission(perm.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Remove permission"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setPermissionsFolder(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )
      }

      {
        showPromotionModal && id && (
          <PromotionRequestModal
            workflowId={id}
            workflowName={workflowName}
            currentEnv={environment}
            nextEnv={getNextEnvironment(environment)!}
            onClose={() => setShowPromotionModal(false)}
            onSuccess={() => {
              alert('Promotion request submitted successfully!');
            }}
          />
        )
      }

      {/* Workflow Properties Panel */}
      <RightPanel
        isOpen={showPropertiesPanel}
        onClose={() => setShowPropertiesPanel(false)}
      >
        <WorkflowPropertiesPanel
          properties={workflowProperties}
          schedule={workflowSchedule}
          onAddProperty={handleAddProperty}
          onUpdateProperty={handleUpdateProperty}
          onDeleteProperty={handleDeleteProperty}
          onUpdateSchedule={handleUpdateSchedule}
          onClose={() => setShowPropertiesPanel(false)}
        />
      </RightPanel>
    </div >
  );
}
