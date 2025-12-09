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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Plus, Download, Code, X, Github, ChevronRight, FolderOpen, User, Users, Clock, Trash2, Pencil, Check, Folder, FolderPlus, Shield, GripVertical, Undo2 } from 'lucide-react';
import { workflowsApi, nodesApi, githubApi, credentialsApi, foldersApi, groupsApi, usersApi, type Workflow, type Folder as FolderType, type FolderPermission, type FolderPermissionLevel } from '@/lib/api';
import { WorkflowNode } from '@/components/WorkflowNode';
import { NodePanel } from '@/components/NodePanel';
import { NodePropertiesPanel } from '@/components/NodePropertiesPanel';
import { GitHubSettings } from '@/components/GitHubSettings';
import { EnvironmentBadge, getNextEnvironment, type Environment } from '@/components/EnvironmentBadge';


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
  const [pythonCode, setPythonCode] = useState<{ workflow: string; activities: string; worker: string } | null>(null);
  const [availableNodes, setAvailableNodes] = useState<NodeTypeInfo[]>([]);
  const [environment, setEnvironment] = useState<Environment>('DV');
  const [promoting, setPromoting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showWorkflowBrowser, setShowWorkflowBrowser] = useState(false);
  const [isClosingBrowser, setIsClosingBrowser] = useState(false);
  const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);
  const [editingWorkflowName, setEditingWorkflowName] = useState('');
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);
  
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
  const [permissionsFolder, setPermissionsFolder] = useState<FolderType | null>(null);
  const [folderPermissions, setFolderPermissions] = useState<FolderPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ id: string; email: string; name?: string }[]>([]);
  const [availableGroups, setAvailableGroups] = useState<{ id: string; name: string }[]>([]);
  const [newPermissionType, setNewPermissionType] = useState<'user' | 'group'>('user');
  const [newPermissionTargetId, setNewPermissionTargetId] = useState('');
  const [newPermissionLevel, setNewPermissionLevel] = useState<FolderPermissionLevel>('READ');

  // Undo history - stores snapshots of nodes and edges
  const MAX_HISTORY = 30;
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoing = useRef(false);

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
        category: 'Credentials',
      }));
      
      setAvailableNodes([...(nodeTypes as NodeTypeInfo[]), ...credentialNodes]);
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
        pythonWorker?: string;
        environment?: Environment;
      };
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || '');
      setEnvironment(workflow.environment || 'DV');
      
      // Load Python code if available
      if (workflow.pythonWorkflow) {
        setPythonCode({
          workflow: workflow.pythonWorkflow,
          activities: workflow.pythonActivities || '',
          worker: workflow.pythonWorker || '',
        });
      }

      // Convert workflow nodes to React Flow nodes
      const flowNodes: Node[] = (workflow.nodes as Array<{
        id: string;
        name: string;
        type: string;
        position: { x: number; y: number };
        parameters: Record<string, unknown>;
      }>).map((node) => ({
        id: node.id,
        type: 'workflowNode',
        position: node.position,
        data: {
          label: node.name,
          nodeType: node.type,
          parameters: node.parameters,
          onOpenProperties: handleOpenProperties,
        },
      }));

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

  function addNode(nodeType: NodeTypeInfo) {
    // Calculate position at the center of the current viewport
    let position = { x: 250, y: 100 };
    
    if (reactFlowInstance.current) {
      const { getViewport } = reactFlowInstance.current;
      const viewport = getViewport();
      
      // Get the center of the visible area in flow coordinates
      // The viewport contains x, y (pan offset) and zoom level
      // We need to find the center of the visible canvas
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
    
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'workflowNode',
      position,
      data: {
        label: nodeType.displayName,
        nodeType: nodeType.type,
        parameters: {},
        onOpenProperties: handleOpenProperties,
      },
    };
    setNodes((nds: Node[]) => [...nds, newNode]);
    setShowNodePanel(false);
    // Don't auto-open properties panel - user can right-click to open
  }

  async function handleSave() {
    try {
      setSaving(true);

      // Convert React Flow nodes back to workflow format
      const workflowNodes = nodes.map((node: Node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
      }));

      // Convert React Flow edges back to workflow connections
      // Preserve null handle IDs - don't convert to 'main' as React Flow uses null for default handles
      const workflowConnections = edges.map((edge: Edge) => ({
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

    // Warn about production promotion
    if (nextEnv === 'PD') {
      if (!confirm('Promoting to Production requires administrator privileges. Continue?')) {
        return;
      }
    } else {
      if (!confirm(`Promote workflow from ${environment} to ${nextEnv}?`)) {
        return;
      }
    }

    try {
      setPromoting(true);
      const updated = await workflowsApi.promote(id, nextEnv as 'UT' | 'LT' | 'PD');
      setEnvironment((updated as unknown as { environment: Environment }).environment);
      alert(`Workflow promoted to ${nextEnv}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPromoting(false);
    }
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
                  disabled={promoting}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-50"
                  title={`Promote to ${getNextEnvironment(environment)}`}
                >
                  <ChevronRight className="w-3 h-3" />
                  {promoting ? 'Promoting...' : `Promote to ${getNextEnvironment(environment)}`}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Undo (${historyIndex} actions in history)`}
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
            className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Node
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
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
              githubConnected
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
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodesDelete={onNodesDelete}
          onInit={(instance) => { reactFlowInstance.current = instance; }}
          nodeTypes={nodeTypes}
          deleteKeyCode={['Backspace', 'Delete']}
          snapToGrid={true}
          snapGrid={[20, 20]}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={[20, 20]} size={1} offset={[0, 0]} />
        </ReactFlow>
      </div>

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
              <div>
                <h3 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  worker.py
                </h3>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{pythonCode.worker}</code>
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
                      className={`p-3 border-2 border-dashed rounded-lg text-center text-sm transition-colors ${
                        dragOverFolderId === null
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
                      className={`p-3 rounded-lg border transition-colors ${
                        dragOverFolderId === folder.id
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
                      className={`p-4 rounded-lg border transition-colors cursor-grab active:cursor-grabbing ${
                        draggingWorkflowId === workflow.id
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
                            <button
                              onClick={() => {
                                setShowWorkflowBrowser(false);
                                navigate(`/workflows/${workflow.id}`);
                              }}
                              className="font-medium text-slate-900 hover:text-primary-600 truncate block text-left"
                            >
                              {workflow.name}
                            </button>
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
    </div>
  );
}
