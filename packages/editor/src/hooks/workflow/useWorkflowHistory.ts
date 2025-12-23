/**
 * Custom hook for managing workflow undo/redo history
 */

import { useState, useRef, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { MAX_HISTORY } from '@/utils/constants';

export function useWorkflowHistory() {
    const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const isUndoing = useRef(false);

    /**
     * Save current state to history
     */
    const saveToHistory = useCallback((nodes: Node[], edges: Edge[]) => {
        if (isUndoing.current) return;

        setHistory((prev) => {
            // Create a deep copy of current state
            const snapshot = {
                nodes: JSON.parse(JSON.stringify(nodes)),
                edges: JSON.parse(JSON.stringify(edges)),
            };

            // If we're not at the end of history, discard future states
            const newHistory = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : prev;
            newHistory.push(snapshot);

            // Keep only the last MAX_HISTORY items
            if (newHistory.length > MAX_HISTORY) {
                return newHistory.slice(newHistory.length - MAX_HISTORY);
            }

            return newHistory;
        });

        setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    }, [historyIndex]);

    /**
     * Undo to previous state
     */
    const undo = useCallback((
        currentNodes: Node[],
        currentEdges: Edge[],
        setNodes: (nodes: Node[]) => void,
        setEdges: (edges: Edge[]) => void
    ) => {
        if (historyIndex < 0) return;

        isUndoing.current = true;

        // If this is the first undo, save current state
        if (historyIndex === history.length - 1) {
            const snapshot = {
                nodes: JSON.parse(JSON.stringify(currentNodes)),
                edges: JSON.parse(JSON.stringify(currentEdges)),
            };
            setHistory((prev) => [...prev, snapshot]);
        }

        const previousState = history[historyIndex];
        if (previousState) {
            setNodes(JSON.parse(JSON.stringify(previousState.nodes)));
            setEdges(JSON.parse(JSON.stringify(previousState.edges)));
            setHistoryIndex((prev) => prev - 1);
        }

        setTimeout(() => {
            isUndoing.current = false;
        }, 100);
    }, [history, historyIndex]);

    /**
     * Check if undo is available
     */
    const canUndo = historyIndex >= 0;

    return {
        saveToHistory,
        undo,
        canUndo,
        historyIndex,
    };
}
