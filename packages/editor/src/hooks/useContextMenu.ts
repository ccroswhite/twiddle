/**
 * useContextMenu Hook
 * 
 * Manages context menu state and event handling for right-click menus.
 * Handles:
 * - Opening the menu at cursor position
 * - Closing on click outside, Escape key, or scroll
 * - Providing a ref for the menu element
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface ContextMenuPosition {
    x: number;
    y: number;
}

export interface UseContextMenuReturn {
    /** Current menu position, or null if closed */
    contextMenu: ContextMenuPosition | null;
    /** Ref to attach to the menu container element */
    menuRef: React.RefObject<HTMLDivElement | null>;
    /** Handler for the contextmenu event (right-click) */
    handleContextMenu: (e: React.MouseEvent) => void;
    /** Close the context menu */
    closeMenu: () => void;
}

/**
 * Hook for managing context menu state.
 * 
 * @example
 * ```tsx
 * const { contextMenu, menuRef, handleContextMenu, closeMenu } = useContextMenu();
 * 
 * return (
 *   <div onContextMenu={handleContextMenu}>
 *     {contextMenu && (
 *       <div ref={menuRef} style={{ left: contextMenu.x, top: contextMenu.y }}>
 *         <button onClick={() => { doAction(); closeMenu(); }}>Action</button>
 *       </div>
 *     )}
 *   </div>
 * );
 * ```
 */
export function useContextMenu(): UseContextMenuReturn {
    const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    }, []);

    const closeMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    return {
        contextMenu,
        menuRef,
        handleContextMenu,
        closeMenu,
    };
}
