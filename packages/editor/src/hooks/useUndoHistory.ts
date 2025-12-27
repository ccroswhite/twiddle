import { useState, useRef, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

/**
 * Maximum number of undo history entries to keep
 */
const MAX_HISTORY = 50;

/**
 * Snapshot of workflow state for undo/redo
 */
interface HistorySnapshot {
    nodes: Node[];
    edges: Edge[];
}

/**
 * Return type for the useUndoHistory hook
 */
export interface UseUndoHistoryReturn {
    /** Save current state to history */
    saveToHistory: () => void;
    /** Undo the last action */
    handleUndo: () => void;
    /** Whether undo is available */
    canUndo: boolean;
    /** Flag to check if currently undoing (to skip saving during undo) */
    isUndoing: React.RefObject<boolean>;
}

/**
 * Custom hook for managing undo history in the workflow editor.
 * 
 * Tracks changes to nodes and edges and allows undoing to previous states.
 * 
 * @param nodes - Current ReactFlow nodes
 * @param edges - Current ReactFlow edges
 * @param setNodes - Setter for nodes state
 * @param setEdges - Setter for edges state
 * @param onRestoreNode - Optional callback to add properties back to restored nodes
 * @returns Undo history controls
 */
export function useUndoHistory(
    nodes: Node[],
    edges: Edge[],
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
    onRestoreNode?: (node: Node) => Node
): UseUndoHistoryReturn {
    // Undo history - stores snapshots of nodes and edges
    const [history, setHistory] = useState<HistorySnapshot[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoing = useRef(false);

    // Save current state to history
    const saveToHistory = useCallback(() => {
        if (isUndoing.current) return;

        setHistory(prev => {
            // Create a deep copy of current state
            const snapshot: HistorySnapshot = {
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
            // Restore nodes, optionally applying a transform (e.g., to restore callbacks)
            const restoredNodes = onRestoreNode
                ? prevState.nodes.map(onRestoreNode)
                : prevState.nodes;

            setNodes(restoredNodes);
            setEdges(prevState.edges);
            setHistoryIndex(prevIndex);
        }

        // Reset flag after state update
        setTimeout(() => {
            isUndoing.current = false;
        }, 0);
    }, [history, historyIndex, setNodes, setEdges, onRestoreNode]);

    return {
        saveToHistory,
        handleUndo,
        canUndo: historyIndex > 0 && history.length > 0,
        isUndoing,
    };
}
