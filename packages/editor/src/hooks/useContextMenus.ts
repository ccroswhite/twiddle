import { useState, useEffect, useRef, useCallback } from 'react';
import type { Edge, Node } from '@xyflow/react';

/**
 * Context menu position
 */
interface MenuPosition {
    x: number;
    y: number;
}

/**
 * Workflow context menu state - uses generic to support any workflow-like object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface WorkflowMenu extends MenuPosition {
    workflow: any;
}

/**
 * Return type for useContextMenus hook
 */
export interface UseContextMenusReturn {
    // Selection context menu (for selected nodes/edges)
    selectionContextMenu: MenuPosition | null;
    setSelectionContextMenu: React.Dispatch<React.SetStateAction<MenuPosition | null>>;
    selectionContextMenuRef: React.RefObject<HTMLDivElement | null>;
    handleSelectionContextMenu: (event: React.MouseEvent, nodes: Node[]) => void;
    handleEdgeContextMenu: (event: React.MouseEvent, edge: Edge, setEdges: (fn: (edges: Edge[]) => Edge[]) => void) => void;

    // Pane context menu (for right-click on canvas when read-only)
    paneContextMenu: MenuPosition | null;
    setPaneContextMenu: React.Dispatch<React.SetStateAction<MenuPosition | null>>;
    paneContextMenuRef: React.RefObject<HTMLDivElement | null>;
    handlePaneContextMenu: (event: React.MouseEvent | MouseEvent, isReadOnly: boolean) => void;

    // Workflow context menu (for workflow browser items)
    workflowContextMenu: WorkflowMenu | null;
    setWorkflowContextMenu: React.Dispatch<React.SetStateAction<WorkflowMenu | null>>;
    workflowContextMenuRef: React.RefObject<HTMLDivElement | null>;

    // Close all menus
    closeAllMenus: () => void;
}

/**
 * Custom hook for managing context menus in the workflow editor.
 * 
 * Handles:
 * - Selection context menu (right-click on selected nodes/edges)
 * - Pane context menu (right-click on canvas in read-only mode)
 * - Workflow context menu (right-click on workflow browser items)
 * - Click-outside to close menus
 */
export function useContextMenus(): UseContextMenusReturn {
    // Selection context menu state
    const [selectionContextMenu, setSelectionContextMenu] = useState<MenuPosition | null>(null);
    const selectionContextMenuRef = useRef<HTMLDivElement | null>(null);

    // Pane context menu state
    const [paneContextMenu, setPaneContextMenu] = useState<MenuPosition | null>(null);
    const paneContextMenuRef = useRef<HTMLDivElement | null>(null);

    // Workflow context menu state
    const [workflowContextMenu, setWorkflowContextMenu] = useState<WorkflowMenu | null>(null);
    const workflowContextMenuRef = useRef<HTMLDivElement | null>(null);

    // Close context menus when clicking outside
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

    // Handle right-click on selected nodes
    const handleSelectionContextMenu = useCallback((event: React.MouseEvent, nodes: Node[]) => {
        const selectedNodes = nodes.filter((node: Node) => node.selected);
        if (selectedNodes.length > 0) {
            event.preventDefault();
            setSelectionContextMenu({ x: event.clientX, y: event.clientY });
        }
    }, []);

    // Handle right-click on edges
    const handleEdgeContextMenu = useCallback((
        event: React.MouseEvent,
        edge: Edge,
        setEdges: (fn: (edges: Edge[]) => Edge[]) => void
    ) => {
        event.preventDefault();
        // Select the edge
        setEdges((eds: Edge[]) => eds.map((e: Edge) => e.id === edge.id ? { ...e, selected: true } : e));
        setSelectionContextMenu({ x: event.clientX, y: event.clientY });
    }, []);

    // Handle right-click on pane (canvas)
    const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent, isReadOnly: boolean) => {
        if (isReadOnly) {
            event.preventDefault();
            setPaneContextMenu({ x: event.clientX, y: event.clientY });
        }
    }, []);

    // Close all context menus
    const closeAllMenus = useCallback(() => {
        setSelectionContextMenu(null);
        setPaneContextMenu(null);
        setWorkflowContextMenu(null);
    }, []);

    return {
        // Selection context menu
        selectionContextMenu,
        setSelectionContextMenu,
        selectionContextMenuRef,
        handleSelectionContextMenu,
        handleEdgeContextMenu,

        // Pane context menu
        paneContextMenu,
        setPaneContextMenu,
        paneContextMenuRef,
        handlePaneContextMenu,

        // Workflow context menu
        workflowContextMenu,
        setWorkflowContextMenu,
        workflowContextMenuRef,

        // Utility
        closeAllMenus,
    };
}
