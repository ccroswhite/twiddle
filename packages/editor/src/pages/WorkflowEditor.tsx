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
import { Save, Plus, Download, Code, X, Github, ChevronRight, FolderOpen, User, Users, Clock, Trash2, Pencil, Check, Folder, FolderPlus, Shield, GripVertical, Undo2, Copy, Lock } from 'lucide-react';
import { workflowsApi, nodesApi, githubApi, credentialsApi, foldersApi, groupsApi, usersApi, type Workflow, type Folder as FolderType, type FolderPermission, type FolderPermissionLevel } from '@/lib/api';
import { WorkflowNode } from '@/components/WorkflowNode';
import { NodePanel } from '@/components/NodePanel';
import { NodePropertiesPanel } from '@/components/NodePropertiesPanel';
import { GitHubSettings } from '@/components/GitHubSettings';
import { EnvironmentBadge, getNextEnvironment, type Environment } from '@/components/EnvironmentBadge';
import { PromotionRequestModal } from '@/components/PromotionRequestModal';


interface NodeTypeInfo {
  type: string;
  displayName: string;
  description: string;
  icon?: string;
  iconColor?: string;
  category: string;
}

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
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [showPythonCode, setShowPythonCode] = useState(false);
  const [showGitHubSettings, setShowGitHubSettings] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [pythonCode, setPythonCode] = useState<{ workflow: string; activities: string } | null>(null);
  const [availableNodes, setAvailableNodes] = useState<NodeTypeInfo[]>([]);
  const [environment, setEnvironment] = useState<Environment>('DV');

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showWorkflowBrowser, setShowWorkflowBrowser] = useState(false);
  const [isClosingBrowser, setIsClosingBrowser] = useState(false);
  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingWorkflowName, setEditingWorkflowName] = useState('');
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);
  const [versionHistoryWorkflow, setVersionHistoryWorkflow] = useState<Workflow | null>(null);

  // Locking state
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [lockedBy, setLockedBy] = useState<{ id: string; name: string; email: string; isMe: boolean } | null>(null);
  const [takeoverRequest, setTakeoverRequest] = useState<{ userId: string; name: string; email: string; requestedAt: string } | null>(null);
  const [requestingLock, setRequestingLock] = useState(false);

  // Folder state
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderType[]>([]);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Drag and drop state
  const [draggingWorkflowId, setDraggingWorkflowId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

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
  const MAX_HISTORY = 30;
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoing = useRef(false);

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
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
    }
  };

  const handleOpenProperties = useCallback((nodeId: string) => {
    handleOpenPropertiesRef.current?.(nodeId);
  }, []);

  // Callback for toggling expand state of composed workflow nodes
  const handleToggleExpandRef = useRef<(nodeId: string) => void>(undefined);
  handleToggleExpandRef.current = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.data.nodeType !== 'twiddle.composedWorkflow') return;

    const parameters = (node.data.parameters || {}) as Record<string, any>;
    const isExpanded = parameters.isExpanded === 'true';

    if (isExpanded) {
      // Collapse: Remove all embedded child nodes
      setNodes((nds) =>
        nds.filter((n) => !(n as any).parentId || (n as any).parentId !== nodeId).map((n) =>
          n.id === nodeId
            ? {
              ...n,
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

      // Remove internal connections
      setEdges((eds) => eds.filter((e) => !e.id.startsWith(`${nodeId}_embedded_`)));
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
      setNodes((nds) => [
        ...nds.map((n) =>
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

      // Add edges in separate update
      setEdges((eds) => [...eds, ...internalEdges]);
    }
  };

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
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length > 0) {
      event.preventDefault();
      setSelectionContextMenu({ x: event.clientX, y: event.clientY });
    }
  }, [nodes]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    if (isReadOnly) {
      event.preventDefault();
      setPaneContextMenu({ x: event.clientX, y: event.clientY });
    }
  }, [isReadOnly]);

  // Copy and paste selected nodes with offset
  const handleCopyAndPaste = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected);
    if (selectedNodes.length === 0) return;

    // Get edges that connect selected nodes
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const selectedEdges = edges.filter(
      edge => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );

    // Generate new IDs and offset positions
    const idMap = new Map<string, string>();
    const offset = { x: 50, y: 50 };

    const newNodes = selectedNodes.map(node => {
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
    const newEdges = selectedEdges.map(edge => ({
      ...edge,
      id: `e-${idMap.get(edge.source)}-${idMap.get(edge.target)}`,
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }));

    // Deselect existing nodes and add new ones
    setNodes(prev => [
      ...prev.map(n => ({ ...n, selected: false })),
      ...newNodes,
    ]);
    setEdges(prev => [...prev, ...newEdges]);
    setSelectionContextMenu(null);
  }, [nodes, edges, handleOpenProperties, setNodes, setEdges]);

  // Track changes to nodes and edges for undo history
  const prevNodesRef = useRef<string>('');
  const prevEdgesRef = useRef<string>('');

  useEffect(() => {
    if (isUndoing.current) return;

    const nodesJson = JSON.stringify(nodes.map(n => ({ id: n.id, position: n.position, data: { label: n.data.label, nodeType: n.data.nodeType, parameters: n.data.parameters } })));
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
          handleCloseWorkflowBrowser();
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

  // Helper to get friendly credential type labels
  function getCredentialTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      httpBasicAuth: 'HTTP Basic Auth',
      httpBearerToken: 'HTTP Bearer Token',
      apiKey: 'API Key',
      oauth2: 'OAuth2',
      githubCredentials: 'GitHub',
      sshCredentials: 'SSH',
      winrmCredentials: 'WinRM',
      postgresqlCredentials: 'PostgreSQL',
      mysqlCredentials: 'MySQL',
      mssqlCredentials: 'SQL Server',
      redisCredentials: 'Redis',
      valkeyCredentials: 'Valkey',
      cassandraCredentials: 'Cassandra',
      opensearchCredentials: 'OpenSearch',
      elasticsearchCredentials: 'Elasticsearch',
      snowflakeCredentials: 'Snowflake',
      prestodbCredentials: 'PrestoDB',
    };
    return labels[type] || type;
  }

  async function loadWorkflow(workflowId: string) {
    try {
      const workflow = await workflowsApi.get(workflowId) as {
        name: string;
        description?: string;
        nodes: unknown[];
        connections: unknown[];
        pythonWorkflow?: string;
        pythonActivities?: string;
        environment?: Environment;
        lockedBy?: { id: string; name: string; email: string; isMe: boolean };
      };
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      setEnvironment(workflow.environment || 'DV');

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

      // Convert workflow nodes to React Flow nodes
      const flowNodes = (workflow.nodes as Array<{
        id: string;
        name: string;
        type: string;
        position: { x: number; y: number };
        parameters: Record<string, unknown>;
      }>).map((node) => {
        // For composed workflows, ensure they load collapsed
        let parameters = node.parameters;
        if (node.type === 'twiddle.composedWorkflow' && parameters) {
          parameters = {
            ...parameters,
            isExpanded: 'false', // Always load composed workflows collapsed
          };
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
      // Also handle legacy 'main' values from older saves
      const flowEdges: Edge[] = (workflow.connections as Array<{
        sourceNodeId: string;
        sourceOutput?: string | null;
        targetNodeId: string;
        targetInput?: string | null;
      }>).map((conn, index) => ({
        id: `e${index}`,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceOutput === 'main' ? null : (conn.sourceOutput ?? null),
        targetHandle: conn.targetInput === 'main' ? null : (conn.targetInput ?? null),
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
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
      nds.map((node) =>
        node.id === nodeId ? { ...node, data } : node
      )
    );
    setSelectedNode(null);
  }, [setNodes]);

  async function addNode(nodeType: NodeTypeInfo) {
    if (isReadOnly) return;

    // Check if this is a workflow type (for composed workflows)
    const isWorkflowType = nodeType.type.startsWith('workflow.');

    // Calculate position at the center of the current viewport
    let position = { x: 250, y: 100 };

    if (reactFlowInstance.current) {
      const { getViewport } = reactFlowInstance.current;
      const viewport = getViewport();

      // Get the center of the visible area in flow coordinates
      const canvasElement = document.querySelector('.react-flow');
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Convert screen coordinates to flow coordinates
        position = {
          x: (centerX - viewport.x) / viewport.zoom,
          y: (centerY - viewport.y) / viewport.zoom,
        };

        // Snap to grid (20px)
        position.x = Math.round(position.x / 20) * 20;
        position.y = Math.round(position.y / 20) * 20;
      }
    }

    if (isWorkflowType) {
      // Extract workflow ID from the type string (format: workflow.{id})
      const workflowId = nodeType.type.replace('workflow.', '');

      try {
        // Fetch the workflow details to get nodes and connections
        const workflow = await workflowsApi.get(workflowId) as {
          id: string;
          name: string;
          description?: string;
          version: number;
          nodes: any[];
          connections: any[];
        };

        // Calculate edge handles (input/output connection points)
        const { inputHandles, outputHandles } = calculateEdgeHandles(
          workflow.nodes,
          workflow.connections
        );

        // Create composed workflow node
        const newNode: Node = {
          id: `node_${Date.now()}`,
          type: 'workflowNode',
          position,
          data: {
            label: workflow.name,
            nodeType: 'twiddle.composedWorkflow',
            parameters: {
              workflowId: workflow.id,
              workflowName: workflow.name,
              workflowVersion: workflow.version,
              isExpanded: 'false', // Always start collapsed
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
      } catch (err) {
        console.error('Failed to create composed workflow node:', err);
        alert('Failed to load workflow for embedding');
      }
    } else {
      // Regular node creation
      const newNode: Node = {
        id: `node_${Date.now()}`,
        type: 'workflowNode',
        position,
        data: {
          label: nodeType.displayName,
          nodeType: nodeType.type,
          parameters: {},
          onOpenProperties: handleOpenProperties,
          onToggleExpand: handleToggleExpand,
        },
      };
      setNodes((nds: Node[]) => [...nds, newNode]);
    }

    setShowNodePanel(false);
  }

  // Helper function to calculate edge handles from embedded workflow DAG
  function calculateEdgeHandles(nodes: any[], connections: any[]) {
    const inputHandles: any[] = [];
    const outputHandles: any[] = [];

    // Build a map of node IDs to their connections
    const nodeInputs = new Map<string, Set<string>>();
    const nodeOutputs = new Map<string, Set<string>>();

    nodes.forEach(node => {
      nodeInputs.set(node.id, new Set());
      nodeOutputs.set(node.id, new Set());
    });

    connections.forEach(conn => {
      nodeOutputs.get(conn.sourceNodeId)?.add(conn.sourceOutput || 'main');
      nodeInputs.get(conn.targetNodeId)?.add(conn.targetInput || 'main');
    });

    // Find edge nodes (nodes with unconnected handles)
    nodes.forEach(node => {
      // Check for unconnected input handles (potential input edges)
      // For simplicity, we'll expose the first input if it has no incoming connections
      const hasIncomingConnections = connections.some(c => c.targetNodeId === node.id);
      if (!hasIncomingConnections) {
        inputHandles.push({
          handle: `${node.id}_main`,
          label: node.name || 'Input',
          sourceNodeId: node.id,
          sourceHandle: 'main',
        });
      }

      // Check for unconnected output handles (potential output edges)
      const hasOutgoingConnections = connections.some(c => c.sourceNodeId === node.id);
      if (!hasOutgoingConnections) {
        outputHandles.push({
          handle: `${node.id}_main`,
          label: node.name || 'Output',
          sourceNodeId: node.id,
          sourceHandle: 'main',
        });
      }
    });

    return { inputHandles, outputHandles };
  }

  async function handleSave() {
    try {
      setSaving(true);

      // Convert React Flow nodes back to workflow format
      // Filter out embedded child nodes - they should not be saved as they're derived from parent parameters
      const workflowNodes = nodes
        .filter((node: Node) => !(node as any).parentId) // Exclude child nodes of composed workflows
        .map((node: Node) => ({
          id: node.id,
          name: node.data.label,
          type: node.data.nodeType,
          position: node.position,
          parameters: node.data.parameters || {},
        }));

      // Get IDs of all saved nodes for filtering edges
      const savedNodeIds = new Set(workflowNodes.map(n => n.id));

      // Convert React Flow edges back to workflow connections
      // Filter out internal connections of embedded workflows
      const workflowConnections = edges
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
          nodes: workflowNodes,
          connections: workflowConnections,
          folderId: newWorkflowFolderId || undefined,
        });
        // Clear the folder ID after creating
        setNewWorkflowFolderId(null);
        navigate(`/workflows/${created.id}`, { replace: true });
      } else {
        await workflowsApi.update(id!, {
          name: workflowName,
          description: workflowDescription,
          nodes: workflowNodes,
          connections: workflowConnections,
        });
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePromote() {
    if (isNew || !id) return;

    const nextEnv = getNextEnvironment(environment);
    if (!nextEnv) {
      alert('Workflow is already at Production (PD)');
      return;
    }

    setShowPromotionModal(true);
  }

  function handleOpenWorkflowBrowser() {
    setIsClosingBrowser(false);
    setShowWorkflowBrowser(true);
    setCurrentFolderId(null);
    setFolderPath([]);
    loadFolderContents(null);
  }

  function handleCloseWorkflowBrowser() {
    setIsClosingBrowser(true);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      setShowWorkflowBrowser(false);
      setIsClosingBrowser(false);
    }, 200); // Match animation duration
  }

  async function loadFolderContents(folderId: string | null) {
    try {
      setLoadingWorkflows(true);
      const [foldersData, workflowsData] = await Promise.all([
        foldersApi.list(folderId || undefined),
        workflowsApi.list(),
      ]);
      setFolders(foldersData);
      // Filter workflows to show only those in the current folder (or root)
      const filteredWorkflows = workflowsData.filter(w =>
        folderId ? w.folderId === folderId : !w.folderId
      );
      setAvailableWorkflows(filteredWorkflows);
    } catch (err) {
      console.error('Failed to load folder contents:', err);
    } finally {
      setLoadingWorkflows(false);
    }
  }

  async function handleNavigateToFolder(folder: FolderType) {
    setCurrentFolderId(folder.id);
    setFolderPath(prev => [...prev, folder]);
    await loadFolderContents(folder.id);
  }

  async function handleNavigateToBreadcrumb(index: number) {
    if (index === -1) {
      // Navigate to root
      setFolderPath([]);
      setCurrentFolderId(null);
      await loadFolderContents(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      const folder = newPath[newPath.length - 1];
      setFolderPath(newPath);
      setCurrentFolderId(folder?.id || null);
      await loadFolderContents(folder?.id || null);
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const folder = await foldersApi.create({
        name: newFolderName.trim(),
        parentId: currentFolderId || undefined,
      });
      setFolders(prev => [...prev, folder]);
      setNewFolderName('');
      setShowNewFolderInput(false);
    } catch (err) {
      alert(`Failed to create folder: ${(err as Error).message}`);
    }
  }

  async function handleRenameFolder(folderId: string, newName: string) {
    if (!newName.trim()) return;
    try {
      await foldersApi.update(folderId, { name: newName.trim() });
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName.trim() } : f));
      setEditingFolderId(null);
      setEditingFolderName('');
    } catch (err) {
      alert(`Failed to rename folder: ${(err as Error).message}`);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('Are you sure you want to delete this folder? It must be empty.')) return;
    try {
      await foldersApi.delete(folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
    } catch (err) {
      alert(`Failed to delete folder: ${(err as Error).message}`);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e: React.DragEvent, workflowId: string) {
    e.dataTransfer.setData('workflowId', workflowId);
    setDraggingWorkflowId(workflowId);
  }

  function handleDragEnd() {
    setDraggingWorkflowId(null);
    setDragOverFolderId(null);
  }

  function handleDragOver(e: React.DragEvent, folderId: string | null) {
    e.preventDefault();
    setDragOverFolderId(folderId);
  }

  function handleDragLeave() {
    setDragOverFolderId(null);
  }

  async function handleDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    const workflowId = e.dataTransfer.getData('workflowId');
    if (!workflowId) return;

    try {
      if (targetFolderId) {
        // Move to folder
        await foldersApi.addWorkflow(targetFolderId, workflowId);
      } else if (currentFolderId) {
        // Move to root (remove from current folder)
        await foldersApi.removeWorkflow(currentFolderId, workflowId);
      }
      // Refresh the folder contents
      await loadFolderContents(currentFolderId);
    } catch (err) {
      alert(`Failed to move workflow: ${(err as Error).message}`);
    } finally {
      setDraggingWorkflowId(null);
      setDragOverFolderId(null);
    }
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
      setAvailableWorkflows(workflows =>
        workflows.map(w => w.id === workflowId ? { ...w, name: newName.trim() } : w)
      );
      setEditingWorkflowId(null);
      setEditingWorkflowName('');
    } catch (err) {
      alert(`Failed to rename workflow: ${(err as Error).message}`);
    }
  }

  async function handleDeleteWorkflow(workflow: Workflow) {
    try {
      await workflowsApi.delete(workflow.id);
      setAvailableWorkflows(workflows => workflows.filter(w => w.id !== workflow.id));
      setDeletingWorkflow(null);
      // If we're currently editing the deleted workflow, navigate away
      if (id === workflow.id) {
        navigate('/workflows/new');
      }
    } catch (err) {
      alert(`Failed to delete workflow: ${(err as Error).message}`);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
          />
          {!isNew && (
            <div className="flex items-center gap-2 ml-2">
              <EnvironmentBadge environment={environment} />
              {getNextEnvironment(environment) && (
                <button
                  onClick={handlePromote}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-50"
                  title={`Request promotion to ${getNextEnvironment(environment)}`}
                >
                  <ChevronRight className="w-3 h-3" />
                  {`Request ${getNextEnvironment(environment)}`}
                </button>
              )}
            </div>
          )}
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
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isReadOnly ? undefined : onNodesChange}
          onEdgesChange={isReadOnly ? undefined : onEdgesChange}
          onConnect={isReadOnly ? undefined : onConnect}
          onNodesDelete={isReadOnly ? undefined : onNodesDelete}
          onInit={(instance) => { reactFlowInstance.current = instance; }}
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
          panOnDrag={[1, 2]}
          selectNodesOnDrag={true}
          onSelectionContextMenu={!isReadOnly ? handleSelectionContextMenu : undefined}
          onPaneContextMenu={handlePaneContextMenu}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={[20, 20]} size={1} offset={[0, 0]} />
        </ReactFlow>

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
                const selectedNodes = nodes.filter(n => n.selected);
                const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
                setNodes(nodes.filter(n => !n.selected));
                setEdges(edges.filter(e => !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)));
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
                            setShowWorkflowBrowser(false);

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
      {showWorkflowBrowser && (
        <div className="absolute inset-0 top-[57px] z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/20 transition-opacity duration-200 ${isClosingBrowser ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleCloseWorkflowBrowser}
          />

          {/* Panel */}
          <div className={`relative w-[480px] bg-white shadow-xl flex flex-col ${isClosingBrowser ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Open Workflow</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNewFolderInput(true)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  title="New folder"
                >
                  <FolderPlus className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCloseWorkflowBrowser}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => handleNavigateToBreadcrumb(-1)}
                  className={`hover:text-primary-600 ${folderPath.length === 0 ? 'font-medium text-slate-900' : 'text-slate-500'}`}
                >
                  All Workflows
                </button>
                {folderPath.map((folder, index) => (
                  <span key={folder.id} className="flex items-center gap-1">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    <button
                      onClick={() => handleNavigateToBreadcrumb(index)}
                      className={`hover:text-primary-600 ${index === folderPath.length - 1 ? 'font-medium text-slate-900' : 'text-slate-500'}`}
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
              </div>
              {folderPath.length > 0 && folderPath[folderPath.length - 1]?.group && (
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Users className="w-3 h-3" />
                  <span>Group: {folderPath[folderPath.length - 1].group?.name}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* New folder input */}
              {showNewFolderInput && (
                <div className="mb-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Folder className="w-5 h-5 text-amber-600" />
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') {
                        setShowNewFolderInput(false);
                        setNewFolderName('');
                      }
                    }}
                    placeholder="Folder name..."
                    className="flex-1 px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateFolder}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setShowNewFolderInput(false);
                      setNewFolderName('');
                    }}
                    className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loadingWorkflows ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
              ) : (folders.length === 0 && availableWorkflows.length === 0) ? (
                <div className="text-center py-12 text-slate-500">
                  {folderPath.length > 0 ? 'This folder is empty' : 'No workflows found'}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Drop zone for moving to parent/root */}
                  {folderPath.length > 0 && draggingWorkflowId && (
                    <div
                      onDragOver={(e) => handleDragOver(e, null)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, null)}
                      className={`p-3 border-2 border-dashed rounded-lg text-center text-sm transition-colors ${dragOverFolderId === null
                        ? 'border-primary-400 bg-primary-50 text-primary-600'
                        : 'border-slate-300 text-slate-500'
                        }`}
                    >
                      Drop here to move to parent folder
                    </div>
                  )}

                  {/* Folders */}
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, folder.id)}
                      className={`p-3 rounded-lg border transition-colors ${dragOverFolderId === folder.id
                        ? 'bg-primary-100 border-primary-400'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-200'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {editingFolderId === folder.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Folder className="w-5 h-5 text-amber-600" />
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameFolder(folder.id, editingFolderName);
                                if (e.key === 'Escape') {
                                  setEditingFolderId(null);
                                  setEditingFolderName('');
                                }
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameFolder(folder.id, editingFolderName)}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingFolderId(null);
                                setEditingFolderName('');
                              }}
                              className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleNavigateToFolder(folder)}
                              className="flex-1 flex items-center gap-2 text-left"
                            >
                              <Folder className="w-5 h-5 text-amber-600" />
                              <div>
                                <div className="font-medium text-slate-900">{folder.name}</div>
                                <div className="text-xs text-slate-500">
                                  {folder._count?.workflows || 0} workflows, {folder._count?.children || 0} folders
                                  {folder.group && (
                                    <span className="ml-2">
                                      <Users className="w-3 h-3 inline" /> {folder.group.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenPermissions(folder)}
                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                                title="Manage permissions"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingFolderId(folder.id);
                                  setEditingFolderName(folder.name);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                                title="Rename folder"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFolder(folder.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Workflows */}
                  {availableWorkflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, workflow.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        setShowWorkflowBrowser(false);
                        navigate(`/workflows/${workflow.id}`);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setWorkflowContextMenu({ x: e.clientX, y: e.clientY, workflow });
                      }}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${draggingWorkflowId === workflow.id
                        ? 'bg-primary-50 border-primary-300 opacity-50'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <GripVertical className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                          {/* Editable name */}
                          {editingWorkflowId === workflow.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingWorkflowName}
                                onChange={(e) => setEditingWorkflowName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleRenameWorkflow(workflow.id, editingWorkflowName);
                                  } else if (e.key === 'Escape') {
                                    setEditingWorkflowId(null);
                                    setEditingWorkflowName('');
                                  }
                                }}
                                className="flex-1 px-2 py-1 text-sm font-medium border border-primary-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleRenameWorkflow(workflow.id, editingWorkflowName)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingWorkflowId(null);
                                  setEditingWorkflowName('');
                                }}
                                className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-900 truncate block text-left">
                              {workflow.name}
                            </span>
                          )}

                          {workflow.description && (
                            <div className="text-sm text-slate-500 truncate mt-0.5">
                              {workflow.description}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                            {/* Owner */}
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>
                                {workflow.createdBy?.name || workflow.createdBy?.email || 'System'}
                              </span>
                            </div>

                            {/* Group */}
                            {workflow.group && (
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{workflow.group.name}</span>
                              </div>
                            )}

                            {/* Last updated */}
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(workflow.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <EnvironmentBadge environment={workflow.environment} />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorkflowId(workflow.id);
                              setEditingWorkflowName(workflow.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded"
                            title="Rename workflow"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              setEditingWorkflowId(null);
                              setPermissionsFolder(null); // Not a folder permissions modal

                              // Load versions for this workflow
                              setLoadingVersions(true);
                              setShowVersionHistory(true);
                              // Store ID temporarily or fetch directly within modal if we passed workflow prop?
                              // Better: fetch here and pass data or use a ref/state for target workflow
                              // Hack: Reuse editingWorkflowId or adding a new state for 'versionHistoryWorkflowId'
                              // Let's add that state variable? Or just fetch here and use a ref?
                              // We'll assume we can't easily add state in this deep nested click without causing re-renders effectively.
                              // Let's use `deletingWorkflow` equivalent: `versionHistoryWorkflow`
                              setVersionHistoryWorkflow(workflow);
                              try {
                                const list = await workflowsApi.getVersions(workflow.id);
                                setVersions(list);
                              } finally {
                                setLoadingVersions(false);
                              }
                            }}
                            className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white"
                            title="Version History"
                          >
                            <Clock size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingWorkflow(workflow);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => {
                  // Store the current folder ID so the new workflow is created in this folder
                  setNewWorkflowFolderId(currentFolderId);
                  setShowWorkflowBrowser(false);
                  navigate('/workflows/new');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create New Workflow{currentFolderId ? ` in ${folderPath[folderPath.length - 1]?.name || 'folder'}` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Browser Context Menu */}
      {workflowContextMenu && (
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
              setEditingWorkflowId(workflowContextMenu.workflow.id);
              setEditingWorkflowName(workflowContextMenu.workflow.name);
            }}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
          >
            <Pencil className="w-4 h-4" />
            Rename
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
      )}

      {/* Delete Confirmation Modal */}
      {deletingWorkflow && (
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
      )}

      {/* Folder Permissions Modal */}
      {showPermissionsModal && permissionsFolder && (
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
      )}

      {showPromotionModal && id && (
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
      )}
    </div>
  );
}
